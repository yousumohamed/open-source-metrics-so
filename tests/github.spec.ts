import axios from "axios";
import { GitHubService } from "../src/services/github.service";
import { CacheService } from "../src/services/cache.service";
import { TokenBucketRateLimiter } from "../src/utils/rate-limiter";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("GitHubService", () => {
  let cacheService: CacheService;
  let rateLimiter: TokenBucketRateLimiter;
  let service: GitHubService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new CacheService(60, 60);
    rateLimiter = new TokenBucketRateLimiter(10, 10);
    service = new GitHubService({
      token: "mock-token",
      cacheService,
      rateLimiter,
    });
  });

  describe("fetchDeveloperProfile", () => {
    it("should fetch, parse and cache profile correctly", async () => {
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({
          data: {
            login: "octocat",
            name: "The Octocat",
            avatar_url: "https://github.com/images/error/octocat_happy.gif",
            bio: "there to help",
            public_repos: 2,
            followers: 20,
            created_at: "2011-01-25T18:14:19Z",
          },
        }),
        defaults: { headers: {} },
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const newService = new GitHubService({
        token: "mock-token",
        cacheService,
        rateLimiter,
      });

      const profile = await newService.fetchDeveloperProfile("octocat");

      expect(profile.username).toBe("octocat");
      expect(profile.name).toBe("The Octocat");
      expect(profile.publicRepos).toBe(2);

      // Verify profile is cached
      const cached = cacheService.get<any>("profile:octocat");
      expect(cached).toBeDefined();
      expect(cached.username).toBe("octocat");

      // Calling again should read from cache and not call HTTP API
      const cachedProfile = await newService.fetchDeveloperProfile("octocat");
      expect(cachedProfile.username).toBe("octocat");
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it("should propagate errors if Axios request fails", async () => {
      const mockAxiosInstance = {
        get: jest.fn().mockRejectedValue(new Error("API Error")),
        defaults: { headers: {} },
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const newService = new GitHubService({
        token: "mock-token",
        cacheService,
        rateLimiter,
      });

      await expect(newService.fetchDeveloperProfile("octocat")).rejects.toThrow("API Error");
    });
  });

  describe("fetchDeveloperContributions", () => {
    it("should calculate contributions correctly from public events REST endpoint", async () => {
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({
          data: [
            { type: "PushEvent", payload: { size: 5 } },
            { type: "PullRequestEvent", payload: { action: "closed", pull_request: { merged: true } } },
            { type: "IssuesEvent", payload: { action: "closed" } },
            { type: "WatchEvent", payload: { action: "started" } },
          ],
        }),
        defaults: { headers: {} },
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const newService = new GitHubService({
        token: "mock-token",
        cacheService,
        rateLimiter,
      });

      const contributions = await newService.fetchDeveloperContributions("octocat");

      expect(contributions.commits).toBe(5);
      expect(contributions.prsMerged).toBe(1);
      expect(contributions.issuesClosed).toBe(1);
      expect(contributions.starsContributed).toBe(1);
    });
  });

  describe("fetchDeveloperContributionsGraphQL", () => {
    it("should fetch from GraphQL endpoint and cache result", async () => {
      const mockResponse = {
        data: {
          data: {
            user: {
              contributionsCollection: {
                totalCommitContributions: 15,
                totalPullRequestContributions: 3,
                totalIssueContributions: 4,
              },
              starredRepositories: {
                totalCount: 12,
              },
            },
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const contributions = await service.fetchDeveloperContributionsGraphQL("octocat");

      expect(contributions.commits).toBe(15);
      expect(contributions.prsMerged).toBe(3);
      expect(contributions.issuesClosed).toBe(4);
      expect(contributions.starsContributed).toBe(12);
    });

    it("should throw error if there is no token", async () => {
      const tokenlessService = new GitHubService({
        token: "",
        cacheService,
        rateLimiter,
      });

      await expect(tokenlessService.fetchDeveloperContributionsGraphQL("octocat"))
        .rejects.toThrow("GraphQL operations require a valid GITHUB_TOKEN.");
    });
  });

  describe("getRepositoryMetrics", () => {
    it("should fetch repo info, issues, PRs, commits and output calculated metrics", async () => {
      const mockAxiosInstance = {
        get: jest.fn().mockImplementation((url: string) => {
          if (url.includes("/repos/owner/name/pulls")) {
            return Promise.resolve({
              data: [
                { merged_at: "2024-01-01T00:00:00Z" },
                { merged_at: null },
              ],
            });
          }
          if (url.includes("/repos/owner/name/issues")) {
            return Promise.resolve({
              data: [
                { pull_request: null }, // Valid issue closed
                { pull_request: {} },   // PR closed, should be skipped
              ],
            });
          }
          if (url.includes("/repos/owner/name/commits")) {
            return Promise.resolve({
              data: new Array(10).fill({}),
            });
          }
          if (url.includes("/repos/owner/name")) {
            return Promise.resolve({
              data: {
                stargazers_count: 50,
                forks_count: 10,
                open_issues_count: 5,
              },
            });
          }
          return Promise.reject(new Error("Unknown route"));
        }),
        defaults: { headers: {} },
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const newService = new GitHubService({
        token: "mock-token",
        cacheService,
        rateLimiter,
      });

      const metrics = await newService.getRepositoryMetrics("owner", "name");

      expect(metrics.stars).toBe(50);
      expect(metrics.forks).toBe(10);
      expect(metrics.openIssues).toBe(5);
      expect(metrics.closedIssues).toBe(1);
      expect(metrics.mergedPRs).toBe(1);
      expect(metrics.totalCommits).toBe(10);

      // Score calculation check:
      // Score = (10 * 1.5) + (1 * 3.0) + (1 * 2.0) + (50 * 0.5) = 15 + 3 + 2 + 25 = 45
      expect(metrics.velocityScore).toBe(45);
    });
  });

  describe("Rate limiting errors", () => {
    it("should throw error if rate limit token bucket is exhausted", async () => {
      const exhaustedRateLimiter = new TokenBucketRateLimiter(0, 0);
      const rateLimitedService = new GitHubService({
        token: "mock-token",
        cacheService,
        rateLimiter: exhaustedRateLimiter,
      });

      await expect(rateLimitedService.fetchDeveloperProfile("octocat"))
        .rejects.toThrow("Local Rate Limit exceeded. Request throttled.");
    });
  });
});
