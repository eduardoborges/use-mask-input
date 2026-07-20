# CLAUDE.md

Guidance for AI agents in `use-mask-input`. Only non-obvious stuff lives here; scripts, deps, and file layout are discoverable from `package.json` and the tree.

## What this is
React input-mask library wrapping [inputmask](https://github.com/RobinHerbots/Inputmask). Works with plain inputs, React Hook Form, TanStack Form, and Ant Design. pnpm + Turborepo monorepo.

Published package: `packages/use-mask-input`. Everything else is a consumer/smoke-test.

## Toolchain (differs from most repos — check before assuming)
| Concern | Tool | Not |
|---|---|---|
| Lint | **oxlint** (`.oxlintrc.json`) | eslint |
| Bundle | **tsdown** (`tsdown.config.ts`) | tsup |
| Test | vitest + jsdom | jest |
| PM | **pnpm 11** | npm/yarn |

## Commands
Run from repo root (Turbo fans out). Use `pnpm --filter=use-mask-input <script>` to run only the lib and skip the demo apps (note: `--filter` goes right after `pnpm`, else pnpm eats it).
```
pnpm test          # vitest, run mode + coverage
pnpm lint          # oxlint
pnpm type-check    # tsc --noEmit
pnpm build         # tsdown -> dist (ESM .mjs + CJS .cjs + d.ts)
pnpm changeset     # REQUIRED for any change to the published lib
```
`/check` runs test + lint + type-check for the lib in one shot.

## Source map (`packages/use-mask-input/src`)
- `api/` — public hooks: `useMaskInput`, `useHookFormMask`, `useTanStackFormMask`, and `withMask`/`with*` ref-callback variants
- `core/` — `maskConfig` (aliases live here — source of truth, don't duplicate the list), `maskEngine`, `elementResolver`, `inputmask`
- `antd/` — Ant Design entry (`use-mask-input/antd`)
- `utils/`, `types/`

Tests are colocated as `*.spec.ts(x)`. SSR paths tested in `*-server.spec.tsx`.

## Gotchas
1. **SSR-safe**: hooks return a no-op on the server (`isServer` check). Don't break this — `apps/next-project` exists to catch it.
2. **Element resolution**: `resolveInputRef` digs the real `<input>` out of wrapper components (Ant Design etc). Both native and wrapped refs must work.
3. **RHF/TanStack integration** wraps the library's `ref` callback around the form's `register` ref. `with*` variants exist for `React.memo` cases.
4. **inputmask is bundled** (`noExternal` in tsdown), not a peer dep.
5. **Alias options merge**: user options always override an alias's defaults (`getMaskOptions`).
6. **Demo apps are upstream boilerplate** (`create-next-app`, `create-vite`, shadcn, TanStack). Keep their deps matching the official scaffold — do NOT bump ahead. Only the published package tracks latest.

## Shipping a change to the lib
Changeset required, semantic PR title (`feat:`/`fix:`/`chore:`/`docs:`…), and green test/lint/type-check. New alias → edit `core/maskConfig.ts` + `types/index.ts` + a spec + README. Releases and docs deploy are automated via `.github/workflows`.
