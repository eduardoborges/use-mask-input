/**
 * Ambient typing the parity harness needs and the package does not provide.
 *
 * `vite/client` is not resolvable from this package, so the two Vite features
 * the harness uses on `import.meta` are declared here.
 */

interface ImportMetaEnv {
  /** Forwarded to the browser project by `vitest.config.ts`. */
  readonly PARITY_RECORD?: string;
  readonly PARITY_BATCH?: string;
  readonly PARITY_FRAMES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  // No type parameter on purpose. Vitest keeps transformed modules on disk and
  // skips the ones that contain the text `import.meta.glob(`; written as
  // `import.meta.glob<T>(` a module would be cached with a stale file list.
  glob(pattern: string, options: { eager: true }): Record<string, unknown>;
  glob(pattern: string): Record<string, () => Promise<unknown>>;
}
