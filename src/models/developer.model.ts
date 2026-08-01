import { z } from "zod";
import { ContributionDetailsSchema } from "./metrics.model";

export const DeveloperProfileSchema = z.object({
  username: z.string().min(1),
  name: z.string().nullable().optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().nullable().optional(),
  publicRepos: z.number().nonnegative().optional(),
  followers: z.number().nonnegative().optional(),
  createdAt: z.string().optional(),
});

export type DeveloperProfile = z.infer<typeof DeveloperProfileSchema>;

export const DeveloperActivityMetricsSchema = z.object({
  profile: DeveloperProfileSchema,
  contributions: ContributionDetailsSchema,
  activityScore: z.number().nonnegative(),
  rankCategory: z.enum(["ELITE", "PRO", "ACTIVE", "EMERGING"]),
  lastUpdatedAt: z.string().datetime(),
});

export type DeveloperActivityMetrics = z.infer<typeof DeveloperActivityMetricsSchema>;
