## 1. Dependencies and scaffolding

- [x] 1.1 Add devDependencies: `vue@^3.5`, `vee-validate@^4.15`, `@vue/test-utils`, `@vue/server-renderer`, `@vitest/browser@4.1.10`, `playwright`
- [x] 1.2 Add `vue` and `vee-validate` to `peerDependencies`, and mark `react`, `react-dom`, `vue`, `vee-validate`, `antd` all optional in `peerDependenciesMeta`
- [x] 1.3 Create `src/vue/` and add `vue: 'src/vue/index.ts'` to the `entry` map in `tsdown.config.ts`, with `vue` added to `external`
- [x] 1.4 Add the `./vue` export map entry to `package.json` mirroring the shape of `./antd`
- [x] 1.5 Verify `pnpm --filter=use-mask-input build` emits `dist/vue.mjs`, `dist/vue.cjs`, and both declaration files

## 2. Test infrastructure

- [x] 2.1 Split `vitest.config.ts` into two projects: `unit` (jsdom, all existing specs plus `src/vue/**/*.spec.ts`) and `browser` (Playwright/Chromium, `src/vue/**/*.browser.spec.ts`)
- [x] 2.2 Confirm the existing ~60 jsdom specs still run and pass unchanged under the `unit` project
- [x] 2.3 Add a `test:browser` script; keep `test` running the jsdom project so the default loop stays fast
- [x] 2.4 Add `playwright install --with-deps chromium` and a browser test step to `.github/workflows/ci.yml`
- [ ] 2.5 SKIPPED: a second Codecov flag for the browser project. It is a pass/fail gate, not a coverage source, and merging two coverage runs is not worth the config. Revisit if browser specs grow.

## 3. Core Vue plumbing

- [x] 3.1 Create `src/vue/types.ts` with Vue-local types (`VueMaskBinding`, `MaskRefTarget`), importing only from `vue` and `src/types/inputmask.types` — never from `src/types/index.ts`, which pulls `react-hook-form`
- [x] 3.2 Implement `src/vue/resolveVueElement.ts`: pass native elements through, unwrap component instances via `$el`, return `null` for `null` and for non-element `$el` (fragment roots are out of scope per design decision 6), then delegate to the existing `findInputElement`
- [x] 3.3 Implement `src/vue/applyMask.ts` — normalises the binding value (string | string[] | `{ mask, options }` | null) into `(mask, options)` and calls `applyMaskToElement`, guarded by `isServer`. This is the single implementation both surfaces route through
- [x] 3.4 Write `src/vue/resolveVueElement.spec.ts` covering native element, single-root wrapper, `$el` that is the input itself, non-element `$el`, textarea, and no maskable element
- [x] 3.5 Confirm `src/core/elementResolver.ts` and `src/core/maskEngine.ts` remain untouched and the existing React/antd specs still pass

## 4. Directive

- [x] 4.1 Implement `src/vue/directive.ts` — `mounted` applies the mask; `updated` compares `makeMaskCacheKey` plus a shallow options comparison and returns early when unchanged; `unmounted` calls `el.inputmask?.remove()`; `getSSRProps` returns `{}`
- [x] 4.2 Write `src/vue/directive.spec.ts` (jsdom, no keyboard): mask instance is installed on mount for alias / raw pattern / options / array / null mask, and alias defaults are overridden by user options
- [x] 4.3 Test the `updated` guard both ways: `'cpf'` → `'cnpj'` re-applies; an unchanged binding does not re-apply
- [x] 4.4 Test that unmount removes the `inputmask` instance
- [x] 4.5 Test the directive on a wrapper component, confirming it reaches the inner `<input>`

## 5. Composable

- [x] 5.1 Implement `src/vue/useMaskInput.ts` returning `{ maskRef, unmaskedValue }`, delegating to `resolveVueElement` and `applyMask`, with an `isServer` no-op branch
- [x] 5.2 Write `src/vue/useMaskInput.spec.ts`: binding masks the element, `unmaskedValue()` returns the raw value, calling it before mount returns `''`, and a `null` ref callback clears state without throwing
- [x] 5.3 Test the composable bound to a wrapper component
- [x] 5.4 Test that the directive and the composable produce identical resolved Inputmask configuration for the same mask and options

## 6. Entry point

- [x] 6.1 Write `src/vue/index.ts` exporting `vMaskInput`, `useMaskInput`, and the Vue types — no plugin (design decision 9's naming note: `<script setup>` resolves `vMaskInput` to `v-mask-input` with no registration)
- [x] 6.2 Confirm `pnpm --filter=use-mask-input type-check` passes
- [x] 6.3 Add a build assertion (`scripts/assert-entry-isolation.mjs`, wired into `postbuild`) that fails if `dist/vue.mjs` or `dist/vue.cjs` reaches `react`, `react-dom` or `vee-validate` — transitively, so shared chunks count. Verified against injected leaks in all three import shapes
- [x] 6.4 Confirm `dist/index.mjs` and `dist/antd.mjs` still export their previous surface unchanged

## 7. SSR

- [x] 7.1 Write `src/vue/useMaskInput-server.spec.ts` — composable returns a no-op ref whose `unmaskedValue()` is `''`
- [x] 7.2 Write `src/vue/directive-server.spec.ts` — `@vue/server-renderer` renders without throwing and without an unhandled-custom-directive warning

## 8. Browser tests (the parts jsdom cannot prove)

- [x] 8.1 Real typing through an alias mask: type `12345678901` into a `'cpf'`-masked input, assert the display is `123.456.789-01`
- [x] 8.2 Real typing through a raw pattern and through an array of patterns
- [x] 8.3 Caret position is preserved after mid-value insertion, and after an unrelated re-render with the binding unchanged
- [x] 8.4 `maxlength` behaviour without jsdom's `ontouchstart` distortion: a `'cpf'`-masked input accepts the full value, a `'numeric'`-masked input keeps its cap
- [x] 8.5 `autoUnmask` round-trip through `v-model`: display stays masked while the bound model holds the unmasked value
- [x] 8.6 The #193 sequence for real: set a value programmatically, select all, delete, retype — assert the first deletion registers and the retyped value masks correctly
- [x] 8.7 Directive order does not matter — `v-model` before and after `v-mask-input` produce identical results (design decision 3)

## 9. vee-validate (the tests are the spike)

- [x] 9.1 Write `src/vue/veeValidate.browser.spec.ts`: typing updates `field.value` and marks the field dirty
- [x] 9.2 Test that `handleSubmit` and the validation schema both receive the unmasked value while the display stays masked
- [x] 9.3 Test validation lifecycle: incomplete value populates `errorMessage`, completing it clears the message, blur triggers validation
- [x] 9.4 **Test `clearMaskOnLostFocus` against blur-time validation** — the design's most likely failure and the main remaining path to a helper
- [x] 9.5 Test programmatic updates: `setValue` renders the masked display, `resetForm` restores the initial masked display
- [x] 9.6 Verify vee-validate stays optional — a Vue consumer without it can import the directive and composable with no vee-validate resolution attempted
- [x] 9.7 **Decide from the results**: all green means documentation only and no code ships. Any red scopes `src/vue/veeValidate.ts` to exactly what failed. Record the outcome in `design.md` Open Questions

## 10. Smoke-test app

- [x] 10.1 Scaffold `apps/vue-project` with the official Vite + Vue 3 + TypeScript template, keeping dependencies at scaffold versions per the repo's demo-app rule
- [x] 10.2 Alias `use-mask-input` to `packages/use-mask-input/src` in `vite.config.ts` and `tsconfig.app.json`, matching the existing apps
- [x] 10.3 Build a demo page exercising the directive, the composable, a wrapper component, and a vee-validate form
- [x] 10.4 Add a `dev:vue` script to the root `package.json`
- [x] 10.5 Confirm `pnpm build` and `pnpm lint` fan out to the new app

## 11. Docs and release

- [x] 11.1 Add a Vue section to the root `README.md`: the `use-mask-input/vue` import path, the directive, the composable, and the vee-validate pattern
- [x] 11.2 Document the three accepted limitations — `unmaskedValue()` does not work in templates, `noValuePatching: true` is unsupported, and options must be replaced rather than mutated
- [x] 11.3 Add Vue documentation pages to `apps/docussaurus`
- [x] 11.4 Record the maintenance policy in `CLAUDE.md`: `core/` fixes serve both frameworks and are made once; binding bugs in `src/api` and `src/vue` are fixed where reported, with no obligation to mirror
- [x] 11.5 Add `vue`, `vue-mask`, and `vee-validate` to `keywords` in both `package.json` files
- [x] 11.6 Write a **minor** changeset
- [x] 11.7 Run `/check` plus the browser suite and confirm green, including that existing React, antd, RHF, and TanStack specs are unaffected
- [ ] 11.8 Open a follow-up issue for backfilling React browser tests, referencing design decision 8
- [ ] 11.9 Open the PR with a semantic title (`feat: add Vue 3 support via use-mask-input/vue`)
