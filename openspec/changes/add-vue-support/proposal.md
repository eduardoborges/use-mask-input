## Why

`use-mask-input` solves input masking well, but only for React. The part that does the actual work — `src/core` (alias config, mask engine, element resolution) — has no React in it; only `src/api` and `src/types` are React-coupled. A Vue 3 consumer today has to reach for a different library and a different alias vocabulary, while ~80% of what they need is already sitting in this package unused.

Vue's form ecosystem also has a clear leader (vee-validate, v4.15) with no first-class mask story, mirroring the React Hook Form integration that made this library worth using in the first place.

## What Changes

- **New `use-mask-input/vue` subpath entry** (`src/vue/`), alongside the existing `use-mask-input/antd` precedent. No new npm package, no core extraction — the Vue entry imports `src/core` directly.
- **`v-mask-input` directive** — the idiomatic Vue primitive, and the only thing that applies a mask. Accepts a mask string/array or `{ mask, options }`. Unlike the React surface it gets real lifecycle: `updated` re-applies when the bound mask changes, `unmounted` tears down the Inputmask instance. Exported as `vMaskInput`, which `<script setup>` resolves to `v-mask-input` with no registration and no plugin.
- **`useMaskInput` composable** — returns a function ref plus `unmaskedValue()`, for imperative use and for reading the raw value when `autoUnmask` is off. Narrower than it first appears: the directive already covers wrapper components, because Vue applies directives to a component's root element and `applyMaskToElement` already does the `querySelector('input')` search.
- **vee-validate 4 support as documentation, not code.** `useField().value` bound with `v-model` reads through the property descriptor Inputmask installs on the element, so `autoUnmask: true` puts the unmasked value into field state with no glue. This is proven by tests rather than assumed — a `useVeeValidateMask` helper is added only if one goes red.
- **`react` and `react-dom` become optional peer dependencies**; `vue` and `vee-validate` are added as optional peers. Not breaking — it only removes an install-time warning for consumers who were never going to use the React entry.
- **Real-browser test layer** — `vitest` browser mode with Playwright, as a second vitest project. The existing 60 jsdom specs are untouched; roughly 8 new browser specs cover only what jsdom demonstrably lies about. The suite has never simulated a keystroke, deliberately — `optionsPassthrough.spec.ts` documents why, and `maxLength.spec.ts` documents jsdom reporting `ontouchstart`, which pushes Inputmask down its mobile path and makes the obvious assertion meaningless. Vue is the first target because it is the new, unproven code; React has three years of production use as its evidence. Backfilling React is a tracked follow-up.
- **New `apps/vue-project`** smoke-test app (Vite + Vue 3 + vee-validate), aliased to `src` like the existing consumer apps.

Non-goals for this change: a `<MaskInput>` component (`<input v-model="x" v-mask-input="…">` already does everything it would), a `useVeeValidateMask` helper unless a test demands it, fragment-root component resolution (Vue itself warns that directives do not work there), a Nuxt smoke-test app, Vue 2 / `@vue/composition-api`, and a Vue port of the Ant Design entry.

## Capabilities

### New Capabilities

- `vue-entry-point`: The `use-mask-input/vue` subpath — its build output, export surface, optional-peer contract, SSR safety, and the guarantee that importing it never pulls React into a Vue bundle.
- `vue-masking`: The Vue mask API surface — `v-mask-input` directive, `useMaskInput` composable, `<MaskInput>` component, the shared mask/options contract they accept, and element resolution through Vue component instances and wrapper components.
- `vue-vee-validate`: Integration with vee-validate 4 — value synchronisation between the Inputmask-controlled DOM and vee-validate's field state, validation triggering, and masked vs. unmasked submit values.

### Modified Capabilities

None. `openspec/specs/` is empty (OpenSpec was initialised as part of this change), so the existing React behaviour has no spec to delta against. The peer-dependency relaxation is captured under `vue-entry-point`.

## Impact

**Affected code**
- `packages/use-mask-input/src/vue/**` — new, and the only new runtime source.
- `packages/use-mask-input/tsdown.config.ts` — new `vue` entry, `vue` added to `external`.
- `packages/use-mask-input/package.json` — `./vue` export map, `peerDependenciesMeta`, Vue devDependencies, browser-test script.
- `packages/use-mask-input/vitest.config.ts` — split into two projects (`unit` on jsdom, `browser` on Playwright).
- `.github/workflows/ci.yml` — a `playwright install --with-deps chromium` step and a second coverage flag.
- `CLAUDE.md` — the maintenance policy below.

No existing runtime source file is modified. `src/core/elementResolver.ts` and `src/core/maskEngine.ts` were both expected to change and neither needs to; see design decisions 5 and 6.

**Dependencies**
- New devDeps: `vue@^3.5`, `vee-validate@^4.15`, `@vue/test-utils`, `@vue/server-renderer`, `@vitest/browser@4.1.10` (pins `vitest: 4.1.10`, the installed version), `playwright`.
- New optional peers: `vue >=3.4`, `vee-validate >=4`.
- `inputmask` stays bundled (`noExternal`) — unchanged. tsdown already code-splits it into a shared, import-free chunk, so the Vue entry adds roughly 1 KB rather than another copy.

**Maintenance policy** (recorded in `CLAUDE.md`)
- Fixes in `src/core` serve both frameworks and are made once — this is what actually happened for #191 and #192.
- Binding-level bugs in `src/api` (React) and `src/vue` are independent and are fixed where reported. No obligation to mirror. #193 is the illustrative case: it is an RHF ref-ordering bug that the Vue directive cannot have.

**Docs & release**
- README + docs site gain a Vue section; changeset required (minor).
- CI fans out over the new app via Turbo automatically.

**Risk**
- Real-browser testing is new infrastructure for this repo and the largest single cost in the change.
- **Accepted, unmitigated:** nothing verifies that the published export map and `.d.mts` files resolve for a real consumer. The demo apps alias to `src`, not `dist`, so a wrong `types` path in the new `./vue` entry passes CI and surfaces only after publish. Tooling for this (`publint`, `@arethetypeswrong/cli`) was considered and declined.
- **Accepted, documented:** `unmaskedValue()` is a function, matching the React API. Calling it in a Vue template (`{{ unmaskedValue() }}`) renders once and never updates, because reading the DOM registers no reactive dependency. It is correct in event handlers and imperative code only.
