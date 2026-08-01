# Complete Usage Guide: `open-source-metrics-so`

This guide walks you through the step-by-step setup, configuration, and utilization of the **open-source-metrics-so** backend library. It also details how to resolve the Git conflict currently showing in your Pull Request.

---

## 🛠️ Step 1: Resolve the Git Conflict (PR #30)

The conflict occurred because both branches modified `tests/github.spec.ts` in the exact same location:
- **Current Change (`Feature/open-source-metrics-so-...` / Our version):** Includes the robust isolation block that temporarily backs up and deletes `process.env.GITHUB_TOKEN` so the environment variables do not leak into tokenless tests.
- **Incoming Change (`feature-patch-1`):** Lacks the robust token backup and environment isolation block.

### How to resolve it:
In your GitHub PR conflict resolution screen (or locally in your editor):
1. **Choose "Accept Current Change"** (the block that begins with `const originalToken = process.env.GITHUB_TOKEN;` and uses `finally` to restore it).
2. Click **Mark as Resolved** on GitHub and commit the merge.
3. This is the **correct, robust fix** that resolves the test environment leak while keeping all 17 tests green.

---

## 🚀 Step 2: Running & Testing the Project

Ensure you are in the repository root folder (`~/code/open-source-metrics-so`):

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```bash
touch .env
```
Inside `.env`, add your personal GitHub Token:
```env
GITHUB_TOKEN=ghp_YourGitHubTokenHere
```

### 3. Run Linter
Verify code formatting and potential code issues:
```bash
npm run lint
```

### 4. Build/Compile the Code
Compile modern TypeScript 5.x files into the ready-to-use production build inside `/dist`:
```bash
npm run build
```

### 5. Run All Tests & Verify Coverage
Verify everything is working correctly and cleanly:
```bash
npm test
```

---

## 💡 Step 3: Library Usage Guide

The library exports everything you need for robust metric calculations. Here is how to incorporate it into your Node.js or Express.js backend project.

### 1. Initialize the GitHub Service
```typescript
import { GitHubService, CacheService } from "open-source-metrics-so";

// 1. Instantiate using the environment variable token automatically
const metricsService = new GitHubService();

// 2. OR instantiate using an explicit token, custom cache, and rate limiters
const customCache = new CacheService(1800, 300); // 30 mins TTL
const customService = new GitHubService({
  token: "ghp_yourPersonalAccessToken",
  cacheService: customCache,
});
```

### 2. Fetch Developer Velocity Metrics
```typescript
async function fetchDeveloperSummary() {
  try {
    // Collect profile info, calculate scores, and determine rank class (ELITE, PRO, etc.)
    const metrics = await metricsService.getDeveloperActivityMetrics("octocat");

    console.log(`Developer Score: ${metrics.activityScore}`);
    console.log(`Rank Level: ${metrics.rankCategory}`);
    console.log("Full Metrics Payload:", JSON.stringify(metrics, null, 2));
  } catch (err) {
    console.error("Error retrieving user analytics:", err);
  }
}
```

### 3. Fetch Repository Performance
```typescript
async function fetchRepoVelocity() {
  try {
    const repo = await metricsService.getRepositoryMetrics("somali-devs", "open-source-so");

    console.log(`Repository Stars: ${repo.stars}`);
    console.log(`Repository Open Issues: ${repo.openIssues}`);
    console.log(`Repository Closed Issues: ${repo.closedIssues}`);
    console.log(`Repository Commits: ${repo.totalCommits}`);
    console.log(`Velocity Score: ${repo.velocityScore}`);
  } catch (err) {
    console.error("Error retrieving repo analytics:", err);
  }
}
```
