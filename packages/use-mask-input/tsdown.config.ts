/* eslint-disable import-x/no-extraneous-dependencies */
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
  clean: true,
});
