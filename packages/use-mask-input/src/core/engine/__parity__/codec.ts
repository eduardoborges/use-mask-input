import { jsonEqual } from './inspect';

import type {
  ElementAttributes,
  EncodedObservation,
  EncodedStatic,
  EncodedStaticInput,
  EncodedStep,
  Fixture,
  InteractiveObservation,
  JsonValue,
  Observation,
  Scenario,
  StaticObservation,
  StepObservation,
} from './types';

/**
 * Fixture encoding. There will be thousands of scenarios, so a step stores
 * only what changed since the step before it, under one-letter keys, and a
 * file keeps one scenario per line so a re-record diffs line by line.
 */

/** Separates the keystrokes of one `type` step in an event list. */
export const KEYSTROKE = '|';

/** Bumped when the encoding changes shape. Stored under `$format`. */
export const FIXTURE_FORMAT = 1;

const FORMAT_KEY = '$format';
const REPEATED_GROUP = /^(\d+)\*\((.*)\)$/;

/** The state fields a step inherits from the one before it. */
interface CarriedState {
  text: string;
  selection: [number, number] | null;
  unmasked: JsonValue;
  complete: JsonValue;
  masked: boolean;
  attrs: ElementAttributes;
  watched?: (string | null)[];
}

function initialState(): CarriedState {
  return {
    text: '',
    selection: [0, 0],
    unmasked: null,
    complete: null,
    masked: false,
    attrs: [null, null, null, '', null],
  };
}

function splitKeystrokes(events: string[]): string[][] {
  const groups: string[][] = [[]];
  events.forEach((event) => {
    if (event === KEYSTROKE) groups.push([]);
    else groups[groups.length - 1].push(event);
  });
  return groups;
}

/** `a b | a b | a b c` becomes `2*(a b) | a b c`. */
export function compressEvents(events: string[]): string {
  const groups = splitKeystrokes(events).map((group) => group.join(' '));
  const runs: { group: string; count: number }[] = [];
  groups.forEach((group) => {
    const last = runs[runs.length - 1];
    if (last && last.group === group) last.count += 1;
    else runs.push({ group, count: 1 });
  });
  return runs
    .map((run) => (run.count > 1 ? `${run.count}*(${run.group})` : run.group))
    .join(` ${KEYSTROKE} `);
}

export function expandEvents(encoded: string): string[] {
  const events: string[] = [];
  const groups = encoded.split(` ${KEYSTROKE} `).flatMap((part) => {
    const repeated = REPEATED_GROUP.exec(part);
    return repeated ? Array<string>(Number(repeated[1])).fill(repeated[2]) : [part];
  });
  groups.forEach((group, index) => {
    if (index > 0) events.push(KEYSTROKE);
    if (group !== '') events.push(...group.split(' '));
  });
  return events;
}

function encodeSelection(selection: [number, number] | null): number | [number, number] | null {
  if (selection === null) return null;
  return selection[0] === selection[1] ? selection[0] : selection;
}

function decodeSelection(encoded: number | [number, number] | null): [number, number] | null {
  if (encoded === null) return null;
  return typeof encoded === 'number' ? [encoded, encoded] : encoded;
}

function encodeStep(step: StepObservation, previous: CarriedState): EncodedStep {
  const encoded: EncodedStep = {};
  if (step.events.length > 0) encoded.e = compressEvents(step.events);
  if (step.text !== previous.text) encoded.t = step.text;
  if (!jsonEqual(step.value, step.text)) encoded.v = step.value;
  if (!jsonEqual(step.selection, previous.selection)) encoded.s = encodeSelection(step.selection);
  if (!jsonEqual(step.unmasked, previous.unmasked)) encoded.u = step.unmasked;
  if (!jsonEqual(step.complete, previous.complete)) encoded.c = step.complete;
  if (step.masked !== previous.masked) encoded.m = step.masked ? 1 : 0;
  if (!jsonEqual(step.attrs, previous.attrs)) encoded.a = step.attrs;
  if (step.log.length > 0) encoded.l = step.log;
  if (step.clipboard.length > 0) encoded.k = step.clipboard;
  if (step.submitted.length > 0) encoded.b = step.submitted;
  if (step.errors.length > 0) encoded.x = step.errors;
  if (step.result !== undefined) encoded.r = step.result;
  if (!jsonEqual(step.watched, previous.watched)) encoded.w = step.watched;
  return encoded;
}

function carry(step: StepObservation): CarriedState {
  return {
    text: step.text,
    selection: step.selection,
    unmasked: step.unmasked,
    complete: step.complete,
    masked: step.masked,
    attrs: step.attrs,
    watched: step.watched,
  };
}

function decodeStep(encoded: EncodedStep, previous: CarriedState): StepObservation {
  const stepText = encoded.t ?? previous.text;
  const step: StepObservation = {
    text: stepText,
    value: 'v' in encoded && encoded.v !== undefined ? encoded.v : stepText,
    selection: encoded.s === undefined ? previous.selection : decodeSelection(encoded.s),
    unmasked: encoded.u === undefined ? previous.unmasked : encoded.u,
    complete: encoded.c === undefined ? previous.complete : encoded.c,
    masked: encoded.m === undefined ? previous.masked : encoded.m === 1,
    attrs: encoded.a ?? previous.attrs,
    events: encoded.e === undefined ? [] : expandEvents(encoded.e),
    log: encoded.l ?? [],
    clipboard: encoded.k ?? [],
    submitted: encoded.b ?? [],
    errors: encoded.x ?? [],
  };
  if (encoded.r !== undefined) step.result = encoded.r;
  const watched = encoded.w ?? previous.watched;
  if (watched !== undefined) step.watched = watched;
  return step;
}

function encodeInteractive(observation: InteractiveObservation): EncodedStep[] {
  let previous = initialState();
  return observation.steps.map((step) => {
    const encoded = encodeStep(step, previous);
    previous = carry(step);
    return encoded;
  });
}

function decodeInteractive(encoded: EncodedStep[]): InteractiveObservation {
  let previous = initialState();
  const steps = encoded.map((entry) => {
    const step = decodeStep(entry, previous);
    previous = carry(step);
    return step;
  });
  return { kind: 'interactive', steps };
}

function encodeStatic(observation: StaticObservation): EncodedStatic {
  const inputs = observation.inputs.map((input): EncodedStaticInput => (
    input.log.length > 0
      ? [input.format, input.unmask, input.valid, input.log]
      : [input.format, input.unmask, input.valid]
  ));
  return [observation.emptyMask, observation.metadata, inputs];
}

function decodeStatic(encoded: EncodedStatic): StaticObservation {
  const [emptyMask, metadata, inputs] = encoded;
  return {
    kind: 'static',
    emptyMask,
    metadata,
    inputs: inputs.map(([format, unmask, valid, log]) => ({
      format, unmask, valid, log: log ?? [],
    })),
  };
}

export function encodeObservation(observation: Observation): EncodedObservation {
  return observation.kind === 'static' ? encodeStatic(observation) : encodeInteractive(observation);
}

function isEncodedStatic(encoded: EncodedObservation): encoded is EncodedStatic {
  return encoded.length === 3 && Array.isArray(encoded[2]);
}

/** Rebuilds full observations. Throws when the entry is not the scenario's kind. */
export function decodeObservation(encoded: EncodedObservation, kind: Scenario['kind']): Observation {
  if (kind === 'static') {
    if (!isEncodedStatic(encoded)) throw new Error('the fixture entry is not a static observation');
    return decodeStatic(encoded);
  }
  if (encoded.some((entry) => Array.isArray(entry) || entry === null || typeof entry !== 'object')) {
    throw new Error('the fixture entry is not a list of steps');
  }
  return decodeInteractive(encoded as EncodedStep[]);
}

/** One scenario per line, sorted by id, so fixtures diff and merge cleanly. */
export function stringifyFixture(fixture: Fixture): string {
  const lines = Object.keys(fixture)
    .toSorted()
    .map((id) => `${JSON.stringify(id)}:${JSON.stringify(fixture[id])}`);
  return `{\n${[`"${FORMAT_KEY}":${FIXTURE_FORMAT}`, ...lines].join(',\n')}\n}\n`;
}

export function parseFixture(source: string): Fixture {
  const parsed: unknown = JSON.parse(source);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('a fixture file holds one JSON object');
  }
  const { [FORMAT_KEY]: format, ...entries } = parsed as Record<string, unknown>;
  if (format !== FIXTURE_FORMAT) {
    throw new Error(`fixture format ${String(format)} is not ${FIXTURE_FORMAT}: record it again`);
  }
  return entries as Fixture;
}
