import { defineConfig } from 'vitest/config';
import { TEST_ENV } from './test/env.js';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    env: TEST_ENV,
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    fileParallelism: false,
  },
});
