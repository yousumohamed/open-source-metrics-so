import { RATE_LIMIT } from "../config/constants";
import { Logger } from "./logger";

export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxRequests: number;
  private readonly refillRate: number; // tokens per minute

  constructor(maxRequests = RATE_LIMIT.MAX_REQUESTS, refillRate = RATE_LIMIT.REFILL_RATE) {
    this.maxRequests = maxRequests;
    this.refillRate = refillRate;
    this.tokens = maxRequests;
    this.lastRefill = Date.now();
  }

  /**
   * Refills the token bucket based on elapsed time.
   */
  private refill(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    const elapsedMinutes = elapsedMs / 60000;

    if (elapsedMinutes > 0) {
      const tokensToAdd = elapsedMinutes * this.refillRate;
      this.tokens = Math.min(this.maxRequests, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Attempts to consume one token. Returns true if successful, false otherwise.
   */
  public tryConsume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    Logger.warn("Rate limit bucket exhausted, request throttled.");
    return false;
  }

  /**
   * Gets current token count.
   */
  public getTokens(): number {
    this.refill();
    return this.tokens;
  }
}

export const defaultRateLimiter = new TokenBucketRateLimiter();
