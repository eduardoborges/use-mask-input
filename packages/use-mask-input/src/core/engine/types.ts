import type { Options } from '../../types/inputmask.types';

import type { InputmaskFactory, OptionMethods } from './Inputmask';
import type { ApiMethods } from './methods/api';
import type { EventHandlerMethods } from './methods/eventHandlers';
import type { EventRulerMethods } from './methods/eventRuler';
import type { InputHandlingMethods } from './methods/inputHandling';
import type { LexerMethods } from './methods/lexer';
import type { MaskBindingMethods } from './methods/mask';
import type { PositioningMethods } from './methods/positioning';
import type { TestsMethods } from './methods/tests';
import type { ValidationMethods } from './methods/validation';

// ---------------------------------------------------------------------------
// Elements and events
// ---------------------------------------------------------------------------

/**
 * The element a mask is bound to: an `<input>`, a `<textarea>` or a
 * contenteditable host.
 *
 * A contenteditable host has none of the text-control members at run time.
 * The engine probes the selection ones before use, so those are optional. It
 * reads the others unguarded, as Inputmask does, and gets `undefined` there.
 * `value` is the exception: the engine defines it on such a host itself.
 */
export interface MaskedElement extends HTMLElement {
  inputmask?: Engine;
  value: string;
  placeholder: string;
  maxLength: number;
  autocomplete: string;
  form: HTMLFormElement | null;
  disabled: boolean;
  readOnly: boolean;
  selectionStart?: number | null;
  selectionEnd?: number | null;
  setSelectionRange?(
    start: number | null,
    end: number | null,
    direction?: 'forward' | 'backward' | 'none',
  ): void;
}

/** What the public API accepts as a target: a selector or id, one element, or a list of them. */
export type MaskTargets = string | HTMLElement | ArrayLike<HTMLElement>;

/**
 * Any event that reaches the engine: a DOM event, or one built with
 * `createEvent` to replay a key. Only some events carry the fields below, so
 * they are optional here and every `Event` fits.
 */
export interface MaskEvent extends Event {
  key?: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  location?: number;
  /** Text of an `input` event. */
  data?: string | null;
}

/** Selection inside the element. `begin > end` happens in RTL masks. */
export interface CaretPosition {
  begin: number;
  end: number;
}

/** What `caret` accepts when it sets the selection. */
export type CaretTarget = number | [begin: number, end: number] | CaretPosition;

/** The caret the engine last set. `checkVal` writes it without an `end`. */
export interface TrackedCaret {
  begin: number;
  end?: number;
}

/** `detail` of a `setvalue` event: the value to apply, then an optional caret. */
export type SetValueDetail = [value?: string, caret?: CaretTarget];

/** The `setvalue` event. `detail` is `null` when it was triggered without arguments. */
export type SetValueEvent = CustomEvent<SetValueDetail | null>;

/**
 * A handler `eventRulerOn` can bind. It runs with the engine as `this`; the
 * element is `this.el`.
 */
export type EventHandler<E extends Event = Event> = (this: Engine, e: E) => unknown;

/** Last `input` event seen, kept to drop the `keydown` an IME fires for the same text. */
export interface LastInputEvent {
  time: number;
  /** `undefined` when the event was not an `InputEvent`. */
  data: string | null | undefined;
}

// ---------------------------------------------------------------------------
// Mask tokens and test matches
// ---------------------------------------------------------------------------

/**
 * Repetition of the token before a quantifier token. `max` is `'*'` or `'+'`
 * for an open end; `jit` comes from the `{min,max|jit}` form.
 */
export interface Quantifier {
  min: number | string;
  max: number | string;
  jit?: number | string;
}

/** A node of the parsed mask: a group, an optional part, an alternation or a quantifier. */
export interface MaskToken {
  matches: (MaskToken | TestMatch)[];
  /** The group is still being parsed. */
  openGroup: boolean;
  /** Group opened for the right side of a regex alternation. */
  alternatorGroup: boolean;
  isGroup: boolean;
  isOptional: boolean;
  isQuantifier: boolean;
  isAlternator: boolean;
  quantifier: Quantifier;

  // Match fields, declared absent: the lexer reads them off the previous entry
  // of `matches` without checking whether that entry is a token.
  def?: undefined;
  static?: undefined;
}

/**
 * Checks a character against one mask position. A `RegExp` fits this shape and
 * ignores everything after the first argument; a definition's validator
 * function is wrapped in an object that exposes it as `test`.
 */
export interface MatchValidator {
  test(
    chrs: string,
    maskset: MaskSet,
    pos: number,
    strict: boolean,
    opts: ResolvedOptions,
    isSelection?: boolean,
  ): boolean | CommandObject;
}

/** Placeholder computed from the options, called as a method of the test match. */
export type PlaceholderFunction = (this: TestMatch, opts: ResolvedOptions) => string;

/** A leaf of the parsed mask: what one position accepts and how it renders. */
export interface TestMatch {
  /** `null` on a static position whose character is not a letter. */
  fn: MatchValidator | null;
  /** The position holds a fixed character of the mask. */
  static: boolean;
  /** Nesting depth of optional parts while tests are resolved, or the definition's own flag. */
  optionality: boolean | number;
  /** `optional` flag of the definition, restored into `optionality` after each resolution. */
  defOptionality?: boolean;
  /** Starts a new block; `'master'` for the first match and for optional definitions. */
  newBlockMarker?: boolean | 'master';
  casing?: Casing | null;
  /** Definition symbol, or the character itself for a static position. `''` on the stop match. */
  def: string;
  placeholder?: string | PlaceholderFunction;
  /** The symbol as written in the mask, prefixed with `'` when it was escaped. Missing on the stop match. */
  nativeDef?: string;
  /** Static position that must still count as generated input (numeric separators). */
  generated?: boolean;
  /** The position lies beyond the quantifier's minimum. */
  optionalQuantifier?: boolean;
  /** Rendered only once typed, set from the quantifier's `jit` part. */
  jit?: boolean;

  // Token fields, declared absent so a `MaskToken | TestMatch` can be probed
  // the way the lexer and the test resolver do. Closing an alternation writes
  // `false` into the first two on every alternative, test matches included.
  isGroup?: false;
  alternatorGroup?: false;
  matches?: undefined;
  openGroup?: undefined;
  isOptional?: undefined;
  isQuantifier?: undefined;
  isAlternator?: undefined;
  quantifier?: undefined;

  /** Nothing assigns it. `revalidateMask` compares it between two matches. */
  cd?: string;
  /** Nothing assigns it. `determineNewCaretPosition` reads it. */
  locator?: Locator;
}

/** Path through the token tree. An entry is a string such as `'0,1'` while an alternation is undecided. */
export type Locator = (number | string)[];

/** One candidate for a position, as `getTests` returns it. */
export interface MaskTest {
  match: TestMatch;
  locator: Locator;
  /** Cache dependency: the joined locator the tests were resolved from. */
  cd?: string;
  /** Merge locators, keyed `'<alternative>:<alternation index>'`. */
  mloc: Record<string, Locator>;
  /** Index into `locator` of the alternation this test belongs to. */
  alternation?: number;
  /** The test comes from an alternation whose branches differ in length. */
  unMatchedAlternationStopped?: boolean;
  /** Character stored at the position. Set on valid positions. */
  input?: string;
  /** The engine filled the position itself (static content, placeholders). */
  generatedInput?: boolean;

  /** Nothing assigns it. `determineLastRequiredPosition` reads it. */
  def?: string;
  /** Nothing assigns it. The numeric alias reads it. */
  generated?: boolean;
}

/** A test that holds input: an entry of `maskset.validPositions`. */
export interface ValidPosition extends MaskTest {
  input: string;
}

/** `{ mask, ...metadata }`: a mask that carries data `getmetadata` hands back. */
export interface MaskDescriptor {
  mask: string;
  [metadata: string]: unknown;
}

export type MaskPattern = string | MaskDescriptor;

/** Builds the mask from the options. Called as a method of the options object. */
export type MaskFunction = (
  this: ResolvedOptions,
  opts: ResolvedOptions,
) => MaskPattern | MaskPattern[] | null;

/** Every form the `mask` option takes before the lexer resolves it. */
export type MaskOption = MaskPattern | MaskPattern[] | MaskFunction | null;

/** State of one mask: the parsed tokens plus everything typed so far. */
export interface MaskSet {
  mask: string;
  maskToken: MaskToken[];
  /** Sparse: a missing entry is a position without input. */
  validPositions: (ValidPosition | undefined)[];
  /** Buffer template: the mask rendered with no input. */
  _buffer: string[] | undefined;
  /** Rendered mask with the current input. Dropped whenever the valid positions change. */
  buffer: string[] | undefined;
  /** Resolved tests per position. */
  tests: Partial<Record<number, MaskTest[]>>;
  /** Alternations ruled out per position, as `'<alternative>:<alternation index>'`. */
  excludes: Partial<Record<number, string[]>>;
  /** The `mask` option as given, for `getmetadata`. */
  metadata: MaskPattern | MaskPattern[] | null;
  maskLength: number | undefined;
  /** Positions to skip to reach the match a just-in-time quantifier hides. */
  jitOffset: Partial<Record<number, number>>;
  /** Caret position to restore after the last change. */
  p?: number;
  /** Whether `keypressEvent` should write the buffer back to the element. */
  writeOutBuffer?: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface InsertCommand {
  pos: number;
  c: string;
  /** Defaults to `true`. */
  strict?: boolean;
  /** Defaults to the `fromIsValid` of the validation that runs the command. */
  fromIsValid?: boolean;
}

export interface RefreshRange {
  start: number;
  end: number;
}

/**
 * Instructions a validator or hook returns with its verdict, and the shape
 * validation itself answers with.
 */
export interface CommandObject {
  /** Position the character was validated at. */
  pos?: number;
  /** Character to store instead of the typed one. */
  c?: string;
  /** Caret position to set afterwards. */
  caret?: number;
  /** Position(s) to remove. */
  remove?: number | number[];
  /** Character(s) to insert. */
  insert?: InsertCommand | InsertCommand[];
  /** Revalidate from `buffer`: everything (`true`) or a range. */
  refreshFromBuffer?: true | RefreshRange;
  /** The numeric alias puts a number in it. */
  buffer?: (string | number)[];
  /** Continue validation at this position (`preValidation` only). */
  rewritePosition?: number;
  /** Set by the datetime alias when it shifted the buffer itself. */
  fuzzy?: boolean;
  /** Set by `alternate` when it generalised the alternation. */
  caretPos?: number;
  /** Where the caret goes next, set by `keypressEvent`. */
  forwardPosition?: number;
}

/**
 * Outcome of validating one character. `true` only comes back when a hook
 * leaves `rewritePosition` on its answer.
 */
export type ValidationResult = boolean | CommandObject;

/** Answer of `determineLastRequiredPosition(true)`. */
export interface LastRequiredPosition {
  l: number;
  def: TestMatch | undefined;
}

/** `format(value, true)`. */
export interface FormatResult {
  value: string;
  metadata: MaskPattern | null;
}

// ---------------------------------------------------------------------------
// Definitions, aliases and options
// ---------------------------------------------------------------------------

export type PositionCaretOnClick = NonNullable<Options['positionCaretOnClick']>;

export type Casing = NonNullable<Options['casing']>;

export type InputMode = NonNullable<Options['inputmode']>;

/** Validator function of a definition. Runs as `test` of the wrapper stored in `TestMatch.fn`. */
export type DefinitionValidator = (
  this: MatchValidator,
  chrs: string,
  maskset: MaskSet,
  pos: number,
  strict: boolean,
  opts: ResolvedOptions,
  isSelection?: boolean,
) => boolean | CommandObject;

/** What a mask symbol stands for. */
export interface MaskDefinition {
  /** A regex source or a function. Without one the symbol accepts any character. */
  validator?: string | DefinitionValidator;
  /** Symbol to match as when alternations are merged. */
  definitionSymbol?: string;
  casing?: Casing | null;
  placeholder?: string | PlaceholderFunction;
  optional?: boolean;
  static?: boolean;
  generated?: boolean;
  /** The public type accepts it. The engine does not read it. */
  cardinality?: number;
}

/** Mask-level casing callback. */
export type CasingFunction = (
  this: Engine,
  elem: string,
  test: TestMatch,
  pos: number,
  validPositions: (ValidPosition | undefined)[],
) => string;

/** Maps a position (and, for the datetime alias, `"<index>'<char>"`) to its placeholder. */
export type PlaceholderMap = Record<string, string>;

/**
 * A date split into its format parts. The datetime alias replaces the `min`
 * and `max` strings with one of these.
 */
export interface DateParts {
  /** Rebuilt from the parts on first read after `reInit`. */
  readonly date: Date;
  day?: string;
  rawday?: string;
  month?: string;
  rawmonth?: string;
  year?: string;
  rawyear?: string;
  hours?: string;
  rawhours?: string;
  minutes?: string;
  rawminutes?: string;
  seconds?: string;
  rawseconds?: string;
  milliseconds?: string;
  rawmilliseconds?: string;
  ampm?: string;
  rawampm?: string;
  Z?: string;
  rawZ?: string;
  reset(): void;
  reInit(): void;
}

/**
 * Options as the engine reads them: the defaults, the alias and the user
 * options merged. Core options are always present. Alias options are there
 * only when the alias that defines them was resolved.
 *
 * Each callback is typed with the `this` it is called with.
 */
export interface ResolvedOptions {
  // --- core ---

  /** How far past the requested position the test resolver goes before it gives up. */
  _maxTestPos: number;
  placeholder: string | PlaceholderMap;
  /** Both entries are blanked for a regex mask. */
  optionalmarker: [string | undefined, string | undefined];
  quantifiermarker: [string, string];
  groupmarker: [string, string];
  alternatormarker: string;
  escapeChar: string;
  mask: MaskOption;
  regex: string | null;
  oncomplete: (this: MaskedElement, e: Event) => unknown;
  onincomplete: (this: MaskedElement, e: Event) => unknown;
  oncleared: (this: MaskedElement, e: Event) => unknown;
  /** A count, or `'*'` / `'+'`. */
  repeat: number | string;
  greedy: boolean;
  autoUnmask: boolean;
  removeMaskOnSubmit: boolean;
  clearMaskOnLostFocus: boolean;
  insertMode: boolean;
  insertModeVisual: boolean;
  clearIncomplete: boolean;
  /** An alias name. Anything that is not a registered alias is used as the mask. */
  alias: MaskOption;
  /** Any result other than `undefined` ends the key handling and is returned as is. */
  onKeyDown: (
    this: MaskedElement,
    e: MaskEvent,
    buffer: string[],
    caretPos: CaretPosition,
    opts: ResolvedOptions,
  ) => unknown;
  /** A falsy result keeps the value as it was. */
  onBeforeMask:
  | ((this: Engine, initialValue: string, opts: ResolvedOptions) => string | null | undefined)
  | null;
  /** `false` cancels the paste; another falsy result pastes the element's current value. */
  onBeforePaste:
  | ((
    this: Engine,
    pastedValue: string,
    opts: ResolvedOptions,
  ) => string | false | null | undefined)
  | null;
  /** `unmaskedvalue(value)` calls it without an event. */
  onBeforeWrite:
  | ((
    this: Engine,
    e: MaskEvent | undefined,
    buffer: string[],
    caretPos: number | undefined,
    opts: ResolvedOptions,
  ) => CommandObject | undefined)
  | null;
  /**
   * The core calls it on the engine. The numeric alias also calls it as a
   * method of the options, without an unmasked value.
   */
  onUnMask:
  | ((
    this: Engine | ResolvedOptions,
    maskedValue: string,
    unmaskedValue: string | undefined,
    opts: ResolvedOptions,
  ) => string | number)
  | null;
  /** Mask applied to the unmasked value. */
  outputMask: MaskOption;
  showMaskOnFocus: boolean;
  showMaskOnHover: boolean;
  onKeyValidation: (this: MaskedElement, key: string, result: ValidationResult) => void;
  /** The numeric alias unsets it when the group separator is a space. */
  skipOptionalPartCharacter: string | undefined;
  numericInput: boolean;
  rightAlign: boolean;
  undoOnEscape: boolean;
  radixPoint: string;
  _radixDance: boolean;
  groupSeparator: string;
  /** `null` until the lexer decides. A number keeps the mask static from that position on. */
  keepStatic: boolean | number | null;
  positionCaretOnTab: boolean;
  tabThrough: boolean;
  supportsInputType: string[];
  isComplete: ((this: ResolvedOptions, buffer: string[], opts: ResolvedOptions) => boolean) | null;
  /** `true` lets validation continue; `false` rejects; a command object is run and ends it. */
  preValidation:
  | ((
    this: Engine,
    buffer: string[],
    pos: number,
    c: string,
    isSelection: boolean,
    opts: ResolvedOptions,
    maskset: MaskSet,
    caretPos: number | CaretPosition,
    strict: boolean | undefined,
  ) => ValidationResult)
  | null;
  /** `true` or `undefined` keeps `currentResult`. */
  postValidation:
  | ((
    this: Engine,
    buffer: string[],
    pos: number,
    c: string,
    currentResult: false | CommandObject,
    opts: ResolvedOptions,
    maskset: MaskSet,
    strict: boolean,
    fromCheckval: boolean | undefined,
    fromAlternate: boolean | undefined,
  ) => ValidationResult | undefined)
  | null;
  staticDefinitionSymbol?: string;
  /** `true`, or the number of positions rendered up front. */
  jitMasking: boolean | number;
  nullable: boolean;
  /** Skips the `keydown` listener so everything goes through `input`. */
  inputEventOnly: boolean;
  noValuePatching: boolean;
  positionCaretOnClick: PositionCaretOnClick;
  casing: Casing | CasingFunction | null;
  inputmode: InputMode;
  importDataAttributes: boolean;
  shiftPositions: boolean;
  usePrototypeDefinitions: boolean;
  /** Delay before focus returns to a field the browser reported as invalid. */
  validationEventTimeOut: number;
  /** Characters to swap for another before validation. */
  substitutes: Record<string, string>;

  definitions?: Record<string, MaskDefinition>;
  /** Set when the element has `dir="rtl"` or `numericInput` is on. */
  isRTL?: boolean;
  /** The public options list it. The engine does not read it. */
  ignorables?: number[];

  // --- numeric aliases ---

  /** Group pattern inserted before the radix point. */
  _mask?: (this: ResolvedOptions, opts: ResolvedOptions) => string;
  /** A count, `'*'`, or a `'min,max'` range. */
  digits?: number | string;
  digitsOptional?: boolean;
  enforceDigitsOnBlur?: boolean;
  allowMinus?: boolean;
  negationSymbol?: { front: string; back: string };
  prefix?: string;
  suffix?: string;
  /** A number once the numeric alias parsed it; a `DateParts` once the datetime alias did. */
  min?: number | string | DateParts | null;
  max?: number | string | DateParts | null;
  SetMaxOnOverflow?: boolean;
  step?: number | string;
  inputType?: 'text' | 'number';
  unmaskAsNumber?: boolean;
  roundingFN?: (input: number) => number;
  shortcuts?: Record<string, string> | null;
  stripLeadingZeroes?: boolean;
  substituteRadixPoint?: boolean;
  /**
   * `false` once the numeric alias has built its mask for plain entry. It
   * stays unset for the finance style that a user-set `numericInput` asks for.
   */
  __financeInput?: false;
  /** `'done'` once `min` and `max` were converted to numbers. */
  parseMinMaxOptions?: 'done';

  // --- datetime alias ---

  inputFormat?: string;
  displayFormat?: string | null;
  outputFormat?: string | null;
  prefillYear?: boolean;
  /** Splits a format into its tokens. Built on first use and kept. */
  tokenizer?: RegExp;

  // --- email alias ---

  /** Character between addresses. `null` allows a single address. */
  separator?: string | null;
  /** How many extra addresses the separator allows. */
  quantifier?: number;
}

/** What callers pass in: the public options, or any subset of the resolved ones. */
export type UserOptions = Options | Partial<ResolvedOptions>;

/** A named set of option overrides. `alias` inside one names the alias it builds on. */
export type AliasDefinition = Partial<ResolvedOptions>;

/** Names the datetime alias renders and parses. */
export interface I18n {
  /** Short names first, then the full ones. */
  dayNames: string[];
  /** Short names first, then the full ones. */
  monthNames: string[];
  ordinalSuffix: string[];
}

/** What an alias module contributes to the prototype registries. */
export interface AliasRegistration {
  i18n?: Partial<I18n>;
  definitions?: Record<string, MaskDefinition>;
  aliases?: Record<string, AliasDefinition>;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * State of one engine. Fields the code reads without a guard are typed as
 * present even though they are assigned after construction: `opts` by the
 * factory or by `mask`, `maskset` by the first public call that needs it, the
 * value accessors and `caretPos` once an element is bound.
 */
export interface EngineState {
  // --- on the prototype, shared by every engine ---

  /**
   * The factory, for the methods that create an engine or read a prototype
   * registry: `this.Inputmask(options)`, `this.Inputmask.prototype.masksCache`.
   */
  readonly Inputmask: InputmaskFactory;
  /** Prefix of the attributes options are imported from. */
  dataAttribute: string;
  defaults: ResolvedOptions;
  definitions: Record<string, MaskDefinition>;
  aliases: Record<string, AliasDefinition>;
  /** Parsed masks by mask text and the options that change how it parses. */
  masksCache: Record<string, MaskSet>;
  /** Empty until the datetime alias is registered. */
  i18n: Partial<I18n>;
  readonly isRTL: boolean;

  // --- per engine ---

  el: MaskedElement | undefined;
  maskset: MaskSet;
  opts: ResolvedOptions;
  /** The options as passed in, before defaults and aliases. */
  userOptions: UserOptions;
  /** Custom definitions make the parsed mask specific to this engine. */
  noMasksCache: boolean;
  /** The form was reset: reread the element's value before the next unmask. */
  refreshValue: boolean;
  /** Value to restore on Escape and to compare against before firing `change`. */
  undoValue: string | undefined;
  /** The next `input` event is the engine's own and must be ignored. */
  skipInputEvent: boolean;
  /**
   * The browser reported the field invalid. The next click or focus blurs the
   * element for a moment so the browser's validation message can show.
   */
  validationEvent: boolean;
  /** The key being handled produces no character. */
  ignorable: boolean;
  /** `maxlength` of the element, when it has one. */
  maxLength: number | undefined;
  mouseEnter: boolean;
  /** Clicks since the last blur. */
  clicked: number;
  originalPlaceholder: string | undefined;
  isComposing: boolean;
  lastInputEvent: LastInputEvent | null;
  /** The mask has an alternation, so validation may have to switch branch. */
  hasAlternator: boolean;
  caretPos: TrackedCaret;
  /** The next `insertText` repeats a composition that was already applied. */
  skipNextInsert?: boolean;

  /** Reads the element's value through the native accessor, reversed for RTL unless overruled. */
  _valueGet: (this: Engine, overruleRTL?: boolean) => string;
  /** Writes the element's value through the native accessor. */
  _valueSet: (this: Engine, value: string | null | undefined, overruleRTL?: boolean) => void;
  /** Native getter of the patched `value` property. Missing when value patching is off. */
  __valueGet?: (this: MaskedElement) => string;
  /** Native setter of the patched `value` property. */
  __valueSet?: (this: MaskedElement, value: string) => void;

  // Extension points with no caller inside the engine.
  caretHook?: (this: Engine, caret: CaretPosition) => void;
  writeBufferHook?: (this: Engine, caretPos: number | undefined) => void;
  keyEventHook?: (this: Engine, e: MaskEvent) => void;
  applyMaskHook?: (this: Engine) => void;
}

export interface Engine extends
  EngineState,
  OptionMethods,
  LexerMethods,
  TestsMethods,
  PositioningMethods,
  ValidationMethods,
  InputHandlingMethods,
  EventHandlerMethods,
  EventRulerMethods,
  MaskBindingMethods,
  ApiMethods {}
