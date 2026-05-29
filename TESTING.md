# Testing

This document covers the test suite, how to run it, and what each file covers.

## Running tests

### All packages at once

```bash
pnpm test
```

Turborepo runs tests in dependency order: `shared` → `backend` + `worker` in parallel.

### Individual packages

```bash
pnpm --filter @api-perf/shared  test
pnpm --filter @api-perf/backend test
pnpm --filter @api-perf/worker  test
```

### Watch mode (worker / shared)

```bash
cd apps/worker   && pnpm vitest
cd packages/shared && pnpm vitest
```

---

## Test framework

| Package | Framework | Notes |
|---|---|---|
| `packages/shared` | Vitest | Pure unit tests, no external deps |
| `apps/backend` | Vitest + Supertest + mongodb-memory-server | In-memory MongoDB, mocked Redis/BullMQ |
| `apps/worker` | Vitest | `undici` mocked via `vi.mock()`, fake timers for interval tests |

---

## Package: `packages/shared`

**Location:** `packages/shared/src/__tests__/`

### `percentile.test.ts`

Tests the `calculatePercentile`, `calculatePercentiles`, and `average` utility functions used by both the backend aggregation logic and the worker's per-window stats.

| Test | What it checks |
|---|---|
| Empty array → 0 | Safe default with no data |
| Single element | Any percentile returns the one value |
| p50 on a small array | Correct median selection |
| p99 on 100-element array | Value at index 98 |
| p100 | Returns maximum |
| `calculatePercentiles` on unsorted input | Input is sorted before indexing |
| Does not mutate input | Original array unchanged after call |
| p50 ≤ p95 ≤ p99 invariant | Ordering holds for any distribution |
| Uniform distribution | All percentiles equal the constant value |
| `average` edge cases | Empty → 0, single → itself, floats, identical values |

### `stats.test.ts`

Tests the `RunningStat` class — an online Welford-algorithm variance tracker used during live metric windows to compute mean, min, max, variance, and standard deviation in a single pass.

| Test | What it checks |
|---|---|
| Initial state | All values zero, count zero |
| Count tracking | Increments correctly |
| Mean correctness | Matches arithmetic mean |
| Min / max tracking | Updates as new extremes arrive |
| Single-value variance | Zero variance for one sample |
| Sample variance for `[1,2,3]` | Matches known result of 1 |
| `stddev == sqrt(variance)` | Invariant holds for any input |
| Negative numbers | Mean and bounds correct |

---

## Package: `apps/backend`

**Location:** `apps/backend/src/__tests__/`

Backend tests use **Vitest + Supertest** against the real Express app. MongoDB is provided by `mongodb-memory-server` (spun up in `global.setup.ts`). Redis and BullMQ are mocked with `vi.mock()` so no running infrastructure is needed.

### Test setup

`global.setup.ts` — Vitest `globalSetup` file. Starts `MongoMemoryServer` and injects `MONGODB_URI` into the environment before any test runs. Tears down the server after all tests complete.

`setup.ts` — Per-file `setupFile`. Connects Mongoose before the suite, clears all collections `afterEach` (test isolation), and disconnects `afterAll`.

### `health.test.ts`

| Test | What it checks |
|---|---|
| `GET /api/health` → 200 | Returns `{ status: "ok", timestamp }` |
| Unknown API path → 404 | Standard error envelope with `code: NOT_FOUND` |
| Unknown top-level path → 404 | Falls through all routers correctly |

### `configs.test.ts`

Tests the full CRUD lifecycle for test configurations.

**`POST /api/configs`**

| Test | What it checks |
|---|---|
| Valid payload → 201 | Returns created document with `id` |
| Missing `name` → 400 | `VALIDATION_ERROR` code |
| Missing `totalRequests` → 400 | `VALIDATION_ERROR` |
| Empty endpoints array → 400 | Minimum 1 endpoint enforced |
| Invalid endpoint URL → 400 | URL format validation |
| Invalid HTTP method (`BREW`) → 400 | Method enum validation |
| `concurrency > 500` → 400 | Upper bound enforced |
| More than 20 endpoints → 400 | Array length limit enforced |
| `totalRequests > 1,000,000` → 400 | Upper bound enforced |

**`GET /api/configs`**

| Test | What it checks |
|---|---|
| Empty DB → empty list | `items: [], total: 0` |
| After 2 creates | `total: 2`, 2 items returned |

**`GET /api/configs/:id`**

| Test | What it checks |
|---|---|
| Existing ID | Returns correct document |
| Non-existent ObjectId → 404 | `NOT_FOUND` code |
| Malformed ID → 404 | Handled gracefully |

**`PATCH /api/configs/:id`**

| Test | What it checks |
|---|---|
| Partial update | Only patched field changes, others preserved |
| Non-existent ID → 404 | `NOT_FOUND` code |

**`DELETE /api/configs/:id`**

| Test | What it checks |
|---|---|
| Existing config → 204 | Config no longer findable after delete |
| Non-existent ID → 404 | `NOT_FOUND` code |

### `runs.test.ts`

Tests the test run lifecycle.

**`GET /api/runs`**

| Test | What it checks |
|---|---|
| Empty DB → empty list | `items: []` |

**`GET /api/runs/compare`**

| Test | What it checks |
|---|---|
| Missing `ids` param → 400 | `BAD_REQUEST` |
| Fewer than 2 IDs → 400 | Minimum 2 runs required |
| More than 4 IDs → 400 | Maximum 4 runs enforced |

**`POST /api/runs`**

| Test | What it checks |
|---|---|
| Missing `configId` → 400 | `VALIDATION_ERROR` |
| Non-existent config → 404 | `NOT_FOUND` |
| Valid config → 201 | Returns run with `queued` or `running` status |
| Run appears in list | `GET /api/runs` reflects new run |

**`POST /api/runs/:id/cancel`**

| Test | What it checks |
|---|---|
| Non-existent run → 404 | `NOT_FOUND` |
| Active run → 200 | Status becomes `cancelled` |

**`GET /api/runs/:id`**

| Test | What it checks |
|---|---|
| Non-existent → 404 | Standard 404 |
| Existing run | Returns document with matching `id` |

---

## Package: `apps/worker`

**Location:** `apps/worker/src/__tests__/`

Worker tests use Vitest with `vi.mock()` and `vi.useFakeTimers()`. No real network traffic or Redis connections are made.

### `request.executor.test.ts`

Tests `executeRequest()` — the function that makes a single HTTP request via `undici` and returns timing, status, and response metadata. `undici` is mocked via `vi.mock('undici', ...)` at the top of the file so the mock is in place before the executor module is imported.

| Test | What it checks |
|---|---|
| Successful response | Returns `statusCode`, `latencyMs ≥ 0`, `url`, `method` |
| Network failure (ECONNREFUSED) | Returns `statusCode: 0` with error message |
| Retry on network error (`retriesLeft: 1`) | `undici.request` called twice, final result is 200 |
| Exhausts all retries | Called `retriesLeft + 1` times, returns final error |
| No retry on `AbortError` (timeout) | Called exactly once despite `retriesLeft > 0` |
| POST with headers + body | `undici.request` receives correct method, headers, serialised body |
| GET sends no body | `body: undefined` in undici call |
| Non-2xx status (404) | Returns `statusCode: 404`, no `error` field set |
| `ttfbMs` populated | `ttfbMs ≥ 0` on any successful response |

### `metrics.collector.test.ts`

Tests `MetricsCollector` — the per-worker class that accumulates request results and emits 500ms metric windows (latency percentiles, RPS, TTFB, response sizes, CPU %, heap memory) to Redis pub/sub. Uses fake timers to control interval firing without real time passing.

| Test | What it checks |
|---|---|
| Latency recording | `getLatencies()` returns all recorded values |
| Status code recording | `getStatusCodes()` returns all codes |
| Error recording | Network errors (`statusCode: 0`) are captured in `getErrors()` |
| No error for successful requests | 200 responses do not add to error list |
| No error for 4xx without error string | HTTP errors are not conflated with network failures |
| Per-URL stats grouped by method:url | Correct success/failure/latency arrays per key |
| Log cap at 1000 entries | Logs never exceed 1000 entries regardless of input volume |
| Window emitted to Redis on interval | `redis.publish` called after timer advances; payload parses correctly |
| No emit when window is empty | `redis.publish` not called if no requests in the interval |
| `flush()` emits remaining data | Publishes on demand, stops interval so no further emissions occur |
| Window RPS > 0 after requests | RPS is positive; `successInWindow` / `failureInWindow` match input |

---

## CI integration

Tests run automatically on every push to `main` or `develop` and on pull requests to `main`.

The CI pipeline currently:
1. Runs `pnpm typecheck` across all packages
2. Builds Docker images for backend and worker with Buildx
3. Spins up the dev compose stack (`docker-compose.dev.yml`) and hits `/api/health` as a smoke test

To add the unit/integration test suite to CI, add this step after the typecheck job:

```yaml
- name: Run tests
  run: pnpm test
```

Note: backend tests use `mongodb-memory-server` which downloads a MongoDB binary on first run — this adds ~30s to CI cold runs. The binary is cached between runs if the workflow caches `~/.cache/mongodb-binaries`.

---

## What is not covered

| Area | Reason |
|---|---|
| Frontend components | No component test setup; UI verified manually via the dev server |
| WebSocket live streaming | Requires a running worker and Redis; treated as integration scope |
| Export (CSV / PDF) | Covered by manual verification against known run data |
| OpenAPI import | Tested manually with sample specs; unit coverage would require fixture files |
| Metrics aggregation (backend) | `aggregateJobResults` and `mergeWindows` in `queue.events.ts` — candidates for future unit tests |
