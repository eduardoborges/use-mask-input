import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FixtureStore } from './runner';

// Not `new URL(path, import.meta.url)`: Vite rewrites that pattern into an
// asset lookup, which is undefined for a file that does not exist yet.
const here = dirname(fileURLToPath(import.meta.url));

function pathOf(group: string): string {
  return join(here, 'fixtures', 'unit', `${group}.json`);
}

/** Fixtures of the unit project, read and written straight from disk. */
export const nodeFixtures: FixtureStore = {
  describe: (group) => `src/core/engine/__parity__/fixtures/unit/${group}.json`,

  read(group): Promise<string | undefined> {
    try {
      return Promise.resolve(readFileSync(pathOf(group), 'utf8'));
    } catch {
      return Promise.resolve(undefined);
    }
  },

  write(group, content): Promise<void> {
    const path = pathOf(group);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return Promise.resolve();
  },
};
