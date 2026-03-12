# AGENTS.md

Documentation for AI agents working in the `use-mask-input` repository.

## Project Overview

**use-mask-input** is a React library for creating input masks, compatible with React Hook Form and Ant Design. It's built as a TypeScript monorepo using pnpm workspaces and Turborepo.

- **Main package**: `packages/use-mask-input` - The core library published to npm
- **Demo apps**: `apps/vite-project`, `apps/next-project` - Example implementations
- **Documentation**: `apps/docussaurus` - Hosted at https://use-mask-input.eduardoborges.dev
- **Changesets**: Used for version management and releases

## Repository Structure

```
use-mask-input/
├── packages/
│   └── use-mask-input/        # Core library (published to npm)
│       ├── src/
│       │   ├── api/            # Public API hooks (useMaskInput, useHookFormMask, etc.)
│       │   ├── core/           # Core mask logic (maskConfig, maskEngine, elementResolver)
│       │   ├── utils/          # Utility functions
│       │   ├── types/          # TypeScript type definitions
│       │   ├── antd/           # Ant Design integration
│       │   └── index.tsx       # Main entry point
│       ├── dist/               # Build output (gitignored)
│       ├── coverage/           # Test coverage reports (gitignored)
│       ├── tsup.config.ts      # Build configuration
│       ├── vitest.config.ts    # Test configuration
│       └── eslint.config.mjs   # ESLint configuration
├── apps/
│   ├── vite-project/           # Vite demo app
│   ├── next-project/           # Next.js demo app
│   └── docussaurus/            # Documentation site
├── docs/                       # Documentation markdown files
├── .changeset/                 # Changesets for version management
└── .github/workflows/          # CI/CD pipelines
```

## Essential Commands

### Installation & Setup
```bash
# Install dependencies (must use pnpm)
pnpm install

# Verify pnpm version
pnpm --version  # Should be 10.30.2 or later
```

### Development
```bash
# Build all packages
pnpm run build

# Build specific package
pnpm run build --filter=use-mask-input

# Watch mode for core library
cd packages/use-mask-input && pnpm run dev

# Run Vite demo app (default)
pnpm run dev

# Run Next.js demo app
pnpm run dev:next

# Run documentation site
pnpm run dev:docs
```

### Testing
```bash
# Run all tests (uses Vitest)
pnpm run test

# Run tests for core library only
cd packages/use-mask-input && pnpm run test

# Test with coverage
cd packages/use-mask-input && pnpm run test
# Coverage reports are written to packages/use-mask-input/coverage/
```

### Linting & Type Checking
```bash
# Run ESLint on all packages
pnpm run lint

# Lint specific package
cd packages/use-mask-input && pnpm run lint

# Type check all packages
pnpm run type-check

# Type check specific package
cd packages/use-mask-input && pnpm run type-check
```

### Version Management & Publishing
```bash
# Create a changeset (describes changes for version bump)
pnpm run changeset

# Version packages (consumes changesets, updates version numbers)
pnpm run version-packages

# Publish to npm (run after version-packages)
pnpm run release

# Note: Publishing is automated via GitHub Actions on main branch
```

### Documentation
```bash
# Start documentation site locally
pnpm run dev:docs

# Build documentation
pnpm run build --filter=docs

# Documentation is auto-deployed to Cloudflare Pages on releases
```

## Technology Stack

### Core Dependencies
- **React**: 19.2.4 (peer dependency, supports >=17)
- **inputmask**: 5.0.10-beta.61 (bundled with library)
- **TypeScript**: 5.1 (library), 5.9 (root/apps)
- **Node.js**: >=16 (tested on 20, 22, 24 in CI)
- **pnpm**: >=8 (lockfile uses 10.30.2)

### Build & Development Tools
- **tsup**: 8.5.0 - TypeScript bundler (outputs ESM + CJS)
- **Turborepo**: 2.8.11 - Monorepo task runner
- **Vitest**: 4.0.18 - Test runner with jsdom environment
- **ESLint**: 9.35.0 with airbnb-extended config
- **Changesets**: 2.29.8 - Version management

### Testing
- **Vitest**: Unit testing with jsdom
- **@testing-library/react**: 16.1.0 - React component testing
- **@vitest/coverage-v8**: 4.0.18 - Code coverage

## Code Organization & Patterns

### Package Structure

The core library (`packages/use-mask-input`) has a clear separation of concerns:

1. **`src/api/`** - Public-facing hooks and functions:
   - `useMaskInput.ts` - Primary hook for applying masks
   - `useHookFormMask.ts` - React Hook Form integration
   - `withMask.ts` - Functional ref callback for masks
   - `withHookFormMask.ts` - Functional RHF integration

2. **`src/core/`** - Core masking logic:
   - `maskConfig.ts` - Mask configuration and built-in aliases
   - `maskEngine.ts` - Inputmask application logic
   - `elementResolver.ts` - Resolves input elements from refs/components

3. **`src/antd/`** - Ant Design specific integrations:
   - `useMaskInputAntd.ts` - Ant Design hook
   - `useHookFormMaskAntd.ts` - Ant Design + React Hook Form

4. **`src/types/`** - TypeScript definitions:
   - `index.ts` - Public types (Mask, Options, Input, etc.)
   - `inputmask.types.ts` - Inputmask library types

5. **`src/utils/`** - Utility functions:
   - `isServer.ts` - SSR detection
   - `moduleInterop.ts` - ESM/CJS interop helpers
   - `flow.ts` - Function composition utilities

### Entry Points

The library has two entry points (defined in package.json exports):

1. **Main entry** (`use-mask-input`):
   - Source: `src/index.tsx`
   - Exports: `useMaskInput`, `useHookFormMask`, `withMask`, `withHookFormMask`
   - Types: `Mask`, `Options`, `Input`, etc.

2. **Ant Design entry** (`use-mask-input/antd`):
   - Source: `src/antd/index.ts`
   - Exports: `useMaskInputAntd`, `useHookFormMaskAntd`

### Built-in Mask Aliases

The library provides ready-to-use mask aliases in `src/core/maskConfig.ts`:

**General**: `datetime`, `email`, `numeric`, `currency`, `decimal`, `integer`, `percentage`, `url`, `ip`, `mac`, `ssn`

**Brazilian**: `cpf`, `cnpj`, `brl-currency`, `br-bank-account`, `br-bank-agency`

Usage: `useMaskInput({ mask: 'cpf' })` instead of `useMaskInput({ mask: '999.999.999-99' })`

### Testing Patterns

All test files use the `.spec.ts` or `.spec.tsx` extension and are colocated with source files:

```typescript
// Example: src/core/maskConfig.spec.ts
import { describe, expect, it } from 'vitest';
import { getMaskOptions } from './maskConfig';

describe('maskConfig', () => {
  describe('getMaskOptions', () => {
    it('returns default options when no mask is provided', () => {
      const options = getMaskOptions();
      expect(options).toEqual({ jitMasking: false });
    });
  });
});
```

**Test configuration**:
- Environment: jsdom (for DOM testing)
- Coverage: v8 provider
- Output: junit-report.xml, json-report.json in `coverage/`
- Reporters: junit, json, verbose

**Coverage exclusions**:
- Index files (`**/index.{ts,tsx}`)
- Test files (`**/*.spec.{ts,tsx}`, `**/*.test.{ts,tsx}`)
- Type definitions (`**/types/**`)

## Code Style & Conventions

### ESLint Configuration

The project uses **eslint-config-airbnb-extended** with strict TypeScript rules:

- **Base**: Airbnb JavaScript style guide
- **React**: Airbnb React rules + React Hooks plugin
- **TypeScript**: TypeScript ESLint strict rules
- **Imports**: Import-X plugin with strict import ordering
- **Stylistic**: @stylistic/eslint-plugin for formatting

**Test file exception**: Test files (`.spec.ts`, `.test.ts`) have `import-x/no-extraneous-dependencies` disabled.

### EditorConfig

All files follow these rules (`.editorconfig`):
- **Charset**: UTF-8
- **Indent**: 2 spaces (no tabs)
- **Line endings**: LF (Unix style)
- **Final newline**: Yes
- **Trailing whitespace**: Trimmed

### TypeScript Configuration

**Compiler options** (`packages/use-mask-input/tsconfig.json`):
- **Target**: ES2020
- **Module**: ESNext
- **JSX**: react
- **Strict**: `noImplicitAny`, `strictNullChecks` enabled
- **Output**: Type declarations included

### Naming Conventions

1. **Hooks**: Start with `use` (e.g., `useMaskInput`, `useHookFormMask`)
2. **Higher-order functions**: Start with `with` (e.g., `withMask`)
3. **Types**: PascalCase (e.g., `Mask`, `Options`, `Input`)
4. **Constants**: SCREAMING_SNAKE_CASE for config objects (e.g., `ALIAS_MASKS`)
5. **Files**: camelCase for implementation, PascalCase for components

## Build System

### Turborepo Configuration

**Task dependencies** (from `turbo.json`):
- `build`: Depends on `^build` (builds dependencies first)
- `lint`: Depends on `^build`
- `type-check`: Depends on `^build`
- `test`: No dependencies
- `dev`, `start`: Non-cached, persistent tasks

**Cache outputs**:
- `build`: `dist/**`, `.next/**`, `build/**`
- `test`: `coverage/**`

### tsup Build Configuration

**Input**: `src/index.tsx` (main), `src/antd/index.ts` (antd)

**Output**:
- Format: ESM + CJS
- Target: ES2022
- Sourcemaps: Yes
- Type declarations: Yes
- Bundle: Yes (includes inputmask)
- Tree shaking: Yes
- Code splitting: Yes

**External dependencies**: react, react-dom (peer deps, not bundled)

**Bundled dependency**: inputmask (noExternal)

### Package Exports

```json
{
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  },
  "./antd": {
    "types": "./dist/antd.d.ts",
    "import": "./dist/antd.js",
    "require": "./dist/antd.cjs"
  }
}
```

This enables:
- `import { useMaskInput } from 'use-mask-input'`
- `import { useMaskInputAntd } from 'use-mask-input/antd'`

## CI/CD Pipelines

### CI Workflow (`.github/workflows/ci.yml`)

**Triggers**: Pull requests to `main` or `beta` branches

**Jobs**:
1. **semantic_pr**: Validates PR title follows semantic commit conventions
2. **health_check**: 
   - Matrix: Node 20, 22, 24
   - Steps: Install → Test → Lint → Build
   - Uses Turbo cache for faster builds

### Continuous Release (`.github/workflows/cr.yml`)

**Triggers**: Push to `main` or `beta` branches, manual workflow dispatch

**Steps**:
1. Build package (`--filter=use-mask-input`)
2. Run tests
3. Upload coverage to Codecov
4. Run changesets action:
   - Creates PR for version bumps (if changesets exist)
   - Publishes to npm (if version PR is merged)
   - Creates GitHub releases

**Publishing**:
- Uses npm Trusted Publishing (OIDC) - no long-lived tokens
- Requires `NPM_TOKEN` and `GH_TOKEN` secrets

### Documentation Deployment (`.github/workflows/cd-docs.yml`)

**Triggers**: GitHub releases, manual workflow dispatch

**Steps**:
1. Build documentation (`--filter=docs`)
2. Deploy to Cloudflare Pages using Wrangler
3. URL: https://use-mask-input.eduardoborges.dev

**Required secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## Version Management with Changesets

### Workflow

1. **Create changeset**: 
   ```bash
   pnpm run changeset
   ```
   - Select packages that changed
   - Choose semver bump type (major/minor/patch)
   - Write summary of changes
   - Creates `.changeset/*.md` file

2. **Version packages**:
   ```bash
   pnpm run version-packages
   ```
   - Consumes changesets
   - Updates package.json versions
   - Updates CHANGELOG.md
   - Removes changeset files

3. **Publish**:
   ```bash
   pnpm run release
   ```
   - Runs `changeset publish`
   - Publishes to npm
   - (Automated in CI/CD)

### Changeset Configuration

**Ignored packages** (not versioned):
- `vite-project`
- `next-project`
- `docs`

**Pre-release branches**: `beta`, `alpha`

**Access**: Public (npm)

## Important Gotchas & Patterns

### 1. SSR Compatibility

The library is SSR-safe. `useMaskInput` checks `isServer` and returns a no-op function on the server:

```typescript
if (isServer) {
  return (): void => {
    // server doesn't have dom, so just do nothing
  };
}
```

Always test changes with Next.js app (`apps/next-project`) to ensure SSR compatibility.

### 2. Element Resolution

The library handles both native inputs and wrapped components (like Ant Design):

- Native: `<input ref={ref} />`
- Wrapped: `<Input ref={ref} />` (Ant Design)

The `resolveInputRef` function in `src/core/elementResolver.ts` handles finding the actual input element within wrapper components.

### 3. React Hook Form Integration

Two patterns for React Hook Form:
1. **Hook**: `useHookFormMask(register)` - returns a register-like function
2. **Function**: `withHookFormMask(register)` - for use with `React.memo`

Both work by wrapping the original `ref` callback from RHF's `register`.

### 4. Inputmask Bundling

The `inputmask` library is **bundled** into the package (not a peer dependency). This is configured in tsup with `noExternal: ['inputmask']`.

Reason: Simplifies consumption and ensures version compatibility.

### 5. Mask Options Merging

Built-in aliases have default options that are merged with user options:

```typescript
getMaskOptions('cpf', { placeholder: '___.___.___-__' })
// Returns: { mask: '999.999.999-99', placeholder: '___.___.___-__', jitMasking: false }
```

User options always override alias defaults.

### 6. Test File Pattern

Tests use `.spec.ts` extension (not `.test.ts`), though both are supported. Keep tests colocated with source files.

### 7. Turbo Filtering

When working on specific packages, use `--filter`:
```bash
pnpm run build --filter=use-mask-input
pnpm run test --filter=use-mask-input
```

This prevents unnecessary rebuilds of demo apps.

### 8. React Version Overrides

The monorepo uses React 19, but the library supports React >=17. Overrides in root `package.json` ensure consistency:

```json
"pnpm": {
  "overrides": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3"
  }
}
```

### 9. Coverage Reports

Coverage reports are generated in `packages/use-mask-input/coverage/`:
- `coverage-final.json` - Raw coverage data
- `junit-report.xml` - CI-friendly format
- `json-report.json` - JSON format
- `index.html` - HTML viewer

These are gitignored and uploaded to Codecov in CI.

### 10. Semantic PR Titles

All PRs must have semantic commit-style titles:
- `feat:` - New feature
- `fix:` - Bug fix
- `chore:` - Maintenance
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Test changes
- `ci:` - CI changes

This is enforced by the `semantic_pr` job in CI.

## Making Changes

### Adding a New Built-in Alias

1. Add alias to `ALIAS_MASKS` in `src/core/maskConfig.ts`
2. Add type to `Mask` union in `src/types/index.ts`
3. Add test in `src/core/maskConfig.spec.ts`
4. Update README.md "Built-in Aliases" section
5. Update docs in `docs/` directory
6. Create changeset: `pnpm run changeset`

### Adding a New API

1. Create implementation in `src/api/`
2. Export from `src/index.tsx`
3. Add types to `src/types/index.ts`
4. Write tests colocated (`.spec.ts`)
5. Update API reference in `docs/api-reference.md`
6. Add usage example to README
7. Create changeset: `pnpm run changeset`

### Modifying Core Logic

1. Identify affected file in `src/core/`
2. Read existing tests to understand behavior
3. Write failing test for new behavior
4. Implement change
5. Ensure all tests pass: `pnpm run test`
6. Verify no type errors: `pnpm run type-check`
7. Run lint: `pnpm run lint`
8. Test in demo apps (`pnpm run dev`, `pnpm run dev:next`)
9. Create changeset: `pnpm run changeset`

### Updating Dependencies

1. Update root `package.json` for monorepo tools
2. Update `packages/use-mask-input/package.json` for library deps
3. Run `pnpm install`
4. Test thoroughly (all apps and library)
5. Update `pnpm.overrides` if needed for React/shared deps
6. Create changeset if library dependencies changed

## Working with Demo Apps

### Vite Project (`apps/vite-project`)

**Purpose**: Quick iteration and visual testing

**Run**: `pnpm run dev`

**Stack**: Vite, React 19, Ant Design, React Hook Form

**Key files**:
- `src/App.tsx` - Main demo component
- `vite.config.ts` - Vite configuration

**Usage**: Add visual examples of new features here for testing.

### Next.js Project (`apps/next-project`)

**Purpose**: SSR testing

**Run**: `pnpm run dev:next`

**Stack**: Next.js 16, React 19

**Usage**: Test SSR compatibility and Next.js integration.

### Documentation Site (`apps/docussaurus`)

**Purpose**: Public documentation

**Run**: `pnpm run dev:docs`

**Stack**: Docusaurus 3.9.2

**Content**: Markdown files in `docs/` directory

**Deployment**: Auto-deployed to Cloudflare Pages on releases

## Debugging Tips

### Build Issues

```bash
# Clean all build artifacts
find . -name "dist" -type d -exec rm -rf {} +
find . -name ".turbo" -type d -exec rm -rf {} +

# Rebuild everything
pnpm install
pnpm run build
```

### Test Failures

```bash
# Run tests in watch mode
cd packages/use-mask-input
pnpm run dev  # In one terminal (builds in watch mode)
pnpm exec vitest  # In another terminal (runs tests in watch mode)
```

### Type Errors

```bash
# Check types without building
cd packages/use-mask-input
pnpm run type-check

# Sometimes stale types cause issues - rebuild
pnpm run build
```

### ESLint Errors

```bash
# Run ESLint with auto-fix
cd packages/use-mask-input
pnpm run lint -- --fix
```

### Turbo Cache Issues

```bash
# Clear Turbo cache
rm -rf .turbo

# Force Turbo to ignore cache
pnpm run build -- --force
```

## Resources

- **Repository**: https://github.com/eduardoborges/use-mask-input
- **Documentation**: https://use-mask-input.eduardoborges.dev
- **npm Package**: https://www.npmjs.com/package/use-mask-input
- **Inputmask Docs**: https://github.com/RobinHerbots/Inputmask
- **Changesets Docs**: https://github.com/changesets/changesets
- **Turborepo Docs**: https://turbo.build/repo/docs

## Common Tasks Quick Reference

```bash
# Setup
pnpm install

# Development
pnpm run dev              # Vite demo
pnpm run dev:next         # Next.js demo
pnpm run dev:docs         # Documentation
cd packages/use-mask-input && pnpm run dev  # Library watch mode

# Testing
pnpm run test             # All tests
pnpm run type-check       # Type checking
pnpm run lint             # Linting

# Building
pnpm run build            # All packages
pnpm run build --filter=use-mask-input  # Library only

# Versioning
pnpm run changeset        # Create changeset
pnpm run version-packages # Bump versions
pnpm run release          # Publish (automated in CI)

# Cleanup
rm -rf node_modules .turbo dist coverage build .next
pnpm install
```

---

**Last Updated**: 2025-03-07
