import { readPackageSync } from 'read-pkg';
import esbuild from 'rollup-plugin-esbuild';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';
import resolve from '@rollup/plugin-node-resolve';

const pkg = readPackageSync();

const input = 'src/index.tsx';
const external = Object.keys({ ...pkg.peerDependencies });
const sourcemap = true;
const exports = 'named';
const out = 'dist/index';

/** @type import('rollup').RollupOptions[] */
export default [
  {
    input,
    external,
    plugins: [
      commonjs(),
      resolve(),
      esbuild({
        sourceMap: sourcemap,
      }),
    ],
    output: [
      {
        file: `${out}.js`,
        format: 'esm',
        sourcemap,
        exports,
      },
      {
        file: `${out}.cjs`,
        format: 'cjs',
        sourcemap,
        exports,
        name: pkg.name,
      },
    ],
  },
  {
    input,
    output: [{ file: `${out}.d.ts`, format: 'es' }],
    plugins: [dts()],
  },
];
