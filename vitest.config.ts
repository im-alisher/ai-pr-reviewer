import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@ai-pr-reviewer/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@ai-pr-reviewer/github-client': path.resolve(
        __dirname,
        'packages/github-client/src/index.ts',
      ),
      '@ai-pr-reviewer/ai-review-engine': path.resolve(
        __dirname,
        'packages/ai-review-engine/src/index.ts',
      ),
      '@ai-pr-reviewer/patch-generator': path.resolve(
        __dirname,
        'packages/patch-generator/src/index.ts',
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'apps/api/src/**/*.ts'],
    },
  },
});
