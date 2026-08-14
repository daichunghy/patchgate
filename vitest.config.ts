import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'dist/**',
        'node_modules/**',
        'scripts/**',
        'fixtures/**'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75
      }
    }
  }
});
