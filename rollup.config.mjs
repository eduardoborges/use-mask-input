/* eslint-disable import/no-extraneous-dependencies */

import { readPackageSync } from 'read-pkg';
import { swc } from 'rollup-plugin-swc3';
import dts from 'rollup-plugin-dts';

const pkg = readPackageSync();

const input = 'src/index.tsx';
const external = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });
const sourcemap = true;
const exports = 'named';
const out = 'dist/index';

/** @type import('rollup').RollupOptions[] */
export default [
  {
    input,
    external,
    plugins: [
      swc({ sourceMaps: sourcemap }),
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
      },
    ],
  },
  {
    input,
    output: [{ file: `${out}.d.ts`, format: 'es' }],
    plugins: [dts()],
  },
];
