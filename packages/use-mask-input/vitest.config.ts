/* eslint-disable import-x/no-extraneous-dependencies */
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/**
 * Two projects, because jsdom cannot prove some of what this library does.
 *
 * `unit` is the whole pre-existing suite plus everything that needs no
 * keyboard: configuration, element resolution, and Vue's mount/update/unmount
 * lifecycle.
 *
 * `browser` is deliberately small and covers only what jsdom demonstrably gets
 * wrong. jsdom reports `ontouchstart`, so Inputmask takes its mobile path and
 * clears `maxlength` itself (see maxLength.spec.ts); caret and selection APIs
 * are approximations; and simulated keystrokes do not round-trip through the
 * engine the way a real browser does. Those cases live in `*.browser.spec.ts`.
 */
export default defineConfig({
  test: {
    reporters: ['junit', 'json', 'verbose'],
    outputFile: {
      junit: './coverage/junit-report.xml',
      json: './coverage/json-report.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '/**/index.{ts,tsx}',
        'node_modules/',
        'dist/',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/types/**',
      ],
    },
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.spec.{ts,tsx}'],
          exclude: ['src/**/*.browser.spec.ts'],
        },
      },
      {
        // The full build, so `template` strings compile at runtime and the
        // specs exercise the real `v-model` the compiler emits rather than a
        // hand-wired approximation of it.
        resolve: {
          alias: { vue: 'vue/dist/vue.esm-bundler.js' },
        },
        test: {
          name: 'browser',
          include: ['src/**/*.browser.spec.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            screenshotFailures: false,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
