import { vi } from 'vitest';

import type { EngineFactory } from './types';

/**
 * Every run sees this instant as "now". The datetime alias reads the current
 * year when its module is evaluated and again while validating, so fixtures
 * recorded against the real clock would go stale every January.
 */
export const CLOCK_START = Date.UTC(2030, 5, 15, 12, 0, 0);

// Static property reads: Vite only substitutes `import.meta.env.NAME` when it
// is spelled out. The browser has no `process`, so its values come from here.
const forwarded: Record<string, string | undefined> = {
  PARITY_RECORD: import.meta.env.PARITY_RECORD,
  PARITY_BATCH: import.meta.env.PARITY_BATCH,
  PARITY_FRAMES: import.meta.env.PARITY_FRAMES,
};

/** An environment variable, in the unit project and in the browser alike. */
export function readFlag(name: string): string | undefined {
  const fromBrowser = forwarded[name];
  if (fromBrowser) return fromBrowser;
  if (typeof process === 'undefined') return undefined;
  return process.env[name] || undefined;
}

export function isRecording(): boolean {
  return readFlag('PARITY_RECORD') !== undefined;
}

function isFactory(candidate: unknown): candidate is EngineFactory {
  return typeof candidate === 'function'
    && 'format' in candidate
    && 'unmask' in candidate
    && 'isValid' in candidate;
}

function asFactory(candidate: unknown): EngineFactory {
  if (isFactory(candidate)) return candidate;
  throw new Error("The engine's default export is not an Inputmask factory with format/unmask/isValid.");
}

async function importEngine(): Promise<EngineFactory> {
  const module: unknown = await import('../index');
  const exported = typeof module === 'object' && module !== null && 'default' in module ? module.default : undefined;
  return asFactory(exported);
}

/**
 * Brings the engine's module-level state to the one every scenario expects.
 *
 * The datetime alias keeps a module-level flag that the first date ever parsed
 * turns on for good, and that changes how later masks validate. Parsing one
 * date up front makes every scenario see the flag on, whatever ran before it.
 * The state before that first date is what `fresh` scenarios are for.
 */
export function primeEngine(engine: EngineFactory): void {
  try {
    engine.format('01/01/2000', { alias: 'datetime', inputFormat: 'dd/mm/yyyy' });
  } catch {
    // An engine that cannot format a date yet has no such state to bring in line.
    // Its scenarios still run, and each one reports what it could not do.
  }
}

/**
 * Empties the mask cache, which is keyed by the mask alone: a cached entry
 * built under other options would otherwise leak into the next scenario and
 * make the result depend on the order scenarios run in.
 */
export function resetEngine(engine: EngineFactory): void {
  const cache = engine.prototype?.masksCache;
  if (!cache) return;
  Object.keys(cache).forEach((key) => {
    delete cache[key];
  });
}

export interface LoadOptions {
  /** Re-evaluates the engine modules and skips priming. Unit project only. */
  fresh?: boolean;
}

/** Loads an engine with the clock already pinned, since its modules read it. */
export async function loadEngine(options: LoadOptions = {}): Promise<EngineFactory> {
  vi.setSystemTime(new Date(CLOCK_START));
  if (options.fresh) vi.resetModules();
  const engine = await importEngine();
  if (!options.fresh) primeEngine(engine);
  return engine;
}
