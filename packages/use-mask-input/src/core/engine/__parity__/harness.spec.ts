import { describe, expect, it } from 'vitest';

import {
  compressEvents, decodeObservation, encodeObservation, expandEvents, parseFixture, stringifyFixture,
} from './codec';
import { explainMismatch } from './diff';
import { inspect, toJson } from './inspect';
import { groupsFor, loadGroups } from './registry';
import {
  chars, interactive, mask, press, staticCase,
} from './scenario';

import type {
  InteractiveObservation, StaticObservation, StepObservation,
} from './types';

/**
 * The harness checked on its own, with no engine involved: a fixture must
 * give back exactly what was observed, and a mismatch must say where.
 */

function observed(overrides: Partial<StepObservation> = {}): StepObservation {
  return {
    text: '',
    value: '',
    selection: [0, 0],
    unmasked: null,
    complete: null,
    masked: false,
    attrs: [null, null, null, '', null],
    events: [],
    log: [],
    clipboard: [],
    submitted: [],
    errors: [],
    ...overrides,
  };
}

const session: InteractiveObservation = {
  kind: 'interactive',
  steps: [
    observed({
      masked: true, unmasked: '', complete: false, attrs: [null, 'text', null, '', null],
    }),
    observed({
      masked: true, text: '__-__', unmasked: '', complete: false, attrs: [null, 'text', null, '', null], events: ['focus'],
    }),
    observed({
      masked: true,
      text: '12-__',
      value: '12-__',
      selection: [3, 3],
      unmasked: '12',
      complete: false,
      attrs: [null, 'text', null, '', null],
      events: ['keydown!', '~input!', '|', 'keydown!', '~input!'],
      log: ['onKeyDown(<input>)'],
    }),
    observed({
      masked: true,
      text: '12-__',
      value: 12,
      selection: [0, 5],
      unmasked: 12,
      complete: false,
      attrs: ['5', 'text', '__-__', 'right', null],
      clipboard: ['12'],
      submitted: ['12'],
      errors: ['Error: boom'],
      result: { throws: 'Error: nope' },
    }),
    observed({ selection: null, text: '12', value: '12' }),
  ],
};

const answers: StaticObservation = {
  kind: 'static',
  emptyMask: '__-__',
  metadata: { throws: 'Error: nope' },
  inputs: [
    {
      format: '12-__', unmask: '12', valid: false, log: [],
    },
    {
      format: { throws: 'TypeError: x' }, unmask: 12, valid: true, log: ['onBeforeMask(Inputmask, "1")'],
    },
  ],
};

describe('fixture encoding', () => {
  it('gives an interactive observation back unchanged', () => {
    expect(decodeObservation(encodeObservation(session), 'interactive')).toEqual(session);
  });

  it('gives a static observation back unchanged', () => {
    expect(decodeObservation(encodeObservation(answers), 'static')).toEqual(answers);
  });

  it('stores only what changed since the step before', () => {
    expect(encodeObservation(session)).toEqual([
      {
        u: '', c: false, m: 1, a: [null, 'text', null, '', null],
      },
      { e: 'focus', t: '__-__', v: '' },
      {
        e: '2*(keydown! ~input!)', t: '12-__', s: 3, u: '12', l: ['onKeyDown(<input>)'],
      },
      {
        v: 12, s: [0, 5], u: 12, a: ['5', 'text', '__-__', 'right', null], k: ['12'], b: ['12'], x: ['Error: boom'], r: { throws: 'Error: nope' },
      },
      {
        t: '12', s: null, u: null, c: null, m: 0, a: [null, null, null, '', null],
      },
    ]);
  });

  it('folds repeated keystrokes and unfolds them again', () => {
    const events = ['a', 'b', '|', 'a', 'b', '|', 'a', 'b', 'c', '|', '|', 'd'];

    expect(compressEvents(events)).toBe('2*(a b) | a b c |  | d');
    expect(expandEvents(compressEvents(events))).toEqual(events);
    expect(expandEvents(compressEvents(['|']))).toEqual(['|']);
  });

  it('refuses an entry of the other kind', () => {
    expect(() => decodeObservation(encodeObservation(answers), 'interactive')).toThrow(/not a list of steps/);
    expect(() => decodeObservation(encodeObservation(session), 'static')).toThrow(/not a static observation/);
  });

  it('writes one scenario per line, sorted by id', () => {
    const source = stringifyFixture({ 'b/second': encodeObservation(answers), 'a/first': encodeObservation(session) });
    const lines = source.split('\n');

    expect(lines[0]).toBe('{');
    expect(lines[1]).toBe('"$format":1,');
    expect(lines[2].startsWith('"a/first":[')).toBe(true);
    expect(lines[3].startsWith('"b/second":[')).toBe(true);
    expect(Object.keys(parseFixture(source))).toEqual(['a/first', 'b/second']);
  });

  it('refuses a fixture written in another format', () => {
    expect(() => parseFixture('{"$format":0}')).toThrow(/record it again/);
  });
});

describe('failure messages', () => {
  const scenario = interactive('demo/typing', { mask: '99-99' }, [mask(), chars('12'), press('Home', { shift: true })]);
  const context = { env: 'unit', fixture: 'fixtures/unit/demo.json' } as const;
  const expected: InteractiveObservation = { kind: 'interactive', steps: session.steps.slice(0, 4) };

  it('says nothing when the observations agree', () => {
    expect(explainMismatch(scenario, expected, expected, context)).toBeUndefined();
  });

  it('names the scenario, the step, and each field that differs', () => {
    const actual: InteractiveObservation = {
      kind: 'interactive',
      steps: expected.steps.map((step, index) => (
        index === 2 ? { ...step, text: '1_-__', selection: [1, 1], events: ['keydown!'] } : step
      )),
    };
    const message = explainMismatch(scenario, expected, actual, context) ?? '';

    expect(message).toContain('demo/typing: the engine diverges from the fixture at step 2 of 4 (unit)');
    expect(message).toContain('step 2: type "2"');
    expect(message).toMatch(/text\s+expected "12-__"\n\s+actual {3}"1_-__"/);
    expect(message).toMatch(/selection\s+expected \[3, 3\]\n\s+actual {3}\[1, 1\]/);
    expect(message).toMatch(/events\s+expected 2\*\(keydown! ~input!\)\n\s+actual {3}keydown!/);
    expect(message).toContain('steps before it: 0 mask (scenario options) · 1 type "1"');
    expect(message).toContain('options: { mask: "99-99" }');
    expect(message).not.toContain('unmaskedvalue()');
  });

  it('asks for a new recording when the scenario changed shape', () => {
    const shorter: InteractiveObservation = { kind: 'interactive', steps: expected.steps.slice(0, 2) };

    expect(explainMismatch(scenario, shorter, expected, context)).toContain('Record it again');
  });

  it('names the input of a static scenario', () => {
    const lookup = staticCase('demo/static', { mask: '99-99' }, ['12', '1234']);
    const actual: StaticObservation = {
      ...answers,
      inputs: [answers.inputs[0], { ...answers.inputs[1], valid: false }],
    };
    const message = explainMismatch(lookup, answers, actual, context) ?? '';

    expect(message).toContain('demo/static: the engine diverges from the fixture (unit)');
    expect(message).toContain('input 1: "1234"');
    expect(message).toMatch(/isValid\s+expected true\n\s+actual {3}false/);
  });
});

describe('value rendering', () => {
  it('renders callback arguments the same whatever built them', () => {
    expect(inspect({ b: 1, a: [undefined, null, 'x'] })).toBe('{a:[undefined,null,"x"],b:1}');
    expect(inspect(['1', '2', '_'])).toBe("'12_'");
    expect(inspect(['1', 2])).toBe('["1",2]');
    expect(inspect(document.createElement('input'))).toBe('<input>');
    expect(inspect(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }))).toBe('Event(keydown key="a" ctrl)');
    expect(inspect(new KeyboardEvent('keydown', { key: 'Meta', metaKey: true }), { neutralModifiers: true }))
      .toBe('Event(keydown key="Mod" mod)');
  });

  it('turns what JSON cannot hold into tags', () => {
    expect(toJson({ b: undefined, a: Number.NaN, c: () => 1 })).toEqual({ a: '«NaN»', b: '«undefined»', c: '«function»' });
  });
});

describe('scenario corpus', () => {
  it('loads, with ids that are valid and unique', () => {
    const scenarios = loadGroups().flatMap((group) => group.scenarios);

    expect(scenarios.length).toBeGreaterThanOrEqual(150);
    expect(scenarios.some((scenario) => scenario.kind === 'static')).toBe(true);
    expect(scenarios.some((scenario) => scenario.kind === 'interactive')).toBe(true);
  });

  it('keeps fresh scenarios out of the browser', () => {
    const inBrowser = groupsFor('browser').flatMap((group) => group.scenarios);

    expect(inBrowser.some((scenario) => scenario.fresh)).toBe(false);
  });
});
