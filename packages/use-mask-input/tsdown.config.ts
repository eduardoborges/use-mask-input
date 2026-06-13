/* eslint-disable import-x/no-extraneous-dependencies */
import { codecovRollupPlugin } from '@codecov/rollup-plugin';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.tsx',
    antd: 'src/antd/index.ts',
  },
  outDir: 'dist',
  format: ['esm', 'cjs'],
  target: 'es2022',
  external: ['react', 'react-dom'],
  dts: true,
  sourcemap: true,
  noExternal: ['inputmask'],
  treeshake: true,
  minify: true,
  clean: true,
  plugins: [
    // Uploads bundle stats to Codecov. No-ops locally; only active in CI
    // where CODECOV_TOKEN is set, so local builds stay offline.
    codecovRollupPlugin({
      enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
      bundleName: 'use-mask-input',
      uploadToken: process.env.CODECOV_TOKEN,
      gitService: 'github',
    }),
  ],
});
