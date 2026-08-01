import { SCORING_WEIGHTS } from "../config/constants";
import { ContributionDetails, RepositoryMetrics } from "../models/metrics.model";
import { DeveloperProfile, DeveloperActivityMetrics } from "../models/developer.model";
import { Logger } from "../utils/logger";

export class CalculatorService {
  /**
   * Calculates the activity or velocity score based on the standardized formula:
   * Score = (Commits * 1.5) + (PRs_Merged * 3.0) + (Issues_Closed * 2.0) + (Stars * 0.5)
   */
  public static calculateScore(
    commits: number,
    prsMerged: number,
    issuesClosed: number,
    stars: number
  ): number {
    const score =
      commits * SCORING_WEIGHTS.COMMITS +
      prsMerged * SCORING_WEIGHTS.PRS_MERGED +
      issuesClosed * SCORING_WEIGHTS.ISSUES_CLOSED +
      stars * SCORING_WEIGHTS.STARS;

    // Return score rounded to 2 decimal places
    return Math.round(score * 100) / 100;
  }

  /**
   * Derives rank category based on the calculated activity score.
   */
  public static determineRank(score: number): "ELITE" | "PRO" | "ACTIVE" | "EMERGING" {
    if (score >= 500) {
      return "ELITE";
    } else if (score >= 150) {
      return "PRO";
    } else if (score >= 50) {
      return "ACTIVE";
    } else {
      return "EMERGING";
    }
  }

  /**
   * Computes comprehensive DeveloperActivityMetrics.
   */
  public static computeDeveloperMetrics(
    profile: DeveloperProfile,
    contributions: ContributionDetails
  ): DeveloperActivityMetrics {
    Logger.info(`Computing developer metrics for user: ${profile.username}`);

    const activityScore = this.calculateScore(
      contributions.commits,
      contributions.prsMerged,
      contributions.issuesClosed,
      contributions.starsContributed
    );

    const rankCategory = this.determineRank(activityScore);

    return {
      profile,
      contributions,
      activityScore,
      rankCategory,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  /**
   * Computes comprehensive RepositoryMetrics.
   */
  public static computeRepositoryMetrics(
    owner: string,
    name: string,
    stars: number,
    forks: number,
    openIssues: number,
    closedIssues: number,
    mergedPRs: number,
    totalCommits: number
  ): RepositoryMetrics {
    Logger.info(`Computing repository velocity metrics for: ${owner}/${name}`);

    const velocityScore = this.calculateScore(
      totalCommits,
      mergedPRs,
      closedIssues,
      stars
    );

    return {
      owner,
      name,
      stars,
      forks,
      openIssues,
      closedIssues,
      mergedPRs,
      totalCommits,
      velocityScore,
      calculatedAt: new Date().toISOString(),
    };
  }
}
