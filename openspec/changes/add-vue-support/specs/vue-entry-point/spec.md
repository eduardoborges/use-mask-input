## ADDED Requirements

### Requirement: Vue subpath entry point

The package SHALL expose a `use-mask-input/vue` subpath export, built as a distinct entry alongside `.` and `./antd`, emitting ESM and CJS output with accompanying type declarations.

#### Scenario: Importing the Vue entry from an ESM consumer

- **WHEN** a Vue 3 application imports `{ vMaskInput, useMaskInput }` from `use-mask-input/vue`
- **THEN** both bindings resolve from `dist/vue.mjs` with types from `dist/vue.d.mts`

#### Scenario: Importing the Vue entry from a CJS consumer

- **WHEN** a CommonJS consumer calls `require('use-mask-input/vue')`
- **THEN** the exports resolve from `dist/vue.cjs` with types from `dist/vue.d.cts`

#### Scenario: Existing entries are unaffected

- **WHEN** the package is built after the Vue entry is added
- **THEN** `dist/index.mjs` and `dist/antd.mjs` still export their previous public surface unchanged

### Requirement: No React in the Vue bundle

The Vue entry SHALL NOT import, reference, or require `react` or `react-dom` at runtime, so that a Vue application never pulls React into its bundle or its install graph.

#### Scenario: Built Vue bundle contains no React import

- **WHEN** the emitted `dist/vue.mjs` and `dist/vue.cjs` are scanned for module specifiers
- **THEN** neither file contains an import of or require of `react` or `react-dom`

#### Scenario: Vue types do not reference React types

- **WHEN** `dist/vue.d.mts` is type-checked in a project with no `@types/react` installed
- **THEN** it resolves without error

### Requirement: Framework peer dependencies are optional

`react`, `react-dom`, `vue`, `vee-validate`, and `antd` SHALL all be declared optional peer dependencies, so that installing the package for one framework does not warn about the others.

#### Scenario: Vue-only install produces no React warning

- **WHEN** a project with `vue` but not `react` installs the package
- **THEN** the package manager reports no missing-peer-dependency warning for `react` or `react-dom`

#### Scenario: React-only install produces no Vue warning

- **WHEN** a project with `react` and `react-dom` but not `vue` installs the package
- **THEN** the package manager reports no missing-peer-dependency warning for `vue` or `vee-validate`

### Requirement: Vue entry is SSR-safe

The Vue entry SHALL be importable and usable in a server-rendering environment where `window` is undefined, without throwing, matching the existing `isServer` no-op contract of the React entry.

#### Scenario: Composable on the server

- **WHEN** `useMaskInput` is called during server-side rendering
- **THEN** it returns without throwing, and its returned ref callback is a no-op whose `unmaskedValue()` returns an empty string

#### Scenario: Directive during server rendering

- **WHEN** a template using `v-mask-input` is rendered by `@vue/server-renderer`
- **THEN** rendering completes without throwing and without emitting an unhandled-custom-directive warning
