import { commands } from 'vitest/browser';

import type { FixtureStore } from './runner';

/** Relative to the project root, which is where Vitest's file commands resolve from. */
function pathOf(group: string): string {
  return `src/core/engine/__parity__/fixtures/browser/${group}.json`;
}

/** Fixtures of the browser project. The page has no disk, so the test server does the I/O. */
export const browserFixtures: FixtureStore = {
  describe: pathOf,

  async read(group): Promise<string | undefined> {
    try {
      return await commands.readFile(pathOf(group));
    } catch {
      return undefined;
    }
  },

  write: (group, content) => commands.writeFile(pathOf(group), content),
};
