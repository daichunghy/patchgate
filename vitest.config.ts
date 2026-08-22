import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest CLI filters match by path substring, so a stale dist/test build
    // would otherwise run alongside the TypeScript sources.
    exclude: ['**/node_modules/**', '**/dist/**'],
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
