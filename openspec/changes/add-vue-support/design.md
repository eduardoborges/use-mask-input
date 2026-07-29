## Context

`src/core` is already framework-agnostic: `maskConfig` (aliases), `maskEngine` (`createMaskInstance` / `formatWithMask` / `unformatWithMask` / `stripMaxLength` / `applyMaskToElement`), `elementResolver` (`isHTMLElement` / `findInputElement`), and `utils/isServer`. None of it imports React. Everything React-specific lives in `src/api`, `src/antd`, and `src/types/index.ts` (which imports types from `react` and `react-hook-form`).

`src/antd` is the working precedent for a secondary entry point: its own directory, its own `index.ts`, a `./antd` export map entry, a second `tsdown` entry, and an optional peer dependency.

The Vue entry therefore reuses `src/core` verbatim. The work is the Vue-shaped surface on top of it, plus the two places Vue behaves differently from React: template refs on components resolve to component *instances*, and `v-model` writes to the element after mount in a way that can desync Inputmask's internal buffer.

Four facts were verified against the bundled `inputmask@5.0.10-beta.61` and `vue@3.5.40` before writing this. Three of them removed work from the plan; the fourth is load-bearing for the whole design.

1. `el.inputmask.remove()` exists (`lib/inputmask.js:154`), as does the static `Inputmask.remove(elems)` (`:393`).
2. Inputmask already calls `el.inputmask.remove()` itself when masking an element that is already masked (`:101`).
3. **Inputmask replaces the element's `value` property with its own accessor** (`lib/mask.js:130-147`), unless `noValuePatching: true`. The getter returns `unmaskedvalue()` when `autoUnmask` is set (`mask.js:84-90`); the setter re-masks through the engine.
4. tsdown already code-splits: `dist/withMask-*.mjs` is a 91 KB chunk with Inputmask inlined and **zero imports**. React appears only in the leaf entries. A `vue` entry costs about 1 KB.

Fact 3 is why this design works at all. `v-model` and Inputmask are not two writers racing over `el.value` — they are the same accessor, and Inputmask owns it.

## Goals / Non-Goals

**Goals:**

- `use-mask-input/vue` importable in a Vue 3 app with zero React in the bundle and zero React in the install graph.
- One primitive (the directive), with the composable delegating to it, so mask semantics cannot drift between surfaces.
- Correct lifecycle: mask re-applies when the bound mask changes, tears down on unmount, and does *not* thrash on unrelated re-renders.
- vee-validate 4 that round-trips both the masked display value and the unmasked submit value.
- Wrapper components (PrimeVue, Element Plus, Ant Design Vue) work through the same resolution path as the React `antd` entry.
- Zero behaviour change for existing React consumers.

**Non-Goals:**

- Vue 2 / `@vue/composition-api`.
- A Vue port of the `antd` entry (`use-mask-input/vue` covers Ant Design Vue via generic wrapper resolution).
- A `<MaskInput>` component (decision 7) or a `useVeeValidateMask` helper unless a test demands it (decision 9).
- Fragment-root component resolution (decision 6).
- Backfilling real-browser tests for the React surface (decision 8) — tracked follow-up.
- A Nuxt smoke-test app in this change — SSR is covered by `*-server.spec.ts`, matching how the React entry was covered before `apps/next-project` existed.
- Reactive mask *options* deep-watching. The directive compares by cache key; a mutated-in-place options object won't re-trigger. Documented, not solved.

## Decisions

### 1. Subpath entry, not a separate package

`use-mask-input/vue`, built as a third `tsdown` entry alongside `index` and `antd`.

The alternative — a `vue-mask-input` package — forces `src/core` and `src/utils` out into a third internal package that the *stable, published* React package would then have to import. That refactor's entire risk lands on existing consumers, and buys only independent versioning. The composable name `useMaskInput` is already valid Vue vocabulary, so the discovery argument for a separate name is weaker than it first appears.

Reversible: if the Vue surface grows enough to deserve its own release cadence, `vue-mask-input` can ship later as a re-export shim with no breaking change.

### 2. The directive is the only primitive

`v-mask-input` owns every call into `applyMaskToElement`. `useMaskInput` and `<MaskInput>` are thin adapters that resolve an element and hand it to the same internal `apply(el, mask, options)` function.

Rationale: Vue directives are the only Vue API that receives `mounted` / `updated` / `unmounted` for a DOM element without owning the render. React's ref-callback surface has no equivalent, which is exactly why the React entry never tears Inputmask down and needs the `refCache` / `makeMaskCacheKey` machinery in `useHookFormMask` and `withTanStackFormMask` to keep ref identity stable. Vue's lifecycle hooks make that whole category of problem disappear — spending it on three parallel implementations instead would be waste.

### 3. Directive ordering is safe in both directions, because Inputmask owns `el.value`

An earlier draft of this document claimed the safety came from Vue's `mounted` running after props are patched. That was wrong, and the real reason matters more.

`vModelText` (`runtime-dom:1574-1616`) writes `el.value` in `mounted` and again in `beforeUpdate`. Both `v-model` and `v-mask-input` are directives on the same element, and Vue runs their hooks in template order — so a naive reading says `<input v-mask-input v-model>` and `<input v-model v-mask-input>` behave differently. They do not, because of fact 3:

| Order | What happens |
|---|---|
| `v-model` first | Native write of the raw value, then the mask initialises and seeds its buffer from the current value. This is exactly the ordering #193 fought for on the React side. |
| `v-mask-input` first | Mask installs its accessor, then `vModelText.mounted` does `el.value = value`, which now goes **through Inputmask's setter** and re-masks correctly. |

The steady-state loop is likewise self-consistent. On input, Inputmask formats the display and dispatches `input`; `vModelText`'s listener reads `el.value` through the patched getter, so with `autoUnmask` the model receives the unmasked value. On the next `beforeUpdate`, `elValue === newValue` compares unmasked against unmasked, matches, and returns early without writing (`runtime-dom:1602`). When they genuinely differ — a programmatic `setValue` or `resetForm` — the write lands on Inputmask's setter rather than clobbering the buffer.

The consequence is that `v-model` needs no special handling, which is what removes the `<MaskInput>` component from the plan (decision 7).

The real hazard this exposes is `noValuePatching`, covered in Risks.

### 4. `updated` re-applies only when the mask key changes

The `updated` hook computes `makeMaskCacheKey(name, mask)` (reusing `src/utils/maskHelpers`) plus a shallow options comparison, and returns early when unchanged.

Without the guard, every parent re-render re-masks the element, which destroys and rebuilds Inputmask's buffer and drops the caret to the end mid-typing. Because Inputmask self-removes on re-mask (`inputmask.js:101`), a genuine mask change needs no explicit teardown — just call `applyMaskToElement` again.

### 5. `unmounted` calls `el.inputmask?.remove()` — one line, no `maskEngine` change

The proposal anticipated adding a teardown export to `src/core/maskEngine.ts`. It isn't needed: `el.inputmask?.remove()` is a single line in the directive, and adding a shared export means touching a module the React entry depends on for no React-side benefit.

Net effect: **`src/core/maskEngine.ts` is not modified by this change.**

### 6. Vue element resolution lives in `src/vue/`, not in shared `core/elementResolver.ts`

The proposal flagged modifying `findInputElement` as the change's main regression vector for React and antd consumers. Design resolves it by not doing that.

`src/vue/resolveVueElement.ts` unwraps Vue-specific shapes and then delegates to the existing, untouched `findInputElement`:

| Input from Vue | Unwrap |
|---|---|
| Native element (directive `el`, function ref on `<input>`) | pass straight through |
| Component public instance (function ref on `<MyInput />`) | `instance.$el` |
| Fragment-root component (`$el` is a text anchor node) | **out of scope** — return `null` |
| `null` (unmount) | return `null` |

Fragment roots are deliberately excluded. Vue itself refuses this case for directives, warning `"Runtime directive used on component with non-element root node. The directives will not function as intended."` (`runtime-core:4707`). Supporting it only in the composable would mean walking `$el.parentElement`, which can just as easily find a sibling input as the intended one — a fragile branch for a case that input-wrapper components essentially never hit.

Then `findInputElement(unwrapped)` performs the existing `querySelector('input, textarea')` wrapper search — the same code path that already makes Ant Design work on the React side.

Net effect: **`src/core/elementResolver.ts` is not modified by this change.** Combined with decision 5, the change touches zero existing runtime source files. The only edits outside `src/vue/` are `package.json`, `tsdown.config.ts`, and docs.

### 7. No `<MaskInput>` component

Decision 3 removes its reason to exist. `<MaskInput v-model="x" mask="cpf" />` would be exactly `<input v-model="x" v-mask-input="'cpf'" />`, because `v-model` already reads and writes through Inputmask's accessor — including unmasked binding under `autoUnmask`, which was the component's one claimed unique capability.

What remains would be props, emits, attribute fall-through, and `inheritAttrs` semantics to maintain and test forever, in exchange for shorter markup. Not worth it.

Reversible: adding a component export later is not a breaking change. If issues ask for it, the use case will be concrete.

### 8. Real-browser tests for the Vue surface

This repo has never simulated a keystroke. Not one `fireEvent`, `userEvent`, or `dispatchEvent` in ~60 spec files, and it is deliberate: `optionsPassthrough.spec.ts` documents skipping anything needing "unreliable keystroke/focus simulation in jsdom", and `maxLength.spec.ts` documents that jsdom reports `ontouchstart`, so Inputmask takes its mobile path and clears `maxlength` itself — making the obvious assertion prove nothing. Even the #193 fix is tested as call ordering, not as the user-visible symptom.

So the specs for this change cannot be written as "user types X, sees Y" against jsdom. `vitest.config.ts` becomes two projects:

| Project | Environment | Scope |
|---|---|---|
| `unit` | jsdom | the existing ~60 specs, untouched, plus Vue lifecycle and resolution specs |
| `browser` | Playwright / Chromium | ~8 specs covering only what jsdom lies about |

The browser set is deliberately small: real typing through a mask, caret position after mid-value insertion, `maxlength` without the `ontouchstart` distortion, `autoUnmask` round-tripping through `v-model`, the select-all-delete-retype sequence from #193, and the vee-validate cases from decision 9.

Vue is the first and only target in this change. That asymmetry is intentional and is not laziness: the React bindings have three years of production use as evidence, while the Vue code will have none on the day it merges. The expensive proof goes to the unproven code. Backfilling React is a tracked follow-up, and would finally test #191 and #193 by symptom rather than by proxy.

Vue lifecycle — mask applied on mount, re-applied on mask change, removed on unmount — needs no keyboard at all and stays in the fast jsdom project.

### 9. vee-validate ships as documentation, and the tests are the spike

Decision 3 predicts this needs no code. `useField().value` bound with `v-model` reads through Inputmask's patched getter, so `autoUnmask: true` puts `12345678901` into field state while the input displays `123.456.789-01`. `handleChange(e)` reads `e.target.value` — the same accessor.

Rather than a separate spike step, the vee-validate browser specs are written first and answer the question directly. Green means the deliverable is a documented pattern and no code ever exists. Red scopes a `useVeeValidateMask` helper to precisely whatever failed, justified by a concrete failing test rather than a guess.

What the specs must cover:

1. Typing updates `field.value` and marks the field dirty.
2. `handleSubmit` and the validation schema both receive the unmasked value, while the display stays masked.
3. `setValue` and `resetForm` re-render the masked display.
4. Blur triggers validation.
5. **`clearMaskOnLostFocus`** — this is the real risk, and it was missed in the first draft. It defaults to true and rewrites the element's value on blur, which is exactly the event vee-validate validates on. If an incomplete value is cleared before vee-validate reads it, the two disagree about what the user entered.

Item 5 is now the most likely source of an actual helper.

### 10. Optional peers

```
peerDependencies:      react, react-dom, vue, vee-validate, antd
peerDependenciesMeta:  all five optional
```

`react`/`react-dom` moving to optional is not breaking: it only drops an install-time warning for consumers who never import the React entry. It is required — otherwise every Vue consumer is told to install React.

Bundle-level isolation is enforced by a build assertion (task 2.4) that greps the emitted `dist/vue.mjs` for React imports, not by trust. `src/vue/types.ts` is separate from `src/types/index.ts` precisely because the latter imports from `react-hook-form`.

### 11. SSR

The directive exports `getSSRProps: () => ({})` so `@vue/server-renderer` doesn't warn on an unhandled custom directive. The composable and component guard on the existing `isServer` and no-op, matching the React entry's contract. Covered by `*-server.spec.ts`, per the repo convention.

## Risks / Trade-offs

**`noValuePatching: true` breaks the entire `v-model` integration** → This is the sharp edge that fact 3 creates. Every guarantee in decision 3 depends on Inputmask owning the element's `value` accessor. A consumer who sets `noValuePatching: true` gets two independent writers and silent desync. Mitigation: document it as an unsupported option on the Vue entry. Not worth a runtime guard — but it is worth naming, because nothing about the option's name suggests it would matter.

**`clearMaskOnLostFocus` fights blur-time validation** → Defaults to true and rewrites the value on blur, the same event vee-validate validates on. Mitigation: covered by the decision 9 specs; this is the case most likely to produce a real helper.

**`updated` guard is a shallow options comparison** → An options object mutated in place, or one containing functions, will not re-trigger. Mitigation: document that options should be replaced, not mutated. Accepted rather than solved — deep-watching every render is the cost the guard exists to avoid.

**Real-browser testing is new infrastructure for this repo** → A Playwright install step, slower CI, and a second vitest project to keep working. Mitigation: the jsdom project stays the default and carries the bulk of the suite; the browser project is ~8 specs and can be skipped locally.

**Nothing verifies the published export map** → The demo apps alias to `src`, not `dist`, so a wrong `types` path or a missing `.d.cts` in the new `./vue` entry passes the whole CI run and surfaces only after publish. `publint` and `@arethetypeswrong/cli` were considered and declined. **Accepted, unmitigated.** Partial cover: the decision 10 build assertion reads the emitted files, so a total build failure is still caught.

**`unmaskedValue()` does not work in a Vue template** → `{{ unmaskedValue() }}` renders once and never updates, because reading the DOM registers no reactive dependency. Chosen deliberately for API parity with the React entry. **Accepted, documented** — the README must state that it is for event handlers and imperative code, and that template display should use `v-model` with `autoUnmask` instead.

**Optional `react` peer weakens the install-time signal for React consumers** → A React user who forgets to install React now gets a runtime error instead of an install warning. Mitigation: accepted; unavoidable given one package serves both, and the runtime failure is immediate.

**vee-validate 5 is in beta (`5.0.0-beta.0`)** → Building against 4.15 may age. Mitigation: peer range `>=4`, and the documented pattern uses only `useField` and `v-model`, so the v5 delta stays scopeable.

## Migration Plan

Additive; no migration for existing consumers.

1. Ship `src/vue/` plus the `./vue` export map entry and `tsdown` entry.
2. Ship the `peerDependenciesMeta` relaxation in the same minor — pure warning removal.
3. Changeset: **minor** (new capability, no breaking change).
4. Rollback: remove the `./vue` export and the `tsdown` entry. Because the change touches no existing runtime source (decisions 5 and 6), rollback is deletion of `src/vue/` and three config hunks.

## Open Questions

All resolved during implementation. Recorded so the reasoning is not re-derived.

### Answered by the browser suite

1. **Does vee-validate need integration code?** **No.** All 8 specs in `veeValidate.browser.spec.ts` pass with zero glue: field sync, dirty tracking, unmasked value in `handleSubmit` and in the validation rule, blur validation, `setValue`, and `resetForm`. `useVeeValidateMask` does not ship.
2. **Does `clearMaskOnLostFocus` break blur-time validation?** **No.** This was flagged as the most likely source of a real helper and it simply works — a complete value survives blur intact in both directions.
3. **Does `v-model` desync Inputmask's buffer?** **No**, and directive order genuinely does not matter, as decision 3 predicted from the property accessor. Both orders produce identical display and identical model values.
4. **Does `stripMaxLength` behave the same under Vue?** **Yes.** A `cpf`-masked input with `maxlength="11"` accepts the full masked value in real Chromium; a `numeric`-masked input keeps its cap.

### Learned while implementing

5. **`userEvent.fill` is useless for mask testing.** It is Playwright's bulk value-set and bypasses the per-keystroke round-trip, which made `v-model` appear broken in three specs. Real typing via `userEvent.type` passes. Any future browser spec here must use `type`, not `fill`.
6. **Under `autoUnmask`, `el.value` returns the *unmasked* value.** Asserting the masked display therefore has to go through the native property descriptor — the `displayed()` helper in the browser specs. This is the mechanism the whole design rests on, made visible.
7. **`src/types/index.ts` imports from `react-hook-form`,** so the framework-agnostic types were moved to `src/types/mask.ts` and re-exported. A pure move; the React surface is unchanged. This was not anticipated in the original plan.
8. **oxlint's `react-hooks/rules-of-hooks` fires on Vue composables** named `useX` inside `setup()`. Disabled for `**/vue/**` in the root `.oxlintrc.json`.
9. **Vitest 4 changed the browser provider API** to a factory from `@vitest/browser-playwright`, not the `provider: 'playwright'` string.

### Still open

10. **When to backfill React browser tests.** Tracked as a follow-up, not scheduled. Would finally test #191 and #193 by symptom rather than by proxy.
