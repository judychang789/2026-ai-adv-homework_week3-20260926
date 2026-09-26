import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.js'],
    fileParallelism: false,
    sequence: { concurrent: false },
    hookTimeout: 15000,
    testTimeout: 15000,
  },
});
