import type { ResolvedOptions } from './types';

/**
 * Default options. This object is the prototype registry itself:
 * `extendDefaults` merges into it.
 */
export const defaults: ResolvedOptions = {
  _maxTestPos: 500,
  placeholder: '_',
  optionalmarker: ['[', ']'],
  quantifiermarker: ['{', '}'],
  groupmarker: ['(', ')'],
  alternatormarker: '|',
  escapeChar: '\\',
  // `null`, because `extend` skips `undefined`: an option has to hold a value
  // for a merge to carry it.
  mask: null,
  regex: null,
  oncomplete: () => {},
  onincomplete: () => {},
  oncleared: () => {},
  repeat: 0,
  greedy: false,
  autoUnmask: false,
  removeMaskOnSubmit: false,
  clearMaskOnLostFocus: true,
  insertMode: true,
  insertModeVisual: true,
  clearIncomplete: false,
  alias: null,
  onKeyDown: () => {},
  onBeforeMask: null,
  onBeforePaste(pastedValue, opts) {
    return typeof opts.onBeforeMask === 'function'
      ? opts.onBeforeMask.call(this, pastedValue, opts)
      : pastedValue;
  },
  onBeforeWrite: null,
  onUnMask: null,
  outputMask: null,
  showMaskOnFocus: true,
  showMaskOnHover: true,
  onKeyValidation: () => {},
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
};
