# API Performance Tester

A load testing platform similar to k6 Cloud or Loader.io. You define an HTTP endpoint configuration, trigger a test run, and get real-time latency metrics, request logs, and per-endpoint stats streamed to the browser over WebSocket.

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
                                               fetch() to target URLs
                                               collect latency/status
                                               publish metrics windows
                                               write results to MongoDB
```

### How a test run works

1. Client POSTs to `/api/runs` with a config ID.
2. Backend creates a `TestRun` document in MongoDB and enqueues N BullMQ jobs, one per worker slot.
3. Each worker job runs a request loop: selects an endpoint by weighted random, calls it with `fetch()`, records latency and status code.
4. Workers publish 500ms metric windows to `metrics:{runId}` on Redis pub/sub.
5. The backend WebSocket broadcaster subscribes to `metrics:*` and `status:*` channels and forwards messages to clients in the matching room.
6. When all worker jobs complete, the backend aggregates results (percentiles, rps, per-endpoint stats) and writes final metrics to MongoDB.
7. A `cancel:{runId}` key in Redis lets workers break out of the loop mid-run.

### Metrics aggregation

Workers return raw latency arrays and per-URL stats. The backend computes:

- p50, p95, p99 using a sort-based percentile function from `@api-perf/shared`
- RPS from total requests divided by wall-clock duration across all workers
- Peak RPS estimated from the highest observed 500ms window
- Per-endpoint success/failure counts and p99 latency

## Monorepo structure

```
apps/
  backend/    Express 5 API server + WebSocket + BullMQ producer
  worker/     BullMQ consumer, runs the actual HTTP load
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

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, Tailwind CSS, shadcn/ui, Recharts 2, Zustand 5, TanStack Query 5 |
| Backend | Node.js 22, Express 5, Pino 9, Zod 3, ws |
| Queue | BullMQ 5, ioredis 5 |
| Database | MongoDB 7, Mongoose 8 |
| Infra | Redis 7, Docker Compose |
| Monorepo | Turborepo 2, pnpm 9 |

All packages use CommonJS modules.

## Running locally

### 1. Start infra

Requires Docker.

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts MongoDB on port 27017 and Redis on port 6379 with the dev passwords from `.env.example`.

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up env files

Copy `.env.example` into each service directory:

```bash
cp .env.example apps/backend/.env
cp .env.example apps/worker/.env
```

The frontend `apps/frontend/.env.local` is committed with default dev values — no action needed.

### 4. Start the services

```bash
pnpm dev
```

Turbo runs all three apps in parallel:

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api
- Worker: connects to the BullMQ queue automatically

## Running with Docker (production)

```bash
docker compose up
```

Builds and starts all five services. Worker runs with 3 replicas and 50 concurrency each, giving 150 concurrent request slots.

Set `MONGO_PASSWORD` and `REDIS_PASSWORD` env vars before running, or the compose file falls back to `changeme`.

## Environment variables

### Backend (`apps/backend/.env`)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection URL with password |
| `PORT` | HTTP server port (default 4000) |
| `NODE_ENV` | `development` or `production` |
| `LOG_LEVEL` | Pino log level (`debug`, `info`, etc.) |
| `CORS_ORIGIN` | Allowed CORS origin |

### Worker (`apps/worker/.env`)

| Variable | Description |
|---|---|
| `REDIS_URL` | Redis connection URL (same as backend) |
| `WORKER_CONCURRENCY` | Concurrent jobs per worker process (default 50) |

### Frontend (`apps/frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend REST API base URL |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket URL |

## API

All responses follow `{ success: boolean, data?, error? }`.

```
GET    /api/health
GET    /api/configs
POST   /api/configs
GET    /api/configs/:id
PATCH  /api/configs/:id
DELETE /api/configs/:id

POST   /api/runs                    start a run
GET    /api/runs                    list runs (filter: status, configId)
GET    /api/runs/:id
POST   /api/runs/:id/cancel
GET    /api/runs/compare?ids=a,b,c  compare 2-4 runs

GET    /api/runs/:id/metrics
GET    /api/runs/:id/logs
GET    /api/runs/:id/export/csv
GET    /api/runs/:id/export/pdf

POST   /api/import/openapi          import endpoints from an OpenAPI spec
```

Pagination is supported on list endpoints via `page` and `pageSize` query params. Validation is handled by Zod on all write endpoints.

## WebSocket

Connect to `ws://localhost:4000/ws?runId={id}`. The server sends JSON messages while the run is active:

```
{ type: "METRICS_WINDOW",  payload: MetricsWindow }
{ type: "WORKER_PROGRESS", payload: { runId, workerId, completed, total } }
{ type: "RUN_COMPLETED",   payload: { runId, metrics } }
{ type: "RUN_FAILED",      payload: { runId, error } }
```

`METRICS_WINDOW` arrives roughly every 500ms per worker and contains the latency percentiles and RPS for that window.

## CI

GitHub Actions runs on push to `main` and `develop`:

1. Typechecks all packages (`pnpm typecheck`)
2. Builds backend and worker Docker images
3. Spins up the dev compose stack and hits `/api/health` as a smoke test
