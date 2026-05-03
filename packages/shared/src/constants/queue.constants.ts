export const QUEUE_NAMES = {
  TEST_EXECUTION: 'test-execution',
} as const;

export const JOB_NAMES = {
  EXECUTE_TEST: 'execute-test',
} as const;

export const REDIS_CHANNELS = {
  METRICS_WINDOW: (runId: string) => `metrics:${runId}`,
  REQUEST_LOG: (runId: string) => `logs:${runId}`,
  RUN_STATUS: (runId: string) => `status:${runId}`,
} as const;

export const METRICS_EMIT_INTERVAL_MS = 500;
