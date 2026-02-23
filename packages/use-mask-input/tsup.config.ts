/* eslint-disable import-x/no-extraneous-dependencies */
import { defineConfig } from 'tsup';

const args = process.argv.slice(2);

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
  splitting: true,
  clean: true,
  bundle: true,
  watch: args.includes('--watch'),
});
