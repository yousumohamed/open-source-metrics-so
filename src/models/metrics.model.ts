import { z } from "zod";

export const RepositoryMetricsSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  stars: z.number().nonnegative(),
  forks: z.number().nonnegative(),
  openIssues: z.number().nonnegative(),
  closedIssues: z.number().nonnegative(),
  mergedPRs: z.number().nonnegative(),
  totalCommits: z.number().nonnegative(),
  velocityScore: z.number().nonnegative(),
  calculatedAt: z.string().datetime(),
});

export type RepositoryMetrics = z.infer<typeof RepositoryMetricsSchema>;

export const ContributionDetailsSchema = z.object({
  commits: z.number().nonnegative(),
  prsMerged: z.number().nonnegative(),
  issuesClosed: z.number().nonnegative(),
  starsContributed: z.number().nonnegative(),
});

export type ContributionDetails = z.infer<typeof ContributionDetailsSchema>;
