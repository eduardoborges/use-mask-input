import {
  assign, blur, call, chars, focus, interactive, mask, paste, press, setValue, spy, staticCase,
  text,
} from '../scenario';

import type { OptionsSource, Scenario, ScenarioContext } from '../types';

/**
 * The callbacks. Each one is a spy, so the fixture holds `this` and every
 * argument of every call: being called the way upstream calls them is part of
 * the contract. Callbacks reached only by the harness reading an observation
 * are not logged; `call(...)` steps are there to trigger those on purpose.
 */

const CODE = '99-99';

const onBeforeMask: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  onBeforeMask: spy(context, 'onBeforeMask', (value: string) => value.replace(/x/g, '')),
});

const onBeforeMaskReturningNothing: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  onBeforeMask: spy(context, 'onBeforeMask'),
});

const onBeforePaste: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  onBeforePaste: spy(context, 'onBeforePaste', (pasted: string) => pasted.replace(/\D/g, '')),
});

const onBeforePasteRefusing: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  onBeforePaste: spy(context, 'onBeforePaste', (pasted: string) => (pasted.includes('!') ? false : '')),
});

const onBeforeWrite: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  onBeforeWrite: spy(context, 'onBeforeWrite'),
});

const onBeforeWriteRewriting: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  onBeforeWrite: spy(context, 'onBeforeWrite', (_event: unknown, buffer: string[]) => (
    buffer.join('') === '12-__'
      ? { refreshFromBuffer: true, buffer: ['9', '9', '-', '_', '_'], caret: 3 }
      : undefined
  )),
});

const onUnMask: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  onUnMask: spy(context, 'onUnMask', (_masked: string, unmasked: string) => `<${unmasked}>`),
});

const onKeyDown: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  onKeyDown: spy(context, 'onKeyDown'),
});

const onKeyDownCancelling: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  onKeyDown: spy(context, 'onKeyDown', (event: KeyboardEvent) => (event.key === '5' ? false : undefined)),
});

const onKeyValidation: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  onKeyValidation: spy(context, 'onKeyValidation'),
});

const completionEvents: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  oncomplete: spy(context, 'oncomplete'),
  onincomplete: spy(context, 'onincomplete'),
  oncleared: spy(context, 'oncleared'),
});

const isComplete: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  isComplete: spy(context, 'isComplete', (buffer: string[]) => buffer.join('').startsWith('12')),
});

const preValidation: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  preValidation: spy(context, 'preValidation', (_buffer: string[], _position: number, character: string) => character !== '5'),
});

const preValidationCommand: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  preValidation: spy(context, 'preValidation', (_buffer: string[], position: number, character: string) => (
    character === '7' ? { pos: position, c: '8' } : true
  )),
});

const postValidation: OptionsSource = (context: ScenarioContext) => ({
  mask: CODE,
  postValidation: spy(context, 'postValidation', (buffer: string[], _position: number, _character: string, result: unknown) => (
    buffer.join('').startsWith('13') ? false : result
  )),
});

const definitionValidator: OptionsSource = (context: ScenarioContext) => ({
  mask: 'ee-ee',
  definitions: {
    e: { validator: spy(context, 'validator', (character: string) => /[02468]/.test(character)) },
  },
});

const casingFunction: OptionsSource = (context: ScenarioContext) => ({
  mask: 'aa-aa',
  casing: spy(context, 'casing', (character: string, _test: unknown, position: number) => (
    position === 0 ? character.toUpperCase() : character
  )),
});

const maskFunction: OptionsSource = (context: ScenarioContext) => ({
  mask: spy(context, 'mask', () => CODE),
});

const throwingOnKeyDown: OptionsSource = () => ({
  mask: CODE,
  onKeyDown: () => {
    throw new Error('onKeyDown blew up');
  },
});

const throwingOnKeyValidation: OptionsSource = () => ({
  mask: CODE,
  onKeyValidation: () => {
    throw new Error('onKeyValidation blew up');
  },
});

const throwingOnBeforePaste: OptionsSource = () => ({
  mask: CODE,
  onBeforePaste: () => {
    throw new Error('onBeforePaste blew up');
  },
});

const throwingOnBeforeMask: OptionsSource = () => ({
  mask: CODE,
  onBeforeMask: () => {
    throw new Error('onBeforeMask blew up');
  },
});

export const scenarios: Scenario[] = [
  interactive('callbacks/on-before-mask', onBeforeMask, [
    mask(), setValue('1x2x34'), assign('5x6'), focus(), paste('7x8'), blur(),
  ], { element: { value: '9x9' } }),
  staticCase('callbacks/on-before-mask/static', onBeforeMask, ['1x2', 'xx', '', '12-34']),
  staticCase('callbacks/on-before-mask/returning-nothing', onBeforeMaskReturningNothing, ['12', '']),

  interactive('callbacks/on-before-paste', onBeforePaste, [
    mask(), focus(), paste('a1b2c3d4'), paste('zz'), blur(),
  ]),
  interactive('callbacks/on-before-paste/refusing', onBeforePasteRefusing, [
    mask(), focus(), chars('12'), paste('3!4'), paste('34'), blur(),
  ]),

  interactive('callbacks/on-before-write', onBeforeWrite, [
    mask(), focus(), chars('12'), press('Backspace'), paste('34'), setValue('56'), blur(),
  ]),
  interactive('callbacks/on-before-write/rewriting', onBeforeWriteRewriting, [
    mask(), focus(), chars('123'), blur(),
  ]),
  staticCase('callbacks/on-before-write/static', onBeforeWrite, ['12', '1234']),

  interactive('callbacks/on-un-mask', onUnMask, [
    mask(), focus(), chars('12'), call('unmaskedvalue'), chars('34'), call('unmaskedvalue'), blur(),
  ]),
  staticCase('callbacks/on-un-mask/static', onUnMask, ['', '12', '1234']),
  interactive('callbacks/on-un-mask/with-auto-unmask', (context: ScenarioContext) => ({
    mask: CODE,
    autoUnmask: true,
    onUnMask: spy(context, 'onUnMask', (_masked: string, unmasked: string) => unmasked.split('').toReversed().join('')),
  }), [
    mask(), focus(), chars('1234'), call('unmaskedvalue'), blur(),
  ]),

  interactive('callbacks/on-key-down', onKeyDown, [
    mask(), focus(), chars('1x'), press('Backspace'), press('ArrowLeft', { shift: true }), press('Tab'),
  ]),
  interactive('callbacks/on-key-down/cancelling', onKeyDownCancelling, [
    mask(), focus(), chars('1525'), blur(),
  ]),
  interactive('callbacks/on-key-validation', onKeyValidation, [
    mask(), focus(), chars('1a2'), press('Backspace'), blur(),
  ]),

  interactive('callbacks/completion-events', completionEvents, [
    mask(), focus(), chars('1234'), press('Backspace'), press('Backspace'), press('Backspace'),
    press('Backspace'), text('1'), blur(),
  ]),
  interactive('callbacks/is-complete', isComplete, [
    mask(), focus(), text('1'), call('isComplete'), text('2'), call('isComplete'), blur(),
  ]),
  staticCase('callbacks/is-complete/static', isComplete, ['', '12', '12-34', '34-12']),

  interactive('callbacks/pre-validation', preValidation, [
    mask(), focus(), chars('1525'), blur(),
  ]),
  interactive('callbacks/pre-validation/command', preValidationCommand, [
    mask(), focus(), chars('1727'), blur(),
  ]),
  interactive('callbacks/post-validation', postValidation, [
    mask(), focus(), chars('1324'), blur(),
  ]),
  staticCase('callbacks/post-validation/static', postValidation, ['12', '13', '1324']),

  interactive('callbacks/definition-validator', definitionValidator, [
    mask(), focus(), chars('2143'), blur(),
  ]),
  interactive('callbacks/casing-function', casingFunction, [
    mask(), focus(), chars('abCD'), blur(),
  ]),
  interactive('callbacks/mask-function', maskFunction, [
    mask(), focus(), chars('12'), mask(), blur(),
  ]),

  // When a callback throws, the error lands in the observation: the run goes
  // on, and the scenario cannot pass by accident.
  interactive('callbacks/throwing/on-key-down', throwingOnKeyDown, [
    mask(), focus(), text('1'), blur(),
  ]),
  interactive('callbacks/throwing/on-key-validation', throwingOnKeyValidation, [
    mask(), focus(), text('1'), text('2'), blur(),
  ]),
  interactive('callbacks/throwing/on-before-paste', throwingOnBeforePaste, [
    mask(), focus(), paste('12'), text('3'), blur(),
  ]),
  interactive('callbacks/throwing/on-before-mask', throwingOnBeforeMask, [
    mask(), setValue('12'), focus(), text('3'), blur(),
  ]),
  staticCase('callbacks/throwing/on-before-mask/static', throwingOnBeforeMask, ['12']),
];
