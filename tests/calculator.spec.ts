import { CalculatorService } from "../src/services/calculator.service";
import { DeveloperProfile } from "../src/models/developer.model";
import { ContributionDetails } from "../src/models/metrics.model";

describe("CalculatorService", () => {
  describe("calculateScore", () => {
    it("should calculate exact score based on the standardized formula", () => {
      // Formula: Score = (Commits * 1.5) + (PRs_Merged * 3.0) + (Issues_Closed * 2.0) + (Stars * 0.5)
      const score = CalculatorService.calculateScore(10, 5, 3, 20);
      const expected = (10 * 1.5) + (5 * 3.0) + (3 * 2.0) + (20 * 0.5); // 15 + 15 + 6 + 10 = 46
      expect(score).toBe(expected);
    });

    it("should handle edge cases with zero inputs", () => {
      const score = CalculatorService.calculateScore(0, 0, 0, 0);
      expect(score).toBe(0);
    });

    it("should handle very large values accurately", () => {
      const score = CalculatorService.calculateScore(1000000, 500000, 200000, 1000000);
      const expected = (1000000 * 1.5) + (500000 * 3.0) + (200000 * 2.0) + (1000000 * 0.5);
      expect(score).toBe(expected);
    });
  });

  describe("determineRank", () => {
    it("should return ELITE for score >= 500", () => {
      expect(CalculatorService.determineRank(500)).toBe("ELITE");
      expect(CalculatorService.determineRank(1000)).toBe("ELITE");
    });

    it("should return PRO for 150 <= score < 500", () => {
      expect(CalculatorService.determineRank(150)).toBe("PRO");
      expect(CalculatorService.determineRank(499.9)).toBe("PRO");
    });

    it("should return ACTIVE for 50 <= score < 150", () => {
      expect(CalculatorService.determineRank(50)).toBe("ACTIVE");
      expect(CalculatorService.determineRank(149.9)).toBe("ACTIVE");
    });

    it("should return EMERGING for score < 50", () => {
      expect(CalculatorService.determineRank(0)).toBe("EMERGING");
      expect(CalculatorService.determineRank(49.9)).toBe("EMERGING");
    });
  });

  describe("computeDeveloperMetrics", () => {
    it("should map profile and contributions to compile DeveloperActivityMetrics", () => {
      const profile: DeveloperProfile = {
        username: "testuser",
        name: "Test User",
        avatarUrl: "https://example.com/avatar.png",
        bio: "Code is life",
        publicRepos: 15,
        followers: 120,
        createdAt: "2020-01-01T00:00:00Z",
      };

      const contributions: ContributionDetails = {
        commits: 100,
        prsMerged: 20,
        issuesClosed: 15,
        starsContributed: 50,
      };

      const metrics = CalculatorService.computeDeveloperMetrics(profile, contributions);

      expect(metrics.profile).toEqual(profile);
      expect(metrics.contributions).toEqual(contributions);
      expect(metrics.activityScore).toBe(265); // 100*1.5 + 20*3 + 15*2 + 50*0.5 = 150 + 60 + 30 + 25 = 265
      expect(metrics.rankCategory).toBe("PRO");
      expect(metrics.lastUpdatedAt).toBeDefined();
    });
  });

  describe("computeRepositoryMetrics", () => {
    it("should map params to compile RepositoryMetrics", () => {
      const metrics = CalculatorService.computeRepositoryMetrics(
        "somali-devs",
        "open-source-so",
        150, // stars
        45,  // forks
        10,  // openIssues
        30,  // closedIssues
        25,  // mergedPRs
        120  // totalCommits
      );

      expect(metrics.owner).toBe("somali-devs");
      expect(metrics.name).toBe("open-source-so");
      expect(metrics.stars).toBe(150);
      expect(metrics.forks).toBe(45);
      expect(metrics.openIssues).toBe(10);
      expect(metrics.closedIssues).toBe(30);
      expect(metrics.mergedPRs).toBe(25);
      expect(metrics.totalCommits).toBe(120);
      expect(metrics.velocityScore).toBe(390); // 120*1.5 + 25*3 + 30*2 + 150*0.5 = 180 + 75 + 60 + 75 = 390
      expect(metrics.calculatedAt).toBeDefined();
    });
  });
});
