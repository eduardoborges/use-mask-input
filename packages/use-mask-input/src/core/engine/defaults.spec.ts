import { describe, expect, it } from 'vitest';

import { defaults } from './defaults';

import type { Engine, MaskedElement, ResolvedOptions } from './types';

const CALLBACK_KEYS = [
  'oncomplete', 'onincomplete', 'oncleared', 'onKeyDown', 'onBeforePaste', 'onKeyValidation',
];

describe('defaults', () => {
  it('holds every core option with its default value', () => {
    const values = Object.fromEntries(
      Object.entries(defaults).filter(([key]) => !CALLBACK_KEYS.includes(key)),
    );

    expect(values).toEqual({
      _maxTestPos: 500,
      placeholder: '_',
      optionalmarker: ['[', ']'],
      quantifiermarker: ['{', '}'],
      groupmarker: ['(', ')'],
      alternatormarker: '|',
      escapeChar: '\\',
      mask: null,
      regex: null,
      repeat: 0,
      greedy: false,
      autoUnmask: false,
      removeMaskOnSubmit: false,
      clearMaskOnLostFocus: true,
      insertMode: true,
      insertModeVisual: true,
      clearIncomplete: false,
      alias: null,
      onBeforeMask: null,
      onBeforeWrite: null,
      onUnMask: null,
      outputMask: null,
      showMaskOnFocus: true,
      showMaskOnHover: true,
      skipOptionalPartCharacter: ' ',
      numericInput: false,
      rightAlign: false,
      undoOnEscape: true,
      radixPoint: '',
      _radixDance: false,
      groupSeparator: '',
      keepStatic: null,
      positionCaretOnTab: true,
      tabThrough: false,
      supportsInputType: ['text', 'tel', 'url', 'password', 'search'],
      isComplete: null,
      preValidation: null,
      postValidation: null,
      staticDefinitionSymbol: undefined,
      jitMasking: false,
      nullable: true,
      inputEventOnly: false,
      noValuePatching: false,
      positionCaretOnClick: 'lvp',
      casing: null,
      inputmode: 'text',
      importDataAttributes: true,
      shiftPositions: true,
      usePrototypeDefinitions: true,
      validationEventTimeOut: 3000,
      substitutes: {},
    });
  });

  it('lists the options in a fixed order, which data-attribute import follows', () => {
    expect(Object.keys(defaults)).toEqual([
      '_maxTestPos', 'placeholder', 'optionalmarker', 'quantifiermarker', 'groupmarker',
      'alternatormarker', 'escapeChar', 'mask', 'regex', 'oncomplete', 'onincomplete', 'oncleared',
      'repeat', 'greedy', 'autoUnmask', 'removeMaskOnSubmit', 'clearMaskOnLostFocus', 'insertMode',
      'insertModeVisual', 'clearIncomplete', 'alias', 'onKeyDown', 'onBeforeMask', 'onBeforePaste',
      'onBeforeWrite', 'onUnMask', 'outputMask', 'showMaskOnFocus', 'showMaskOnHover',
      'onKeyValidation', 'skipOptionalPartCharacter', 'numericInput', 'rightAlign', 'undoOnEscape',
      'radixPoint', '_radixDance', 'groupSeparator', 'keepStatic', 'positionCaretOnTab',
      'tabThrough', 'supportsInputType', 'isComplete', 'preValidation', 'postValidation',
      'staticDefinitionSymbol', 'jitMasking', 'nullable', 'inputEventOnly', 'noValuePatching',
      'positionCaretOnClick', 'casing', 'inputmode', 'importDataAttributes', 'shiftPositions',
      'usePrototypeDefinitions', 'validationEventTimeOut', 'substitutes',
    ]);
  });

  it('keeps staticDefinitionSymbol as a key even though it has no value', () => {
    expect('staticDefinitionSymbol' in defaults).toBe(true);
    expect(defaults.staticDefinitionSymbol).toBeUndefined();
  });

  it('has callbacks that do nothing until the user sets them', () => {
    const element = document.createElement('input') as HTMLElement as MaskedElement;
    const event = new Event('complete');

    expect(defaults.oncomplete.call(element, event)).toBeUndefined();
    expect(defaults.onincomplete.call(element, event)).toBeUndefined();
    expect(defaults.oncleared.call(element, event)).toBeUndefined();
    expect(defaults.onKeyDown.call(element, event, [], { begin: 0, end: 0 }, defaults)).toBeUndefined();
    expect(defaults.onKeyValidation.call(element, 'a', true)).toBeUndefined();
  });

  it('gives each no-op callback its own function', () => {
    const noops = [
      defaults.oncomplete, defaults.onincomplete, defaults.oncleared,
      defaults.onKeyDown, defaults.onKeyValidation,
    ];

    expect(new Set(noops).size).toBe(noops.length);
  });

  describe('onBeforePaste', () => {
    const engine = { tag: 'engine' } as unknown as Engine;
    const paste = defaults.onBeforePaste as NonNullable<ResolvedOptions['onBeforePaste']>;

    it('returns the pasted value untouched when there is no onBeforeMask', () => {
      expect(paste.call(engine, 'pasted', defaults)).toBe('pasted');
    });

    it('runs the pasted value through onBeforeMask, on the same engine and options', () => {
      const seen: unknown[] = [];
      const opts: ResolvedOptions = {
        ...defaults,
        onBeforeMask(initialValue, options) {
          seen.push(this, initialValue, options);
          return initialValue.toUpperCase();
        },
      };

      expect(paste.call(engine, 'pasted', opts)).toBe('PASTED');
      expect(seen).toEqual([engine, 'pasted', opts]);
      expect(seen[0]).toBe(engine);
      expect(seen[2]).toBe(opts);
    });

    it('hands back whatever onBeforeMask returns, even nothing', () => {
      const opts: ResolvedOptions = { ...defaults, onBeforeMask: () => undefined };

      expect(paste.call(engine, 'pasted', opts)).toBeUndefined();
    });
  });
});
