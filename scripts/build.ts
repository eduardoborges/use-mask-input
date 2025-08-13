#!/usr/bin/env tsx

import { build } from 'tsup';

await build({
  cjsInterop: true,
  entry: ['src/index.ts', 'src/react.ts'],
  format: ['esm', 'cjs'],
  globalName: 'useMaskInput',
  minify: true,
  outDir: 'dist',
  sourcemap: true,
  splitting: true,
  target: 'es2020',
  dts: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', 'react/jsx-runtime'],
});

console.log('\n✅ Build completed successfully!');
console.log('🎉 You can now publish your package to npm.');
console.log('--------------------------------------------');

