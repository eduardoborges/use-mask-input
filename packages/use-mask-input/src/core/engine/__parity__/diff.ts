import { compressEvents } from './codec';
import { jsonEqual, toLiteral } from './inspect';

import type {
  InteractiveObservation,
  InteractiveScenario,
  JsonValue,
  KeyModifiers,
  Observation,
  OptionsSource,
  ParityEnv,
  Scenario,
  StaticInputObservation,
  StaticObservation,
  StaticScenario,
  Step,
  StepObservation,
} from './types';

/**
 * Turns two observations into a message an engineer can act on without
 * opening the fixture: which scenario, which step, what the step did, and
 * expected against actual for every field that differs.
 */

export interface MismatchContext {
  env: ParityEnv;
  /** Path of the fixture file, as shown to the reader. */
  fixture: string;
}

interface Difference {
  field: string;
  expected: string[];
  actual: string[];
}

const LEGEND = 'legend: "~" dispatched from script, "!" default prevented, "|" next keystroke';
const RECORD_HINT = 'The scenario changed since it was recorded. Record it again (see __parity__/README.md).';
const MAX_LIST = 12;
/** A static scenario that is wrong is usually wrong on every input; a few make the point. */
const MAX_INPUTS = 5;

function modifiersOf(step: KeyModifiers): string {
  const names = (['ctrl', 'meta', 'alt', 'shift'] as const).filter((name) => step[name]);
  return names.length > 0 ? ` (${names.join('+')})` : '';
}

function optionsOf(source: OptionsSource | undefined): string {
  if (source === undefined) return '';
  if (typeof source !== 'function') return toLiteral(source);
  try {
    return toLiteral(source({ log: () => undefined }));
  } catch {
    return '(options factory)';
  }
}

function timingOf(step: Step): string {
  const notes: string[] = [];
  if (step.gap !== undefined) notes.push(`gap ${step.gap}ms`);
  if (step.settle === false) notes.push('timers left pending');
  return notes.length > 0 ? ` [${notes.join(', ')}]` : '';
}

function actionOf(step: Step): string {
  switch (step.do) {
    case 'mask':
      return step.options === undefined ? 'mask (scenario options)' : `mask ${optionsOf(step.options)}`;
    case 'option':
      return `option ${optionsOf(step.options)}${step.noremask ? ', noremask' : ''}`;
    case 'call':
      return `call ${step.method}(${(step.args ?? []).map((arg) => toLiteral(arg)).join(', ')})`;
    case 'focus':
      return step.via === 'tab' ? 'focus with Tab' : 'focus';
    case 'click':
      return step.caret === undefined ? 'click at the end of the text' : `click at caret ${step.caret}`;
    case 'type':
      return `type ${JSON.stringify(step.text)}${step.burst ? ' in a burst' : ''}`;
    case 'key':
      return `press ${step.key === ' ' ? 'Space' : step.key}${modifiersOf(step)}`;
    case 'select':
      return `select ${step.start}..${step.end ?? step.start}`;
    case 'paste':
      return `paste ${JSON.stringify(step.text)}`;
    case 'setValue':
      return `setValue(${JSON.stringify(step.value)})${step.via === 'static' ? ' through Inputmask.setValue' : ''}`;
    case 'assign':
      return `el.value = ${JSON.stringify(step.value)}`;
    case 'nativeInput': {
      const { do: kind, gap, settle, ...details } = step;
      return `${kind} ${toLiteral(details)}`;
    }
    case 'remove':
      return step.via === 'static' ? 'Inputmask.remove(el)' : 'remove()';
    case 'attr':
      return step.value === null ? `remove attribute ${step.name}` : `set attribute ${step.name}=${JSON.stringify(step.value)}`;
    case 'orphan':
      return 'el.inputmask = undefined';
    case 'dispatch':
      return `dispatch ${step.event}${step.detail === undefined ? '' : ` with detail ${toLiteral(step.detail)}`}`;
    case 'hook':
      return `${step.remove ? 'remove' : 'set'} ${step.name} on the ${step.on ?? 'instance'}`;
    case 'script':
      return `script ${JSON.stringify(step.label)}`;
    default:
      return step.do;
  }
}

/** A step as a reader would say it: `type "4"`, `press Home (shift)`. */
export function describeStep(step: Step): string {
  return `${actionOf(step)}${timingOf(step)}`;
}

function showList(items: string[]): string[] {
  if (items.length === 0) return ['(none)'];
  if (items.length <= MAX_LIST) return items;
  return [...items.slice(0, MAX_LIST), `… ${items.length - MAX_LIST} more`];
}

function compare(field: string, expected: JsonValue | undefined, actual: JsonValue | undefined): Difference[] {
  if (jsonEqual(expected, actual)) return [];
  return [{
    field,
    expected: [expected === undefined ? '(nothing)' : toLiteral(expected)],
    actual: [actual === undefined ? '(nothing)' : toLiteral(actual)],
  }];
}

function compareLists(field: string, expected: string[], actual: string[]): Difference[] {
  if (jsonEqual(expected, actual)) return [];
  return [{ field, expected: showList(expected), actual: showList(actual) }];
}

function compareEvents(expected: string[], actual: string[]): Difference[] {
  if (jsonEqual(expected, actual)) return [];
  return [{
    field: 'events',
    expected: [expected.length > 0 ? compressEvents(expected) : '(none)'],
    actual: [actual.length > 0 ? compressEvents(actual) : '(none)'],
  }];
}

function compareSteps(expected: StepObservation, actual: StepObservation, watch: readonly string[]): Difference[] {
  const attributeNames = ['maxlength', 'inputmode', 'placeholder', 'style.textAlign', 'dir'];
  return [
    ...compare('text', expected.text, actual.text),
    ...compare('el.value', expected.value, actual.value),
    ...compare('selection', expected.selection, actual.selection),
    ...compare('unmaskedvalue()', expected.unmasked, actual.unmasked),
    ...compare('isComplete()', expected.complete, actual.complete),
    ...compare('el.inputmask', expected.masked, actual.masked),
    ...attributeNames.flatMap((name, index) => compare(name, expected.attrs[index], actual.attrs[index])),
    ...watch.flatMap((name, index) => compare(name, expected.watched?.[index], actual.watched?.[index])),
    ...compareEvents(expected.events, actual.events),
    ...compareLists('callback log', expected.log, actual.log),
    ...compareLists('clipboard', expected.clipboard, actual.clipboard),
    ...compareLists('submitted', expected.submitted, actual.submitted),
    ...compareLists('errors', expected.errors, actual.errors),
    ...compare('returned', expected.result, actual.result),
  ];
}

function compareInputs(expected: StaticInputObservation, actual: StaticInputObservation): Difference[] {
  return [
    ...compare('format', expected.format, actual.format),
    ...compare('unmask', expected.unmask, actual.unmask),
    ...compare('isValid', expected.valid, actual.valid),
    ...compareLists('callback log', expected.log, actual.log),
  ];
}

function renderDifferences(differences: Difference[], indent: string): string[] {
  const width = Math.max(...differences.map((difference) => difference.field.length));
  return differences.flatMap((difference) => {
    const label = `${indent}${difference.field.padEnd(width)}  `;
    const blank = ' '.repeat(label.length);
    const side = (name: string, lines: string[], first: boolean): string[] => lines.map((line, index) => (
      `${first && index === 0 ? label : blank}${index === 0 ? name : ' '.repeat(name.length)}${line}`
    ));
    return [
      ...side('expected ', difference.expected, true),
      ...side('actual   ', difference.actual, false),
    ];
  });
}

function elementOf(scenario: InteractiveScenario): string {
  const setup = scenario.element ?? {};
  const attributes = Object.entries({
    ...(setup.type === undefined ? {} : { type: setup.type }),
    ...setup.attrs,
    ...(setup.value === undefined ? {} : { value: setup.value }),
  }).map(([name, value]) => ` ${name}=${JSON.stringify(value)}`);
  return `<${setup.tag ?? 'input'}${attributes.join('')}>${setup.form ? ' inside a form' : ''}`;
}

function footer(scenario: Scenario, context: MismatchContext): string[] {
  return [
    '',
    `  options: ${optionsOf(scenario.options)}`,
    ...(scenario.kind === 'interactive' ? [`  element: ${elementOf(scenario)}`] : []),
    `  fixture: ${context.fixture}`,
    `  ${LEGEND}`,
  ];
}

function explainInteractive(
  scenario: InteractiveScenario,
  expected: InteractiveObservation,
  actual: InteractiveObservation,
  context: MismatchContext,
): string | undefined {
  const who = `${scenario.id}: the engine`;
  if (expected.steps.length !== actual.steps.length) {
    return [
      `${who} ran ${actual.steps.length} steps and the fixture holds ${expected.steps.length} (${context.env}).`,
      RECORD_HINT,
      ...footer(scenario, context),
    ].join('\n');
  }

  const differing = actual.steps
    .map((step, index) => ({ index, differences: compareSteps(expected.steps[index], step, scenario.watch ?? []) }))
    .filter((entry) => entry.differences.length > 0);
  if (differing.length === 0) return undefined;

  const [first, ...others] = differing;
  const lead = scenario.steps
    .slice(Math.max(0, first.index - 6), first.index)
    .map((step, offset) => `${Math.max(0, first.index - 6) + offset} ${describeStep(step)}`);

  return [
    `${who} diverges from the fixture at step ${first.index} of ${scenario.steps.length} (${context.env})`,
    '',
    `  step ${first.index}: ${describeStep(scenario.steps[first.index])}`,
    ...renderDifferences(first.differences, '    '),
    '',
    `  steps before it: ${lead.length > 0 ? lead.join(' · ') : '(none, this is the first)'}`,
    ...(others.length > 0 ? [`  later steps that differ too: ${others.map((entry) => entry.index).join(', ')}`] : []),
    ...footer(scenario, context),
  ].join('\n');
}

function explainStatic(
  scenario: StaticScenario,
  expected: StaticObservation,
  actual: StaticObservation,
  context: MismatchContext,
): string | undefined {
  const who = `${scenario.id}: the engine`;
  if (expected.inputs.length !== actual.inputs.length) {
    return [
      `${who} ran ${actual.inputs.length} inputs and the fixture holds ${expected.inputs.length} (${context.env}).`,
      RECORD_HINT,
      ...footer(scenario, context),
    ].join('\n');
  }

  const general = [
    ...compare('getemptymask()', expected.emptyMask, actual.emptyMask),
    ...compare('getmetadata()', expected.metadata, actual.metadata),
  ];
  const inputs = actual.inputs
    .map((input, index) => ({ index, differences: compareInputs(expected.inputs[index], input) }))
    .filter((entry) => entry.differences.length > 0);
  if (general.length === 0 && inputs.length === 0) return undefined;

  return [
    `${who} diverges from the fixture (${context.env})`,
    '',
    ...(general.length > 0 ? renderDifferences(general, '  ') : []),
    ...inputs.slice(0, MAX_INPUTS).flatMap((entry) => [
      `  input ${entry.index}: ${JSON.stringify(scenario.inputs[entry.index])}`,
      ...renderDifferences(entry.differences, '    '),
    ]),
    ...(inputs.length > MAX_INPUTS
      ? [`  other inputs that differ too: ${inputs.slice(MAX_INPUTS).map((entry) => entry.index).join(', ')}`]
      : []),
    ...footer(scenario, context),
  ].join('\n');
}

/** Undefined when the two observations are the same. */
export function explainMismatch(
  scenario: Scenario,
  expected: Observation,
  actual: Observation,
  context: MismatchContext,
): string | undefined {
  if (scenario.kind === 'static' && expected.kind === 'static' && actual.kind === 'static') {
    return explainStatic(scenario, expected, actual, context);
  }
  if (scenario.kind === 'interactive' && expected.kind === 'interactive' && actual.kind === 'interactive') {
    return explainInteractive(scenario, expected, actual, context);
  }
  return `${scenario.id}: the fixture holds a ${expected.kind} observation for a ${scenario.kind} scenario. ${RECORD_HINT}`;
}
