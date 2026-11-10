import {
  afterAll, beforeAll, describe, it,
} from 'vitest';

import {
  decodeObservation, encodeObservation, parseFixture, stringifyFixture,
} from './codec';
import { explainMismatch } from './diff';
import { runScenario } from './driver';
import { isRecording, loadEngine } from './engine';
import { applyEnvironment } from './harness';
import { groupsFor } from './registry';

import type { MismatchContext } from './diff';
import type { Driver } from './driver';
import type {
  EncodedObservation, EngineFactory, Fixture, Observation, Scenario,
} from './types';

/**
 * The two suites, written once and instantiated by a spec file per project:
 * recording fixtures from the engine, and replaying them against it.
 */

export interface FixtureStore {
  /** The path of a group's fixture file, as shown in messages. */
  describe(group: string): string;
  /** The file's content, or undefined when there is no file. */
  read(group: string): Promise<string | undefined>;
  write(group: string, content: string): Promise<void>;
}

export interface SuiteEnvironment {
  driver: Driver;
  fixtures: FixtureStore;
}

/** A group can hold hundreds of scenarios, and the browser runs each twice when recording. */
const RECORD_TIMEOUT = 30 * 60 * 1000;

const HOW_TO_RECORD = 'Record it with `pnpm --filter=use-mask-input parity:record` (see __parity__/README.md).';

/** Carries the message alone. A stack trace into the harness would only push it out of view. */
class ParityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParityError';
    this.stack = `${this.name}: ${message}`;
  }
}

/** Runs the tasks one after the other. Scenarios share the document, so they cannot run in parallel. */
export async function sequentially<Item>(
  items: readonly Item[],
  run: (item: Item, index: number) => Promise<void>,
): Promise<void> {
  await items.reduce(
    (previous, item, index) => previous.then(() => run(item, index)),
    Promise.resolve(),
  );
}

function engineFor(scenario: Scenario, shared: EngineFactory): Promise<EngineFactory> {
  return scenario.fresh ? loadEngine({ fresh: true }) : Promise.resolve(shared);
}

/**
 * Runs the scenario on the engine it asks for. Its environment goes in place
 * first, because the engine reads it while loading, and comes out again last,
 * so the shared engine never sees it.
 */
export async function runOn(
  scenario: Scenario,
  shared: EngineFactory,
  driver: Driver,
): Promise<Observation> {
  const restore = applyEnvironment(scenario);
  try {
    return await runScenario(scenario, await engineFor(scenario, shared), driver);
  } finally {
    restore();
  }
}

/**
 * One test per scenario: run it and compare with what the fixture holds. The
 * fixtures were first recorded from Inputmask 5.0.10-beta.61.
 */
export function defineParitySuite({ driver, fixtures }: SuiteEnvironment): void {
  const title = `parity: the engine against the fixtures (${driver.env})`;

  // Replaying while the fixtures are being rewritten would read half a file.
  describe.skipIf(isRecording())(title, () => {
    let engine: EngineFactory;

    beforeAll(async () => {
      await driver.setup();
      engine = await loadEngine();
    });
    afterAll(() => driver.teardown());

    groupsFor(driver.env).forEach((group) => {
      describe(group.name, () => {
        const path = fixtures.describe(group.name);
        let fixture: Fixture = {};

        beforeAll(async () => {
          const source = await fixtures.read(group.name);
          if (source !== undefined) fixture = parseFixture(source);
        });

        group.scenarios.forEach((scenario) => {
          it(scenario.id, async () => {
            const recorded = fixture[scenario.id];
            if (recorded === undefined) {
              throw new ParityError(`${scenario.id}: no fixture in ${path}. ${HOW_TO_RECORD}`);
            }

            const context: MismatchContext = { env: driver.env, fixture: path };
            const actual = await runOn(scenario, engine, driver);
            const mismatch = explainMismatch(scenario, decodeObservation(recorded, scenario.kind), actual, context);
            if (mismatch !== undefined) throw new ParityError(mismatch);
          });
        });

        it(`${group.name}: every fixture entry has a scenario`, () => {
          const known = new Set(group.scenarios.map((scenario) => scenario.id));
          const stale = Object.keys(fixture).filter((id) => !known.has(id));
          if (stale.length > 0) {
            throw new ParityError(`${path} holds entries no scenario claims: ${stale.join(', ')}. ${HOW_TO_RECORD}`);
          }
        });
      });
    });
  });
}

/**
 * Runs the scenario twice and encodes it. Two runs that
 * disagree mean the driver is not deterministic for this scenario, and a
 * fixture recorded from it would fail at random later.
 */
async function recordScenario(
  scenario: Scenario,
  engine: EngineFactory,
  driver: Driver,
): Promise<EncodedObservation> {
  const first = await runOn(scenario, engine, driver);
  const second = await runOn(scenario, engine, driver);
  const context: MismatchContext = { env: driver.env, fixture: '(not written)' };

  const unstable = explainMismatch(scenario, first, second, context);
  if (unstable !== undefined) {
    throw new ParityError(`Two runs disagree, so the driver is not deterministic here.\n${unstable}`);
  }

  const encoded = encodeObservation(first);
  const lossy = explainMismatch(scenario, first, decodeObservation(encoded, scenario.kind), context);
  if (lossy !== undefined) {
    throw new ParityError(`The fixture encoding does not round-trip this observation.\n${lossy}`);
  }
  return encoded;
}

/** One test per scenario file: run every scenario and write the fixture. */
export function defineRecordSuite({ driver, fixtures }: SuiteEnvironment): void {
  describe.runIf(isRecording())(`record fixtures (${driver.env})`, () => {
    let engine: EngineFactory;

    beforeAll(async () => {
      await driver.setup();
      engine = await loadEngine();
    });
    afterAll(() => driver.teardown());

    groupsFor(driver.env).forEach((group) => {
      it(`records ${group.name}`, async () => {
        const fixture: Fixture = {};
        const refused: string[] = [];

        await sequentially(group.scenarios, async (scenario) => {
          try {
            fixture[scenario.id] = await recordScenario(scenario, engine, driver);
          } catch (error) {
            refused.push(error instanceof Error ? error.message : String(error));
          }
        });

        await fixtures.write(group.name, stringifyFixture(fixture));
        if (refused.length > 0) {
          throw new ParityError(`${refused.length} scenario(s) were not recorded.\n\n${refused.join('\n\n')}`);
        }
      }, RECORD_TIMEOUT);
    });
  });
}
