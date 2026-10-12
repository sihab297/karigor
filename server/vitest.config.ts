import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://not-used-in-tests',
      JWT_SECRET: 'test-only-secret-that-is-at-least-32-characters',
    },
  },
});
