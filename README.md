# API Performance Tester

A full-stack load testing platform — define HTTP endpoint configurations, trigger test runs, and get real-time latency metrics, TTFB, response sizes, system resources, and per-endpoint stats streamed to the browser over WebSocket.

## Features

### Test Configuration
- Define one or more HTTP endpoints per config (GET, POST, PUT, PATCH, DELETE)
- Assign per-endpoint **traffic weights** to simulate realistic traffic distributions
- Set concurrency, total requests, timeout, and retry limits
- Optional **Capture Response Size** toggle — drains response bodies to measure payload sizes (off by default to avoid throughput overhead)
- Import endpoints directly from an **OpenAPI / Swagger spec** (JSON or YAML)

### Test Execution
- Real-time progress streamed over **WebSocket** at 500ms windows
- Live latency (p50, p95, p99), RPS, and error rate charts update as the run progresses
- Cancel a running test at any time
- Automatic retry on transient failures per configured retry limit

### Results & Analytics

**KPI cards**
- Total Requests, Success, Failures, Error Rate, Avg RPS, Duration
- Avg TTFB and Total Data Received (when available)

**Charts (all click-to-zoom)**
- Latency over time (p50 / p95 / p99 lines)
- RPS over time
- Error Rate over time
- TTFB Breakdown by Endpoint (stacked TTFB vs body download bars)
- Response Size by Endpoint (color-coded by size threshold)
- System Resources — CPU % and heap memory over the test window

**Latency Percentiles card**
- p50, p75, p95, p99 bar visualisation
- Min / Max / Avg / Avg RPS grid
- Latency Breakdown section (TTFB vs body download when TTFB data is available)

**Status Code Distribution** — pie/ring chart of 2xx/3xx/4xx/5xx/timeout responses

**Endpoints table** — per-endpoint Avg Latency, Avg TTFB, Avg Response Size, Cache Hit %, p99, Success/Failure counts

**Error Samples** — captured response bodies from 4xx/5xx requests (up to 5 per endpoint)

**Config Analysis tab** — auth type detection, payload size, query parameters, and traffic weight distribution per endpoint

### Insights
Auto-generated, collapsible insights panel (collapsed by default) covering:
- Reliability verdict (error rate assessment with threshold guidance)
- Tail latency consistency (p99/p50 ratio)
- Throughput summary
- Slowest and fastest endpoint breakdown
- TTFB proportion analysis (server bottleneck vs body transfer dominated)
- Large response detection (>50 KB)
- Cache effectiveness (hit rate from CDN headers)
- Worker memory pressure

Each insight includes a **footnote** explaining any technical term used (TTFB, p99/p50, RPS, GC, cache hit, error rate).

### Run Management
- Runs list with status filtering and search
- **Bulk select** and delete multiple runs at once
- **Compare up to 4 runs** side-by-side — latency bar chart, full metrics table (including TTFB and avg response size), and comparative insights panel
- Export any run as **CSV** or **PDF**

---

## Architecture

```
Browser
  |
  +-- HTTP (REST)  --> Express backend (port 4000)
  +-- WebSocket    --> ws server (same port, /ws upgrade)
                         |
                         +-- publishes jobs --> BullMQ queue (Redis)
                         +-- subscribes      <-- Redis pub/sub (metrics:*, status:*)
                                                       ^
                                               Worker processes
                                               (3 replicas x 50 concurrency)
                                                       |
                                               undici HTTP client
                                               collect latency, TTFB,
                                               response size, cache status
                                               publish metrics windows
                                               write results to MongoDB
```

### How a test run works

1. Client POSTs to `/api/runs` with a config ID.
2. Backend creates a `TestRun` document in MongoDB and enqueues N BullMQ jobs (one per worker slot).
3. Each worker runs a request loop: selects an endpoint by weighted random, calls it with `undici.request()`, records latency, TTFB, response size, cache status, and error body.
4. Workers publish 500ms metric windows (including CPU %, heap memory, TTFB) to `metrics:{runId}` on Redis pub/sub.
5. The backend WebSocket broadcaster subscribes to `metrics:*` and `status:*` channels and forwards messages to connected clients.
6. When all worker jobs complete, the backend aggregates results — percentiles, RPS, per-endpoint stats, peak memory, avg CPU — and persists final metrics to MongoDB.
7. A `cancel:{runId}` key in Redis lets workers exit their loop mid-run.

### Metrics collected per request

| Metric | Source |
|---|---|
| Total latency | `performance.now()` before and after full request |
| TTFB | `performance.now()` from call to `undici.request()` resolve (resolves on headers) |
| Response size | `Content-Length` header; body drain if absent and `captureResponseSize: true` |
| Cache status | `X-Cache`, `CF-Cache-Status`, `X-Cache-Status` response headers |
| Error body | First 500 chars of 4xx/5xx response body |
| Server header | `Server` response header |
| CPU % | `process.cpuUsage()` delta per 500ms window |
| Heap memory | `process.memoryUsage().heapUsed` per 500ms window |

### Metrics aggregation

Workers return raw latency arrays, TTFB arrays, response size arrays, and per-URL stats. The backend computes:

- p50, p95, p99 using a sort-based percentile function from `@api-perf/shared`
- RPS from total requests divided by wall-clock duration across all workers
- Per-endpoint avg latency, avg TTFB, p99, avg response bytes, cache hit rate, error samples
- Run-level avg TTFB, p95 TTFB, peak memory MB, avg CPU %
- `bytesReceived` = sum of all response sizes across the run

---

## Monorepo structure

```
apps/
  backend/    Express 5 API server + WebSocket + BullMQ producer
  worker/     BullMQ consumer — undici HTTP client, metrics collection
  frontend/   Next.js 15 dashboard
packages/
  shared/     Zod schemas, TypeScript types, stat utilities
docker/
  backend.Dockerfile
  worker.Dockerfile
  frontend.Dockerfile
docker-compose.yml         production
docker-compose.dev.yml     local infra only (Mongo + Redis)
```

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, Zustand 5, TanStack Query 5, React Hook Form |
| Backend | Node.js 22, Express 5, Pino 9, Zod 3, ws |
| HTTP client | undici (Node 18+ built-in, used for TTFB timing) |
| Queue | BullMQ 5, ioredis 5 |
| Database | MongoDB 7, Mongoose 8 |
| Infra | Redis 7, Docker Compose |
| Monorepo | Turborepo 2, pnpm 9 |
| Testing | Vitest (worker + shared), Supertest (backend) |

---

## Running locally

### 1. Start infra

Requires Docker.

```bash
docker compose -f docker-compose.dev.yml up -d
```

Starts MongoDB on port 27017 and Redis on port 6379 with the dev passwords from `.env.example`.

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up env files

```bash
cp .env.example apps/backend/.env
cp .env.example apps/worker/.env
```

`apps/frontend/.env.local` is committed with default dev values — no action needed.

### 4. Start all services

```bash
pnpm dev
```

Turbo runs all three services in parallel:

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:4000/api |
| Worker | connects to BullMQ queue automatically |

---

## Running with Docker (production)

```bash
docker compose up
```

Builds and starts all five services. Worker runs with 3 replicas at 50 concurrency each — 150 concurrent request slots total.

Set `MONGO_PASSWORD` and `REDIS_PASSWORD` before running, or the compose file falls back to `changeme`.

---

## Environment variables

### Backend (`apps/backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | — | MongoDB connection string |
| `REDIS_URL` | — | Redis connection URL |
| `PORT` | `4000` | HTTP server port |
| `NODE_ENV` | `development` | `development` or `production` |
| `LOG_LEVEL` | `info` | Pino log level |
| `CORS_ORIGIN` | `http://localhost:3001` | Allowed CORS origin |

### Worker (`apps/worker/.env`)

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | — | Redis connection URL (same as backend) |
| `WORKER_CONCURRENCY` | `50` | Concurrent jobs per worker process |

### Frontend (`apps/frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Backend REST API base URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:4000/ws` | Backend WebSocket URL |

---

## API reference

All responses follow `{ success: boolean, data?, error? }`.

```
GET    /api/health

GET    /api/configs
POST   /api/configs
GET    /api/configs/:id
PATCH  /api/configs/:id
DELETE /api/configs/:id

POST   /api/runs                      start a run
GET    /api/runs                      list runs (filter: status, configId)
GET    /api/runs/:id
POST   /api/runs/:id/cancel
GET    /api/runs/compare?ids=a,b,c    compare 2–4 runs

GET    /api/runs/:id/metrics
GET    /api/runs/:id/logs
GET    /api/runs/:id/export/csv
GET    /api/runs/:id/export/pdf

POST   /api/import/openapi            import endpoints from OpenAPI spec
```

Pagination on list endpoints: `?page=1&pageSize=20`. All write endpoints are validated by Zod.

---

## WebSocket protocol

Connect to `ws://localhost:4000/ws?runId={id}`. Messages while the run is active:

```
{ type: "METRICS_WINDOW",  payload: RunWindow }
{ type: "WORKER_PROGRESS", payload: { runId, workerId, completed, total } }
{ type: "RUN_COMPLETED",   payload: { runId, metrics } }
{ type: "RUN_FAILED",      payload: { runId, error } }
```

`METRICS_WINDOW` arrives roughly every 500ms per worker and includes latency percentiles, RPS, error rate, avg TTFB, avg response bytes, CPU %, and heap memory MB for that window.

---

## CI

GitHub Actions runs on push to `main` / `develop` and on pull requests to `main`:

1. **Lint & Typecheck** — `pnpm typecheck` across all packages
2. **Docker Build Validation** — builds backend and worker images with Buildx
3. **Integration Smoke Test** — spins up the dev compose stack and hits `/api/health`
