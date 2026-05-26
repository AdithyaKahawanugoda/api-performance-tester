# Testing

This document describes the test suite for the API Performance Tester monorepo — what is tested, how to run it, and the design decisions behind each layer.

## Quick start

```bash
# Run all tests across every package
pnpm test

# Run a single package in watch mode
pnpm --filter @api-perf/shared vitest
pnpm --filter @api-perf/worker vitest
pnpm --filter @api-perf/backend vitest
```

Infrastructure required for the backend integration tests (MongoDB + Redis) is handled automatically by `mongodb-memory-server` — no Docker needed.

---

## Test inventory

| Package | File | Kind | Tests |
|---|---|---|---|
| `@api-perf/shared` | `percentile.test.ts` | Unit | 17 |
| `@api-perf/shared` | `stats.test.ts` | Unit | 10 |
| `@api-perf/worker` | `request.executor.test.ts` | Unit | 8 |
| `@api-perf/worker` | `metrics.collector.test.ts` | Unit | 11 |
| `@api-perf/backend` | `health.test.ts` | Integration | 3 |
| `@api-perf/backend` | `configs.test.ts` | Integration | 18 |
| `@api-perf/backend` | `runs.test.ts` | Integration | 12 |
| **Total** | | | **79** |

---

## Layer 1 — `packages/shared` (unit tests)

**Runner:** Vitest  
**External dependencies:** none

The shared package contains pure functions and classes with no I/O — perfect candidates for fast, isolated unit tests.

### `percentile.test.ts`

Tests `calculatePercentile`, `calculatePercentiles`, and `average` from `src/utils/percentile.ts`.

| Scenario | What is verified |
|---|---|
| Empty array | Returns 0 for all percentiles and average |
| Single element | Any percentile returns the single value |
| Sorted array | p50, p95, p99 computed correctly |
| Unsorted input | `calculatePercentiles` sorts internally before computing |
| Mutation safety | Input array is not modified |
| Ordering invariant | p50 ≤ p95 ≤ p99 for any distribution |
| Uniform distribution | All percentiles equal the repeated value |
| Boundary percentiles | p1, p100 return minimum and maximum |

### `stats.test.ts`

Tests `RunningStat` from `src/utils/stats.ts`. This is Welford's online algorithm for computing mean, variance, and standard deviation in a single pass without storing all values.

| Scenario | What is verified |
|---|---|
| Empty state | count=0, avg/min/max/variance/stddev all return 0 |
| Single push | min and max both equal that value; variance is 0 |
| Multiple pushes | Count, running mean, and min/max track correctly |
| Variance correctness | Sample variance for [1,2,3] = 1 (exact) |
| stddev = √variance | Holds for any sequence |
| Negative numbers | Handled correctly; min goes negative |
| Incremental extremes | min/max update as new extremes arrive |

---

## Layer 2 — `apps/worker` (unit tests)

**Runner:** Vitest  
**External dependencies:** `fetch` (stubbed globally), `ioredis` (manual mock object)

Worker code runs HTTP load and publishes metrics windows. Tests cover both the request execution logic and the metric aggregation/emission logic in isolation.

### `request.executor.test.ts`

Tests `executeRequest` from `src/processor/request.executor.ts`.

`fetch` is replaced with `vi.stubGlobal('fetch', mockFetch)` before any test runs. All network I/O is controlled entirely by the mock.

| Scenario | What is verified |
|---|---|
| Successful response | statusCode, latencyMs, url, method returned; no error field |
| Network error (retriesLeft=0) | statusCode=0, error message set, fetch called once |
| Retry on network error | Retried `retriesLeft` times before succeeding |
| All retries exhausted | Final error returned after N+1 attempts |
| No retry on AbortError | A timeout abort is not retried even if retriesLeft > 0 |
| Headers and body forwarding | Custom headers and JSON body passed through to fetch |
| No body for GET | `body: undefined` sent for requests without a body |
| Non-2xx status (e.g. 404) | Returned as-is; not treated as an error by the executor |

### `metrics.collector.test.ts`

Tests `MetricsCollector` from `src/processor/metrics.collector.ts`.

Redis is replaced with a plain mock object `{ publish: vi.fn(), quit: vi.fn() }`. Fake timers (`vi.useFakeTimers`) control the emit interval without real waits.

| Scenario | What is verified |
|---|---|
| Record latencies | `getLatencies()` accumulates all values |
| Record status codes | `getStatusCodes()` accumulates all values |
| Error tracking | Error string stored only when `error` field is present |
| No error for 4xx | HTTP failures without an error string don't populate `getErrors()` |
| Per-URL stats | Grouped by `method:url`; success/failure counts and latency arrays correct |
| Log capping | `getLogs()` never exceeds 1000 entries regardless of request count |
| Interval emission | `redis.publish` called with a `METRICS_WINDOW` payload after the emit interval fires |
| Empty window skipped | No publish call when no requests were recorded in the interval |
| Flush | Emits the current window and stops the interval timer |
| RPS calculation | `payload.rps > 0` when time has elapsed between recording and flushing |

---

## Layer 3 — `apps/backend` (integration tests)

**Runner:** Vitest (forks pool, sequential files)  
**External dependencies:**
- **MongoDB** — `mongodb-memory-server` starts a real in-process MongoDB instance. No Docker required.
- **Redis / BullMQ** — mocked via `vi.mock('ioredis')` and `vi.mock('bullmq')`. Queue jobs are not actually enqueued; `testQueue.add()` returns `{ id: 'mock-job-id' }`.

**Setup flow:**

1. `global.setup.ts` runs once before any test file: starts `MongoMemoryServer`, writes the URI to `process.env.MONGODB_URI`, sets all other required env vars.
2. `setup.ts` runs as a `setupFile` before each test file: connects Mongoose to the memory server, clears all collections before the file's tests begin, clears them again after each individual test, and disconnects after the file finishes.
3. Test files are run sequentially (`fileParallelism: false`) to prevent concurrent MongoDB writes between files from interfering with each other.

Each test file mocks `ioredis` and `bullmq` at the top using `vi.mock` (hoisted before imports), then imports `createApp()` to get a real Express application connected to the in-memory database.

### `health.test.ts`

| Scenario | What is verified |
|---|---|
| `GET /api/health` | 200, `{ success: true, data: { status: 'ok', timestamp: <ISO string> } }` |
| Unknown path under `/api` | 404, `{ success: false, error: { code: 'NOT_FOUND' } }` |
| Completely unknown top-level path | 404 |

### `configs.test.ts`

**Happy path:**

| Scenario | What is verified |
|---|---|
| `POST /api/configs` valid body | 201, response contains `id` and echoes `name` |
| `GET /api/configs` (empty) | 200, `items: []`, `total: 0` |
| `GET /api/configs` (after inserts) | 200, correct `total` and `items` length |
| `GET /api/configs/:id` found | 200, correct `id` and fields |
| `PATCH /api/configs/:id` | 200, only patched field changed; other fields unchanged |
| `DELETE /api/configs/:id` | 204; subsequent GET returns 404 |

**Validation edge cases (all expect 400 `VALIDATION_ERROR`):**

| Scenario |
|---|
| Missing `name` |
| Missing `totalRequests` |
| `endpoints: []` (empty array) |
| Endpoint URL is not a valid URL |
| Endpoint method is not a recognised HTTP verb |
| `concurrency` > 500 |
| More than 20 endpoints |
| `totalRequests` > 1,000,000 |

**Not found / malformed ID:**

| Scenario | Expected |
|---|---|
| `GET /api/configs/:id` — valid ObjectId, no document | 404 `NOT_FOUND` |
| `GET /api/configs/:id` — malformed ObjectId string | 404 `NOT_FOUND` (Mongoose `CastError` handled in error middleware) |
| `PATCH` — non-existent ID | 404 |
| `DELETE` — non-existent ID | 404 |

### `runs.test.ts`

**List and compare:**

| Scenario | Expected |
|---|---|
| `GET /api/runs` when empty | 200, `items: []` |
| `GET /api/runs/compare` — no `ids` param | 400 `BAD_REQUEST` |
| `GET /api/runs/compare` — only 1 ID | 400 `BAD_REQUEST` |
| `GET /api/runs/compare` — 5 IDs (max is 4) | 400 `BAD_REQUEST` |

**Starting a run:**

| Scenario | Expected |
|---|---|
| `POST /api/runs` — missing `configId` | 400 `VALIDATION_ERROR` |
| `POST /api/runs` — configId does not exist | 404 `NOT_FOUND` |
| `POST /api/runs` — valid configId | 201, `configId` matches, `status` is `queued` or `running` |
| After a successful start, `GET /api/runs` | `total >= 1` |

**Cancel and fetch:**

| Scenario | Expected |
|---|---|
| `POST /api/runs/:id/cancel` — non-existent run | 404 `NOT_FOUND` |
| `POST /api/runs/:id/cancel` — active run | 200, `status: 'cancelled'` |
| `GET /api/runs/:id` — non-existent | 404 |
| `GET /api/runs/:id` — existing run | 200, `id` matches |

---

## Design decisions

**Why `mongodb-memory-server` instead of mocking Mongoose?**  
Mocking the model layer hides real bugs — type mismatches, missing fields, incorrect query filters. The memory server runs real MongoDB so queries, index behaviour, and Mongoose middleware all execute as they would in production.

**Why mock Redis and BullMQ?**  
The queue is an async side-effect boundary. Testing that `testQueue.add()` was called is enough to verify the orchestration logic; testing BullMQ internals or Redis pub/sub in an integration test would require a real Redis instance and greatly slow down the suite. Redis-specific behaviour (pub/sub, metrics streaming) is covered by the worker unit tests instead.

**Why `fileParallelism: false`?**  
All backend test files share one MongoDB instance. Running them in parallel caused `afterEach` cleanups in one file to delete documents mid-test in another. Sequential execution gives each file a clean slate without requiring a separate database per file.

**Why `vi.stubGlobal('fetch')` in the worker tests instead of a library?**  
Node 22 ships `fetch` as a native global. `vi.stubGlobal` replaces it cleanly for the duration of the test file and is restored automatically, with no third-party HTTP mocking library needed.

---

## Practical scenarios

This section walks through the tricky parts of the test setup — the kinds of problems that are easy to run into when adding new tests, and the exact reasoning behind why the setup is the way it is. Each scenario starts from a real failure encountered while building this suite.

---

### Scenario 1 — "My test passes alone but fails when the full suite runs"

**Symptom.** A test that asserts an empty list unexpectedly finds documents:

```
AssertionError: expected [ { name: 'Run Test Config', … } ] to deeply equal []
```

This is a data contamination problem. When test files run in parallel (the vitest default), each file gets its own Node.js process, but they all connect to the **same** MongoDB instance. The `afterEach` in `configs.test.ts` cleans up that file's own data, but `runs.test.ts` running at the same time has already inserted a config of its own. Two files cleaning the same database concurrently is a race condition.

**What parallel execution looks like in practice:**

```
time →
configs.test.ts  [POST /configs] [GET /configs ← sees "Run Test Config" from runs!]
runs.test.ts              [POST /configs "Run Test Config"] [POST /runs]
```

**The fix — two parts:**

First, run files sequentially so only one file touches the database at a time:

```ts
// apps/backend/vitest.config.ts
test: {
  pool: 'forks',
  fileParallelism: false,   // <-- files run one after another
  ...
}
```

Second, clear all collections at the start of each file's `beforeAll` so any leftover data from the previous file is gone before the next one begins:

```ts
// apps/backend/src/__tests__/setup.ts
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env['MONGODB_URI']!);
  }
  // Wipe everything so this file starts with a guaranteed clean slate
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});
```

Without the `beforeAll` wipe, even sequential files can fail: if the previous file's last test threw before its `afterEach` could clean up, data leaks to the next file.

---

### Scenario 2 — "The app crashes immediately with 'Invalid environment variables'"

**Symptom.** Every backend test file exits with:

```
Invalid environment variables: {
  LOG_LEVEL: ["Invalid enum value. Expected 'trace'|'debug'|'info'|'warn'|'error'|'fatal', received 'silent'"]
}
Error: process.exit unexpectedly called with "1"
```

`env.ts` runs `validateEnv()` at module load and calls `process.exit(1)` on the first invalid value. There are two things that can go wrong here.

**Problem A — wrong value.** `'silent'` is not a valid Pino log level. The env schema only accepts the six levels Pino actually understands. Use `'error'` for tests (least noisy valid value):

```ts
// global.setup.ts  ← wrong
process.env['LOG_LEVEL'] = 'silent';

// global.setup.ts  ← correct
process.env['LOG_LEVEL'] = 'error';
```

**Problem B — env vars set too late.** Even with correct values, if `process.env` is set in a `beforeAll` hook, it is too late. `import { createApp } from '../app'` at the top of the test file triggers the module loader synchronously, which immediately loads `env.ts`, which immediately calls `validateEnv()` — all before any `beforeAll` hook runs.

The solution is `globalSetup` combined with `pool: 'forks'`. `global.setup.ts` runs in the main process before any test worker is forked. Because the workers are child processes (`forks` pool), they **inherit** the parent's `process.env` at the time they are created. By the time any test file imports anything, the env vars are already in place.

```
Main process
  │
  ├── global.setup.ts runs → sets process.env.MONGODB_URI, LOG_LEVEL, etc.
  │
  └── forks test workers (child processes inherit env at fork time)
          │
          └── test file imported → env.ts validates → passes ✓
```

If you use `pool: 'threads'` (the vitest default) instead of `pool: 'forks'`, worker threads share the same process but have their own memory space. Environment variables set in `globalSetup` after the workers are created are **not** visible to them, causing the validation to fail.

---

### Scenario 3 — "I moved `vi.mock` into a shared setup file and now nothing is mocked"

**Symptom.** After tidying up boilerplate by moving the ioredis and bullmq mocks into `setup.ts`, the tests start throwing real Redis connection errors:

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

`vi.mock` calls are **hoisted** by vitest to the top of the file they appear in — they run before any `import` statement in that same file. This is what makes mocking work at all: the mock is registered before the module under test is loaded, so when `createApp` imports `queue.client.ts` which imports `ioredis`, it gets the mock instead of the real module.

`setup.ts` is a separate file with its own module scope. A `vi.mock` in `setup.ts` is hoisted to the top of `setup.ts`, not to the top of the test file. By the time the test file loads, `setup.ts` has already finished executing and the mocks registered there are not in scope for the test file's imports.

The `vi.mock` block must live in every test file that needs it:

```ts
// configs.test.ts  ← this is the only place vi.mock works for this file's imports
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({ on: vi.fn(), ... })),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({ add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }) })),
  QueueEvents: vi.fn().mockImplementation(() => ({ on: vi.fn() })),
}));

// Only after the mocks are registered does importing createApp actually work
import { createApp } from '../app';
```

The apparent paradox — `vi.mock` appears below `import` in the source but runs first — is resolved by vitest's compile step, which physically moves `vi.mock` calls to before any imports in the output.

---

### Scenario 4 — "The `@api-perf/shared` package can't be resolved in tests"

**Symptom.** The worker or backend test suite fails immediately with:

```
Error: Failed to resolve entry for package "@api-perf/shared".
No known conditions for "." specifier in "@api-perf/shared" package
```

The shared package's `package.json` exports only a `require` condition:

```json
"exports": {
  ".": {
    "require": "./dist/index.js",
    "types": "./dist/index.d.ts"
  }
}
```

Vitest runs through Vite, which resolves modules using ESM conditions by default (`import`, `default`). It finds no matching condition and gives up.

The fix is a path alias in the vitest config that points directly to the TypeScript source, bypassing the exports map entirely:

```ts
// apps/worker/vitest.config.ts
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@api-perf/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  ...
});
```

This means tests always run against the shared package's source, not its compiled output. If you change something in `packages/shared/src`, you don't need to rebuild shared before running tests — vitest processes the TypeScript directly. This is the same pattern used in the dev-mode tsconfig path aliases; it just surfaces in a different config file.

---

### Scenario 5 — "Testing async intervals: fake timers and the microtask flush"

The `MetricsCollector` emits a metrics window to Redis every N milliseconds using `setInterval`. Testing this without real waits requires two things working together correctly.

**The naive approach that does not work:**

```ts
it('emits on interval', async () => {
  collector.record({ statusCode: 200, latencyMs: 50, url: 'http://a.com', method: 'GET' });
  vi.advanceTimersByTime(150); // fire the interval
  expect(redis.publish).toHaveBeenCalled(); // ❌ fails — publish is still 0
});
```

`redis.publish` is called inside `emitWindow`, which is an `async` function. `setInterval` fires it, but `advanceTimersByTime` only triggers the timer callback synchronously — it does not wait for the async work inside the callback to settle. The `await redis.publish(...)` call hasn't resolved yet by the time the `expect` runs.

**The fix — yield to the microtask queue after advancing time:**

```ts
it('emits on interval', async () => {
  collector.record({ statusCode: 200, latencyMs: 50, url: 'http://a.com', method: 'GET' });
  vi.advanceTimersByTime(150);
  await Promise.resolve(); // flush pending microtasks / resolved promises
  expect(redis.publish).toHaveBeenCalled(); // ✓
});
```

`await Promise.resolve()` yields execution back to the event loop for one microtask tick. That is enough for the async `emitWindow` call (which is a series of resolved promises, not real I/O) to complete.

**A second subtlety — zero-duration windows produce RPS = 0:**

```ts
// ❌ fails: rps is 0
collector.record(...);
await collector.flush();
expect(parsed.payload.rps).toBeGreaterThan(0);
```

RPS is computed as `requests / durationMs * 1000`. With fake timers, `Date.now()` stays frozen at the value it had when the collector was constructed. The window's start and end timestamps are the same value, so `durationMs = 0`, and the code returns `rps = 0` by design:

```ts
rps: durationMs > 0 ? (this.windowLatencies.length / durationMs) * 1000 : 0,
```

Advance the fake clock before flushing so the timestamps diverge:

```ts
// ✓
collector.record(...);
vi.advanceTimersByTime(50); // now windowEndMs > windowStartMs
await collector.flush();
expect(parsed.payload.rps).toBeGreaterThan(0);
```

---

### Scenario 6 — "A malformed ID returns 500 instead of 404"

**Symptom discovered by the tests.** Hitting `GET /api/configs/not-a-valid-id` returned HTTP 500 with `INTERNAL_ERROR` instead of the expected 404.

The route calls `TestConfigModel.findById('not-a-valid-id')`. Mongoose tries to cast the string to an ObjectId and throws a `CastError` synchronously before touching the database. This exception is not an `AppError`, so it falls through all the known-error checks in the error middleware and hits the generic 500 handler:

```ts
// error.middleware.ts — original order
if (err instanceof ValidationError) { ... }     // ← Zod validation
if (err instanceof AppError) { ... }             // ← our custom errors
// everything else falls here → 500
logger.error({ err }, 'Unexpected error');
res.status(500).json({ ... });
```

The fix is to intercept Mongoose's `CastError` before the catch-all and map it to 404. A `CastError` means "this value cannot represent a valid document ID", which from the caller's perspective is identical to "no document with that ID":

```ts
// error.middleware.ts — with CastError handling added
import { Error as MongooseError } from 'mongoose';

if (err instanceof MongooseError.CastError) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Resource not found' },
  });
  return;
}
```

This was a real bug that existed in the production code path. The integration test caught it because it exercised the same `findById` call with an invalid ID string — exactly what a user with a mistyped URL would send.

---

### Scenario 7 — "How do I add a test for a new API endpoint?"

**Adding a new endpoint test to `configs.test.ts` as an example.**

Say you add a `POST /api/configs/:id/duplicate` endpoint that clones an existing config. Here is the pattern to follow:

**Step 1 — the test file already has the app and mocks set up.** You only need to write the test body. No new boilerplate.

```ts
describe('POST /api/configs/:id/duplicate', () => {
  it('creates a copy with "(copy)" appended to the name', async () => {
    // Arrange — create the original
    const original = await request.post('/api/configs').send(validConfig);
    const id = original.body.data.id as string;

    // Act
    const res = await request.post(`/api/configs/${id}/duplicate`);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('My Load Test (copy)');
    expect(res.body.data.id).not.toBe(id); // must be a new document
  });

  it('returns 404 when the source config does not exist', async () => {
    const res = await request.post('/api/configs/000000000000000000000001/duplicate');
    expect(res.status).toBe(404);
  });
});
```

**Step 2 — data isolation is automatic.** The `afterEach` in `setup.ts` clears all collections after every test, so the document you created in the first test is gone before the second test runs. You do not need to clean up manually.

**Step 3 — BullMQ and Redis are already mocked.** If your new endpoint touches the queue, `testQueue.add` returns `{ id: 'mock-job-id' }` automatically.

**Step 4 — adding a test for a new worker utility follows the same pattern as `request.executor.test.ts`.** Stub the global or pass a mock object into the constructor, call the function, assert on the result or the mock's call history.

---

### Scenario 8 — "How do I test retry logic without making real network calls?"

Retry behaviour is controlled by the `retriesLeft` parameter passed recursively to `executeRequest`. Testing it is a matter of controlling the mock's resolved/rejected sequence:

```ts
it('retries twice then succeeds on the third attempt', async () => {
  mockFetch
    .mockRejectedValueOnce(new Error('timeout'))     // attempt 1 fails
    .mockRejectedValueOnce(new Error('timeout'))     // attempt 2 fails
    .mockResolvedValueOnce({ status: 200 } as Response); // attempt 3 succeeds

  const result = await executeRequest(endpoint, 5000, 2); // 2 retries = 3 total attempts

  expect(mockFetch).toHaveBeenCalledTimes(3);
  expect(result.statusCode).toBe(200);
});

it('does not retry a timeout abort', async () => {
  // AbortError is what AbortController fires when the timeout hits
  mockFetch.mockRejectedValueOnce(
    new DOMException('The operation was aborted', 'AbortError')
  );

  const result = await executeRequest(endpoint, 5000, 5); // 5 retries available

  expect(mockFetch).toHaveBeenCalledTimes(1); // no retry happened
  expect(result.statusCode).toBe(0);
});
```

The key insight: `retriesLeft` is the number of additional attempts after the first failure. Passing `retriesLeft = 2` means up to 3 total `fetch` calls. The test verifies this by asserting on `mockFetch.mock.calls.length` — if the retry loop is broken (e.g. it retries too many or too few times), the call count assertion catches it.

---

## CI

Tests run automatically on every push to `main` and `develop` and on pull requests targeting `main`. The `Lint & Typecheck` job must pass before the `Docker Build Validation` job runs.

See `.github/workflows/ci.yml` for the full pipeline.

Tests run automatically on every push to `main` and `develop` and on pull requests targeting `main`. The `Lint & Typecheck` job must pass before the `Docker Build Validation` job runs.

See `.github/workflows/ci.yml` for the full pipeline.
