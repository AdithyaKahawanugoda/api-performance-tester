import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@api-perf/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    globalSetup: './src/__tests__/global.setup.ts',
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000,
  },
});
