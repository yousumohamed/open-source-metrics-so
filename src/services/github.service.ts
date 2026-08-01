import axios, { AxiosInstance } from "axios";
import { GITHUB_API_URL, GITHUB_GRAPHQL_URL } from "../config/constants";
import { DeveloperProfile, DeveloperProfileSchema, DeveloperActivityMetrics } from "../models/developer.model";
import { RepositoryMetrics, ContributionDetails, ContributionDetailsSchema, RepositoryMetricsSchema } from "../models/metrics.model";
import { CacheService, defaultCacheService } from "./cache.service";
import { CalculatorService } from "./calculator.service";
import { TokenBucketRateLimiter, defaultRateLimiter } from "../utils/rate-limiter";
import { Logger } from "../utils/logger";

export interface GitHubServiceConfig {
  token?: string;
  cacheService?: CacheService;
  rateLimiter?: TokenBucketRateLimiter;
}

export class GitHubService {
  private client: AxiosInstance;
  private cache: CacheService;
  private rateLimiter: TokenBucketRateLimiter;
  private hasToken: boolean;

  constructor(config: GitHubServiceConfig = {}) {
    this.cache = config.cacheService || defaultCacheService;
    this.rateLimiter = config.rateLimiter || defaultRateLimiter;
    const token = config.token !== undefined ? config.token : process.env.GITHUB_TOKEN;
    this.hasToken = !!token;

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };

    if (token) {
      headers.Authorization = `token ${token}`;
    }

    this.client = axios.create({
      baseURL: GITHUB_API_URL,
      headers,
      timeout: 15000,
    });

    Logger.info("GitHubService initialized", { hasToken: this.hasToken });
  }

  /**
   * Helper to execute API operations while respecting rate limits.
   */
  private async executeWithRateLimit<T>(apiCall: () => Promise<T>): Promise<T> {
    if (!this.rateLimiter.tryConsume()) {
      throw new Error("Local Rate Limit exceeded. Request throttled.");
    }
    return await apiCall();
  }

  /**
   * Fetches a developer profile from the REST API.
   */
  public async fetchDeveloperProfile(username: string): Promise<DeveloperProfile> {
    const cacheKey = `profile:${username}`;
    const cachedProfile = this.cache.get<DeveloperProfile>(cacheKey);
    if (cachedProfile) {
      return cachedProfile;
    }

    Logger.info(`Fetching developer profile for: ${username}`);
    return this.executeWithRateLimit(async () => {
      try {
        const response = await this.client.get(`/users/${username}`);
        const parsedProfile = DeveloperProfileSchema.parse({
          username: response.data.login,
          name: response.data.name,
          avatarUrl: response.data.avatar_url,
          bio: response.data.bio,
          publicRepos: response.data.public_repos,
          followers: response.data.followers,
          createdAt: response.data.created_at,
        });

        this.cache.set(cacheKey, parsedProfile);
        return parsedProfile;
      } catch (error) {
        Logger.error(`Failed to fetch developer profile for ${username}`, error);
        throw error;
      }
    });
  }

  /**
   * Fetches contribution details for a developer via the REST API (Events & Repos)
   * if GITHUB_TOKEN is not a full-access token, or acts as fallback.
   */
  public async fetchDeveloperContributions(username: string): Promise<ContributionDetails> {
    const cacheKey = `contributions:${username}`;
    const cached = this.cache.get<ContributionDetails>(cacheKey);
    if (cached) {
      return cached;
    }

    Logger.info(`Fetching developer contributions for: ${username}`);
    return this.executeWithRateLimit(async () => {
      try {
        // Fallback REST approach: compile basic stats from public events or user data.
        // For a comprehensive metrics engine, we fetch the events stream.
        const eventsResponse = await this.client.get(`/users/${username}/events/public`, {
          params: { per_page: 100 },
        });

        let commits = 0;
        let prsMerged = 0;
        let issuesClosed = 0;
        let starsContributed = 0;

        const events = eventsResponse.data;
        if (Array.isArray(events)) {
          for (const event of events) {
            if (event.type === "PushEvent" && event.payload?.size) {
              commits += event.payload.size;
            } else if (event.type === "PullRequestEvent" && event.payload?.action === "closed" && event.payload?.pull_request?.merged) {
              prsMerged += 1;
            } else if (event.type === "IssuesEvent" && event.payload?.action === "closed") {
              issuesClosed += 1;
            } else if (event.type === "WatchEvent" && event.payload?.action === "started") {
              starsContributed += 1;
            }
          }
        }

        const contributions = ContributionDetailsSchema.parse({
          commits,
          prsMerged,
          issuesClosed,
          starsContributed,
        });

        this.cache.set(cacheKey, contributions);
        return contributions;
      } catch (error) {
        Logger.error(`Failed to fetch contributions for ${username}`, error);
        throw error;
      }
    });
  }

  /**
   * Fetches developer metrics by combining profile and contributions.
   */
  public async getDeveloperActivityMetrics(username: string): Promise<DeveloperActivityMetrics> {
    const profile = await this.fetchDeveloperProfile(username);
    const contributions = await this.fetchDeveloperContributions(username);
    return CalculatorService.computeDeveloperMetrics(profile, contributions);
  }

  /**
   * Fetches contribution metrics for a user using the GitHub GraphQL API.
   * Requires a valid GITHUB_TOKEN.
   */
  public async fetchDeveloperContributionsGraphQL(username: string): Promise<ContributionDetails> {
    if (!this.hasToken) {
      throw new Error("GraphQL operations require a valid GITHUB_TOKEN.");
    }

    const cacheKey = `contributions:graphql:${username}`;
    const cached = this.cache.get<ContributionDetails>(cacheKey);
    if (cached) {
      return cached;
    }

    Logger.info(`Fetching developer contributions via GraphQL for: ${username}`);

    const query = `
      query($username: String!) {
        user(login: $username) {
          contributionsCollection {
            totalCommitContributions
            totalPullRequestContributions
            totalIssueContributions
          }
          starredRepositories {
            totalCount
          }
        }
      }
    `;

    return this.executeWithRateLimit(async () => {
      try {
        const response = await axios.post(
          GITHUB_GRAPHQL_URL,
          { query, variables: { username } },
          {
            headers: {
              Authorization: this.client.defaults.headers.Authorization,
              Accept: "application/json",
            },
            timeout: 15000,
          }
        );

        if (response.data.errors) {
          throw new Error(`GraphQL Errors: ${JSON.stringify(response.data.errors)}`);
        }

        const user = response.data?.data?.user;
        if (!user) {
          throw new Error(`User not found in GraphQL response: ${username}`);
        }

        const coll = user.contributionsCollection;
        const contributions = ContributionDetailsSchema.parse({
          commits: coll.totalCommitContributions || 0,
          prsMerged: coll.totalPullRequestContributions || 0,
          issuesClosed: coll.totalIssueContributions || 0,
          starsContributed: user.starredRepositories?.totalCount || 0,
        });

        this.cache.set(cacheKey, contributions);
        return contributions;
      } catch (error) {
        Logger.error(`Failed GraphQL fetch for ${username}`, error);
        throw error;
      }
    });
  }

  /**
   * Fetches repository details and calculates velocity metrics.
   */
  public async getRepositoryMetrics(owner: string, name: string): Promise<RepositoryMetrics> {
    const cacheKey = `repo:${owner}:${name}`;
    const cached = this.cache.get<RepositoryMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    Logger.info(`Fetching repository metrics for: ${owner}/${name}`);
    return this.executeWithRateLimit(async () => {
      try {
        // Parallel requests using REST API
        const [repoRes, pullsRes, issuesRes, commitsRes] = await Promise.all([
          this.client.get(`/repos/${owner}/${name}`),
          this.client.get(`/repos/${owner}/${name}/pulls`, { params: { state: "closed", per_page: 100 } }),
          this.client.get(`/repos/${owner}/${name}/issues`, { params: { state: "closed", per_page: 100 } }),
          this.client.get(`/repos/${owner}/${name}/commits`, { params: { per_page: 100 } }).catch(() => ({ data: [] })),
        ]);

        const repoData = repoRes.data;
        const stars = repoData.stargazers_count || 0;
        const forks = repoData.forks_count || 0;
        const openIssues = repoData.open_issues_count || 0;

        // Calculate merged PRs
        const closedPRs = pullsRes.data || [];
        const mergedPRs = Array.isArray(closedPRs)
          ? closedPRs.filter((pr: any) => pr.merged_at).length
          : 0;

        // Calculate closed issues (excluding pull requests since Github REST merges issues and PRs in the same endpoint)
        const closedIssuesAndPRs = issuesRes.data || [];
        const closedIssues = Array.isArray(closedIssuesAndPRs)
          ? closedIssuesAndPRs.filter((issue: any) => !issue.pull_request).length
          : 0;

        const totalCommits = Array.isArray(commitsRes.data) ? commitsRes.data.length : 0;

        const calculatedMetrics = CalculatorService.computeRepositoryMetrics(
          owner,
          name,
          stars,
          forks,
          openIssues,
          closedIssues,
          mergedPRs,
          totalCommits
        );

        const validated = RepositoryMetricsSchema.parse(calculatedMetrics);
        this.cache.set(cacheKey, validated);
        return validated;
      } catch (error) {
        Logger.error(`Failed to fetch repo metrics for ${owner}/${name}`, error);
        throw error;
      }
    });
  }
}
