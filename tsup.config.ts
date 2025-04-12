import {defineConfig} from 'tsup';


export default defineConfig({
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
  onSuccess: async () => {
    console.log('Build completed successfully!');
    console.log('You can now publish your package to npm.');
  }
});