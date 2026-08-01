import * as dotenv from "dotenv";
dotenv.config();

export const GITHUB_API_URL = "https://api.github.com";
export const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export const DEFAULT_CACHE_TTL = 3600; // 1 hour in seconds
export const DEFAULT_CACHE_CHECK_PERIOD = 600; // 10 minutes in seconds

export const SCORING_WEIGHTS = {
  COMMITS: 1.5,
  PRS_MERGED: 3.0,
  ISSUES_CLOSED: 2.0,
  STARS: 0.5,
};

export const RATE_LIMIT = {
  MAX_REQUESTS: 100, // Maximum tokens/requests in bucket
  REFILL_RATE: 10,  // Tokens refilled per minute
};
