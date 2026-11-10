import type { ParityEnv, Scenario } from './types';

/**
 * Finds every scenario file. Adding `scenarios/<area>.ts` that exports
 * `scenarios` is all it takes: there is no index to edit, so two people
 * adding areas at the same time do not collide.
 */

export interface ScenarioGroup {
  /** The file name without its extension. Also the name of the fixture file. */
  name: string;
  scenarios: Scenario[];
}

const VALID_ID = /^[A-Za-z0-9][\w.:+/-]*$/;

const modules = import.meta.glob('./scenarios/*.ts', { eager: true });

function nameOf(path: string): string {
  return path.replace(/^.*\//, '').replace(/\.ts$/, '');
}

function isScenario(candidate: unknown): candidate is Scenario {
  return typeof candidate === 'object'
    && candidate !== null
    && 'id' in candidate
    && 'kind' in candidate
    && 'options' in candidate;
}

function scenariosOf(path: string): Scenario[] {
  const module = modules[path];
  const exported: unknown = typeof module === 'object' && module !== null && 'scenarios' in module
    ? module.scenarios
    : undefined;
  if (!Array.isArray(exported) || !exported.every(isScenario)) {
    throw new Error(`${path} must export \`scenarios\`, an array built with the helpers in scenario.ts`);
  }
  return exported;
}

/** Whether the scenario changes something the engine only reads once. */
function needsFreshEngine(scenario: Scenario): boolean {
  if (scenario.kind !== 'interactive') return false;
  return scenario.environment?.touch !== undefined || scenario.environment?.userAgent !== undefined;
}

function assertValid(groups: ScenarioGroup[]): void {
  const owners = new Map<string, string>();
  groups.forEach((group) => {
    group.scenarios.forEach(({ id }) => {
      if (!VALID_ID.test(id)) {
        throw new Error(`Scenario id ${JSON.stringify(id)} in scenarios/${group.name}.ts may only use letters, digits and . _ : + / -`);
      }
      const owner = owners.get(id);
      if (owner !== undefined) {
        throw new Error(`Scenario id "${id}" is used twice: scenarios/${owner}.ts and scenarios/${group.name}.ts`);
      }
      owners.set(id, group.name);
    });
    group.scenarios.filter(needsFreshEngine).forEach(({ id, fresh }) => {
      if (!fresh) {
        throw new Error(`Scenario "${id}" sets environment.touch or environment.userAgent, which the engine reads once: it needs \`fresh: true\``);
      }
    });
  });
}

/** Whether the scenario runs in the given environment. `fresh` only works in the unit project. */
export function runsIn(scenario: Scenario, env: ParityEnv): boolean {
  const declared = scenario.fresh ? 'unit' : scenario.env ?? 'both';
  return declared === 'both' || declared === env;
}

/** Every group, sorted by name, with ids checked for shape and uniqueness. */
export function loadGroups(): ScenarioGroup[] {
  const groups = Object.keys(modules)
    .toSorted()
    .map((path) => ({ name: nameOf(path), scenarios: scenariosOf(path) }));
  assertValid(groups);
  return groups;
}

/** The groups that have something to run in `env`, with only those scenarios. */
export function groupsFor(env: ParityEnv): ScenarioGroup[] {
  return loadGroups()
    .map((group) => ({ ...group, scenarios: group.scenarios.filter((scenario) => runsIn(scenario, env)) }))
    .filter((group) => group.scenarios.length > 0);
}
