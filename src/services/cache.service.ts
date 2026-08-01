import NodeCache from "node-cache";
import { DEFAULT_CACHE_TTL, DEFAULT_CACHE_CHECK_PERIOD } from "../config/constants";
import { Logger } from "../utils/logger";

export class CacheService {
  private cache: NodeCache;

  constructor(ttl = DEFAULT_CACHE_TTL, checkPeriod = DEFAULT_CACHE_CHECK_PERIOD) {
    this.cache = new NodeCache({
      stdTTL: ttl,
      checkperiod: checkPeriod,
      useClones: true,
    });
    Logger.info("CacheService initialized", { ttl, checkPeriod });
  }

  /**
   * Retrieves a value from the cache.
   */
  public get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      Logger.debug(`Cache hit for key: ${key}`);
    } else {
      Logger.debug(`Cache miss for key: ${key}`);
    }
    return value;
  }

  /**
   * Stores a value in the cache with an optional TTL.
   */
  public set<T>(key: string, value: T, ttl?: number): boolean {
    Logger.debug(`Setting cache key: ${key}`, { ttl });
    if (ttl !== undefined) {
      return this.cache.set(key, value, ttl);
    }
    return this.cache.set(key, value);
  }

  /**
   * Deletes a value from the cache.
   */
  public delete(key: string): number {
    Logger.debug(`Deleting cache key: ${key}`);
    return this.cache.del(key);
  }

  /**
   * Clears the entire cache.
   */
  public clear(): void {
    Logger.info("Clearing entire cache");
    this.cache.flushAll();
  }

  /**
   * Returns cache statistics.
   */
  public getStats(): NodeCache.Stats {
    return this.cache.getStats();
  }
}

export const defaultCacheService = new CacheService();
