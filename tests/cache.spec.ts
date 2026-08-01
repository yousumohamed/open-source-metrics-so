import { CacheService } from "../src/services/cache.service";

describe("CacheService and GitHubService Integration", () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService(60, 60);
  });

  it("should support caching and allow explicit deletion / clearing", () => {
    cacheService.set("key", "value");
    expect(cacheService.get("key")).toBe("value");

    cacheService.delete("key");
    expect(cacheService.get("key")).toBeUndefined();

    cacheService.set("key1", "val1");
    cacheService.set("key2", "val2");
    cacheService.clear();

    expect(cacheService.get("key1")).toBeUndefined();
    expect(cacheService.get("key2")).toBeUndefined();
  });
});
