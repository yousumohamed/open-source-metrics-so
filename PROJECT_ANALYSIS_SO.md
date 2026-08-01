# Falanqaynta Mashruuca `open-source-metrics-so`

## 1. Mashruucani muxuu yahay?

`open-source-metrics-so` waa **library Node.js/TypeScript ah** oo xog ka soo qaata GitHub, kadibna u beddela xogtaas metrics iyo score.

Waxa uu cabbiraa laba qaybood:

1. **Developer activity** — firfircoonida qof GitHub isticmaala.
2. **Repository velocity** — sida repo u firfircoon yahay.

Mashruucani ma laha website, mobile app, database, ama UI. Waxaa loogu talagalay in lagu dhex isticmaalo application kale, sida dashboard, leaderboard, ama analytics service.

## 2. Maxaa loo isticmaali karaa?

Waxaa loo adeegsan karaa:

- leaderboard developers ah;
- qiimeynta firfircoonida contributors;
- cabbiridda commits, pull requests, issues iyo stars;
- isbarbardhigga repositories;
- dashboard muujinaya Open Source activity;
- adeeg API kale oo ku shaqeeya GitHub metrics.

## 3. Sida uu u shaqeeyo

Socodka guud waa sidan:

```text
Username ama repository
          |
          v
GitHub REST / GraphQL API
          |
          v
Cache iyo local rate limiter
          |
          v
Zod validation
          |
          v
CalculatorService
          |
          v
Metrics, score iyo rank
```

Tusaale developer:

```text
octocat
  -> profile-ka GitHub
  -> events/contributions
  -> commits, PRs, issues, stars
  -> activityScore
  -> ELITE/PRO/ACTIVE/EMERGING
```

## 4. Score-ka la isticmaalo

Mashruucu wuxuu adeegsadaa formula-kan:

```text
Score = (commits × 1.5)
      + (merged PRs × 3.0)
      + (closed issues × 2.0)
      + (stars × 0.5)
```

Tusaale:

```text
commits = 100
PRs = 20
issues = 15
stars = 50

Score = 100×1.5 + 20×3 + 15×2 + 50×0.5
      = 150 + 60 + 30 + 25
      = 265
```

Rank-yada:

| Score | Rank |
|---:|---|
| 500 ama ka badan | `ELITE` |
| 150 ilaa ka yar 500 | `PRO` |
| 50 ilaa ka yar 150 | `ACTIVE` |
| ka yar 50 | `EMERGING` |

## 5. Qaab-dhismeedka faylasha

```text
src/
├── index.ts
├── config/
│   └── constants.ts
├── models/
│   ├── developer.model.ts
│   └── metrics.model.ts
├── services/
│   ├── github.service.ts
│   ├── calculator.service.ts
│   └── cache.service.ts
└── utils/
    ├── rate-limiter.ts
    └── logger.ts

tests/
├── cache.spec.ts
├── calculator.spec.ts
└── github.spec.ts
```

## 6. Fayl kasta waxa uu qabto

### `src/index.ts`

Kani waa entry point-ka package-ka. Wuxuu dibadda u soo saaraa:

- constants;
- models iyo Zod schemas;
- `CacheService`;
- `CalculatorService`;
- `GitHubService`;
- logger iyo rate limiter.

Taasi waxay qofka package-ka isticmaala u oggolaanaysaa inuu si toos ah u qoro:

```ts
import { GitHubService, CacheService } from "open-source-metrics-so";
```

### `src/config/constants.ts`

Waxa ku jira:

- `GITHUB_API_URL` — GitHub REST URL;
- `GITHUB_GRAPHQL_URL` — GitHub GraphQL URL;
- cache TTL default: 3600 seconds, oo ah hal saac;
- cache check period: 600 seconds;
- score weights;
- rate limit values.

Faylkani sidoo kale wuxuu wacaa `dotenv.config()`, sidaas darteed `.env` variables ayaa la akhriyaa marka package-ka la load-gareeyo.

### `src/models/developer.model.ts`

Waxa uu qeexayaa qaabka developer-ka:

- username;
- name;
- avatar URL;
- bio;
- public repositories;
- followers;
- account creation date.

`DeveloperProfileSchema` wuxuu xogta ku hubiyaa Zod. Waxa kale oo ku jira `DeveloperActivityMetricsSchema`, kaas oo isku dara profile, contributions, score iyo rank.

### `src/models/metrics.model.ts`

Waxa uu qeexayaa:

- repository metrics;
- contribution details.

`ContributionDetails` wuxuu leeyahay:

```text
commits
prsMerged
issuesClosed
starsContributed
```

Zod wuxuu hubiyaa in tirooyinku yihiin numbers aan negative ahayn.

### `src/services/calculator.service.ts`

Kani waa qaybta xisaabta.

`calculateScore()` wuxuu adeegsadaa formula-da score-ka.

`determineRank()` wuxuu score-ka u rogaa `ELITE`, `PRO`, `ACTIVE`, ama `EMERGING`.

`computeDeveloperMetrics()` wuxuu isku daraa profile iyo contributions.

`computeRepositoryMetrics()` wuxuu isku daraa xogta repo-ga, kadibna wuxuu sameeyaa `velocityScore`.

Score-ka waxaa lagu soo koobaa laba decimal places.

### `src/services/cache.service.ts`

Kani wuxuu isticmaalaa package-ka `node-cache`.

Functions-ka muhiimka ah:

- `get(key)` — xog cache ku jirta soo qaad;
- `set(key, value, ttl?)` — xog kaydi;
- `delete(key)` — hal key tirtir;
- `clear()` — cache oo dhan nadiifi;
- `getStats()` — cache statistics soo celi.

Cache wuxuu yareeyaa GitHub API calls-ka iyo rate-limit pressure-ka.

### `src/services/github.service.ts`

Kani waa service-ka ugu weyn.

Constructor-ku wuxuu qaataa:

- GitHub token;
- custom cache service;
- custom rate limiter.

Haddii token aan constructor-ka lagu siin, wuxuu isku dayaa `process.env.GITHUB_TOKEN`.

#### `fetchDeveloperProfile(username)`

Waxay wacdaa:

```text
GET /users/{username}
```

Waxay ka soo qaaddaa profile-ka, u beddeshaa model gudaha ah, Zod-na way ku hubisaa. Natiijada cache ayay gelisaa.

#### `fetchDeveloperContributions(username)`

Waxay wacdaa public events endpoint-ka:

```text
GET /users/{username}/events/public
```

Event-yada ayay kala tirisaa:

- `PushEvent` -> commits;
- merged `PullRequestEvent` -> merged PRs;
- closed `IssuesEvent` -> closed issues;
- `WatchEvent` -> stars contributed.

#### `getDeveloperActivityMetrics(username)`

Waxay marka hore soo qaaddaa profile iyo contributions, kadibna `CalculatorService` ayay u dirtaa si loo helo score iyo rank.

#### `fetchDeveloperContributionsGraphQL(username)`

Waxay GitHub GraphQL ku soo qaaddaa contribution totals. Token sax ah ayaa loo baahan yahay.

#### `getRepositoryMetrics(owner, name)`

Waxay isku mar wacdaa afar endpoint:

- repository details;
- closed pull requests;
- closed issues;
- commits.

Kadib waxay tirisaa stars, forks, issues, PRs iyo commits, waxayna sameysaa velocity score.

### `src/utils/rate-limiter.ts`

Waxa uu hirgeliyaa token-bucket algorithm.

- bucket-ku wuxuu ka bilaabmaa 100 tokens;
- request kasta wuxuu isticmaalaa hal token;
- 10 tokens ayaa daqiiqad kasta dib loogu daraa;
- marka tokens dhammaadaan request-ka waa la diidaa.

### `src/utils/logger.ts`

Logger-ku wuxuu leeyahay:

- `debug()`;
- `info()`;
- `warn()`;
- `error()`.

Log kasta wuxuu leeyahay timestamp iyo level. Debug logs lama daabaco marka `NODE_ENV=production` yahay.

### `tests/`

`cache.spec.ts` wuxuu tijaabiyaa set, get, delete iyo clear.

`calculator.spec.ts` wuxuu tijaabiyaa formula-da, rank boundaries, developer metrics iyo repository metrics.

`github.spec.ts` wuxuu mock-gareeyaa Axios, mana waco GitHub dhab ah. Wuxuu tijaabiyaa profile, contributions, GraphQL, repo metrics iyo rate-limit error.

### `README.md`

README-gu wuxuu sharxayaa installation, environment variable, examples, formula, output samples, tests iyo license.

### `package.json`

Dependencies-ka runtime-ka waa:

- `axios` — HTTP requests;
- `dotenv` — environment variables;
- `node-cache` — memory cache;
- `zod` — runtime validation.

Scripts-ka waa:

```bash
npm run build
npm test
npm run lint
npm run format
```

### `tsconfig.json`

TypeScript waxaa lagu dejiyey strict mode, declaration files, source maps, iyo output folder `dist/`. Module target-ka dhabta ahi waa `CommonJS`.

### `.github/workflows/build-test.yml`

CI pipeline-ku wuxuu Node 18 iyo Node 20 ku sameeyaa:

1. `npm ci`;
2. lint;
3. TypeScript compilation;
4. tests iyo coverage.

### `config/settings.yaml`

Waxa ku jira version, tracking flag iyo interval. Core TypeScript code-ka hadda si toos ah uma akhriyo faylkan.

### `metrics/tracker.py`

Waa Python function yar oo leh formula kale:

```python
(stars * 3) + (forks * 5) + commits
```

Formula-dan lama isticmaalo TypeScript services-ka, sidaas darteed waxay u muuqataa prototype ama code hore.

## 7. Sida loo rakibo

```bash
npm ci
```

`.env` file samee:

```env
GITHUB_TOKEN=your_personal_access_token_here
```

Build samee:

```bash
npm run build
```

Tests orod:

```bash
npm test
```

## 8. Tusaale isticmaal developer

```ts
import { GitHubService } from "open-source-metrics-so";

const github = new GitHubService({
  token: process.env.GITHUB_TOKEN,
});

const result = await github.getDeveloperActivityMetrics("octocat");
console.log(result);
```

Natiijadu waxay yeelan kartaa:

```json
{
  "profile": {},
  "contributions": {
    "commits": 120,
    "prsMerged": 15,
    "issuesClosed": 10,
    "starsContributed": 50
  },
  "activityScore": 270,
  "rankCategory": "PRO",
  "lastUpdatedAt": "2024-03-31T12:00:00.000Z"
}
```

## 9. Tusaale isticmaal repository

```ts
const result = await github.getRepositoryMetrics(
  "somali-devs",
  "open-source-so"
);

console.log(result.velocityScore);
```

## 10. Waxyaabaha fiican ee mashruuca

- Code-ku si fiican ayuu u kala qaybsan yahay: models, services iyo utils.
- TypeScript strict mode ayaa la isticmaalay.
- Zod runtime validation ayaa jira.
- API errors ayaa la log-gareeyaa.
- Cache ayaa yareynaya requests-ka soo noqnoqda.
- REST iyo GraphQL labadaba waa la taageeray.
- Tests ayaa jira, gaar ahaan calculator iyo mocked API behavior.
- GitHub Actions CI pipeline ayaa jira.

## 11. Dhibaatooyin iyo xaddidaado muhiim ah

### 11.1 README iyo implementation si buuxda isuguma eka

README-gu wuxuu sheegaa LRU cache iyo ESM/CJS compatibility, laakiin code-ku wuxuu isticmaalaa `node-cache`, halka TypeScript output-ku yahay CommonJS oo keliya.

### 11.2 Pagination ma dhamaystirna

Repo endpoint-yadu waxay qaadanayaan ugu badnaan 100 items. Repo weyn score-kiisu ma matali karo dhammaan commits, PRs ama issues.

### 11.3 Developer events ma aha history dhamaystiran

Public events-ku waa events-ka dhowaan la heli karo, mana aha dhammaan taariikhda developer-ka.

### 11.4 Magacyada metrics qaar waxay noqon karaan marin-habaabin

GraphQL `totalPullRequestContributions` ma caddaynayo in dhammaantood la merge-gareeyey. Sidoo kale starred repositories waa repos uu user-ku star gareeyey, ma aha stars uu kasbaday.

### 11.5 Rate limiter-ku request kasta ma tiriyo

`getRepositoryMetrics()` wuxuu sameeyaa afar HTTP requests, laakiin local limiter-ka wuxuu ka jarayaa hal token oo keliya.

### 11.6 README sample score khaldan

Repository example-ka README wuxuu leeyahay score `416`, laakiin values-ka iyo formula-da code-ku waxay soo saarayaan `481`.

### 11.7 Build/test deegaanka hadda

Markii la hubiyey project-kan, dependencies lama rakibin, sidaas darteed `tsc` lama helin. Build iyo tests waxay u baahan yihiin marka hore:

```bash
npm ci
```

## 12. Gunaanad

Mashruucani waa aasaas wanaagsan oo lagu dhisi karo GitHub analytics iyo Somali open-source leaderboard. Core-kiisu wuxuu qabtaa saddex shaqo oo waaweyn:

1. GitHub xog ka soo qaadid;
2. xogta validation iyo caching;
3. score iyo rank xisaabin.

Si production loogu isticmaalo, waxaa ugu muhiimsan in la saxo pagination-ka, la caddeeyo macnaha “merged”, “closed” iyo “stars”, la hagaajiyo README examples-ka, lana mideeyo TypeScript implementation-ka iyo docs-ka.
