/* eslint-disable max-len */

type Range = { start: string; end: string } | [string, string];

type PositionCaretOnClick = 'none' | 'lvp' | 'radixFocus' | 'select' | 'ignore';

type InputMode = 'verbatim' | 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';

type Casing = 'upper' | 'lower' | 'title';

// `maskset` typed as `any`, since its content is not described in the documentation
type DefinitionValidator = (
  chrs: string,
  maskset: any,
  pos: number,
  strict: boolean,
  opts: Options,
) => boolean | CommandObject;

export interface Options {
  /**
       * Change the mask placeholder. Instead of "_", you can change the unfilled characters mask as you like, simply
       * by adding the placeholder option. For example, placeholder: " " will change the default autofill with empty
       * values.
       *
       * @default "_"
       */
  placeholder?: string | undefined;
  /**
       * Definition of the symbols used to indicate an optional part in the mask.
       *
       * @default { start: "[", end: "]" }
       */
  optionalmarker?: Range | undefined;
  /**
       * Definition of the symbols used to indicate a quantifier in the mask.
       *
       * @default { start: "{", end: "}" }
       */
  quantifiermarker?: Range | undefined;
  /**
       * Definition of the symbols used to indicate a group in the mask.
       *
       * @default { start: "(", end: ")" }
       */
  groupmarker?: Range | undefined;
  /**
       * Definition of the symbols used to indicate an alternator part in the mask.
       *
       * @default "|"
       */
  alternatormarker?: string | undefined;
  /**
       * Definition of the symbols used to escape a part in the mask.
       *
       * @default "\\"
       */
  escapeChar?: string | undefined;
  /**
       * The mask to use.
       */
  mask?: string | string[] | ((opts: Options) => string | string[]) | undefined;
  /**
       * Use a regular expression as a mask. When using shorthands be aware that you need to double escape or use
       * String.raw with a string literal.
       */
  regex?: string | undefined;
  /**
       * Execute a function when the mask is completed.
       */
  oncomplete?: (() => void) | undefined;
  /**
       * Execute a function when the mask is cleared.
       */
  onincomplete?: (() => void) | undefined;
  /**
       * Execute a function when the mask is cleared.
       */
  oncleared?: (() => void) | undefined;
  /**
       * Mask repeat function. Repeat the mask definition x-times.
       * `*` ~ forever, otherwise specify an integer
       *
       * @default 0
       */
  repeat?: number | string | undefined;
  /**
       * Toggle to allocate as much possible or the opposite. Non-greedy repeat function. With the non-greedy option
       * set to `false`, you can specify `*` as repeat. This makes an endless repeat.
       *
       * @default false
       */
  greedy?: boolean | undefined;
  /**
       * Automatically unmask the value when retrieved.
       *
       * When setting this option to true the plugin also expects the initial value from the server to be unmasked.
       *
       * @default false
       */
  autoUnmask?: boolean | undefined;
  /**
       * Remove the mask before submitting the form.
       *
       * @default false
       */
  removeMaskOnSubmit?: boolean | undefined;
  /**
       * Remove the empty mask on blur or when not empty remove the optional trailing part.
       *
       * @default true
       */
  clearMaskOnLostFocus?: boolean | undefined;
  /**
       * Toggle to insert or overwrite input. This option can be altered by pressing the Insert key.
       *
       * @default true
       */
  insertMode?: boolean | undefined;
  /**
       * Show selected caret when `insertMode = false`.
       *
       * @default true
       */
  insertModeVisual?: boolean | undefined;
  /**
       * Clear the incomplete input on blur.
       *
       * @default false
       */
  clearIncomplete?: boolean | undefined;
  /**
       * The alias to use.
       *
       * @default null
       */
  alias?: string | undefined;
  /**
       * Callback to implement autocomplete on certain keys for example.
       */
  onKeyDown?:
  | ((
    event: KeyboardEvent,
    buffer: string[],
    caretPos: { begin: number; end: number },
    opts: Options,
  ) => void)
  | undefined;
  /**
       * Executes before masking the initial value to allow preprocessing of the initial value.
       */
  onBeforeMask?: ((initialValue: string, opts: Options) => string) | undefined;
  /**
       * This callback allows for preprocessing the pasted value before actually handling the value for masking.
       * This can be useful for stripping away some characters before processing. You can also disable pasting
       * a value by returning false in the `onBeforePaste` call.
       */
  onBeforePaste?: ((pastedValue: string, opts: Options) => string) | undefined;
  /**
       * Executes before writing to the masked element. Use this to do some extra processing of the input. This can
       * be useful when implementing an alias, ex. decimal alias, autofill the digits when leaving the inputfield.
       */
  onBeforeWrite?:
  | ((event: KeyboardEvent, buffer: string[], caretPos: number, opts: Options) => CommandObject)
  | undefined;
  /**
       * Executes after unmasking to allow post-processing of the unmaskedvalue.
       *
       * @returns New unmasked value
       */
  onUnMask?: ((maskedValue: string, unmaskedValue: string) => string) | undefined;
  /**
       * Shows the mask when the input gets focus.
       *
       * @default true
       */
  showMaskOnFocus?: boolean | undefined;
  /**
       * Shows the mask when the input is hevered by the mouse cursor.
       *
       * @default true
       */
  showMaskOnHover?: boolean | undefined;
  /**
       * Callback function is executed on every keyvalidation with the key, result as the parameter.
       */
  onKeyValidation?: ((key: number, result: boolean) => void) | undefined;
  /**
       * A character which can be used to skip an optional part of a mask.
       *
       * @default " "
       */
  skipOptionalPartCharacter?: string | undefined;
  /**
       * Numeric input direction. Keeps the caret at the end.
       *
       * @default false
       */
  numericInput?: boolean | undefined;
  /**
       * Align the input to the right
       *
       * By setting the rightAlign you can specify to right-align an inputmask. This is only applied in combination of
       * the `numericInput` option or the `dir-attribute`.
       *
       * @default true
       */
  rightAlign?: boolean | undefined;
  /**
       * Make escape behave like undo. (ctrl-Z) Pressing escape reverts the value to the value before focus.
       *
       * @default true
       */
  undoOnEscape?: boolean | undefined;
  /**
       * Define the radixpoint (decimal separator)
       *
       * @default ""
       */
  radixPoint?: string | undefined;
  /**
       * Define the groupseparator.
       *
       * @default ""
       */
  groupSeparator?: string | undefined;
  /**
       * Use in combination with the alternator syntax Try to keep the mask static while typing. Decisions to alter the
       * mask will be postponed if possible.
       *
       * ex. $(selector).inputmask({ mask: ["+55-99-9999-9999", "+55-99-99999-9999", ], keepStatic: true });
       *
       * typing 1212345123 => should result in +55-12-1234-5123 type extra 4 => switch to +55-12-12345-1234
       *
       * When the option is not set, it will default to `false`, except for multiple masks it will default to `true`!
       */
  keepStatic?: boolean | null | undefined;
  /**
       * When enabled the caret position is set after the latest valid position on TAB.
       *
       * @default true
       */
  positionCaretOnTab?: boolean | undefined;
  /**
       * Allows for tabbing through the different parts of the masked field.
       *
       * @default false
       */
  tabThrough?: boolean | undefined;
  /**
       * List with the supported input types
       *
       * @default ["text", "tel", "url", "password", "search"]
       */
  supportsInputType?: string[] | undefined;
  /**
       * Specify keyCodes which should not be considered in the keypress event, otherwise the `preventDefault` will
       * stop their default behavior especially in FF.
       */
  ignorables?: number[] | undefined;
  /**
       * With this call-in (hook) you can override the default implementation of the isComplete function.
       */
  isComplete?: ((buffer: string[], opts: Options) => boolean) | undefined;
  /**
       * Hook to postValidate the result from `isValid`. Useful for validating the entry as a whole.
       */
  postValidation?:
  | ((
    buffer: string[],
    pos: number,
    char: string,
    currentResult: boolean,
    opts: Options,
    maskset: any,
    strict: boolean,
    fromCheckval: boolean,
  ) => boolean | CommandObject)
  | undefined;
  /**
       * Hook to preValidate the input. Useful for validating regardless of the definition.
       *
       * When returning `true`, the normal validation kicks in, otherwise, it is skipped.
       *
       * When returning a command object the actions are executed and further validation is stopped. If you want to
       * continue further validation, you need to add the `rewritePosition` action.
       */
  preValidation?:
  | ((
    buffer: string[],
    pos: number,
    char: string,
    isSelection: boolean,
    opts: Options,
    maskset: any,
    caretPos: { begin: number; end: number },
    strict: boolean,
  ) => boolean | CommandObject)
  | undefined;
  /**
       * The `staticDefinitionSymbol` option is used to indicate that the static entries in the mask can match a
       * certain definition. Especially useful with alternators so that static element in the mask can match
       * another alternation.
       *
       * @default undefined
       */
  staticDefinitionSymbol?: string | undefined;
  /**
       * Just in time masking. With the `jitMasking` option you can enable jit masking. The mask will only be
       * visible for the user entered characters.
       *
       * @default false
       */
  jitMasking?: boolean | undefined;
  /**
       * Return nothing from the input `value` property when the user hasn't entered anything. If this is false,
       * the mask might be returned.
       *
       * @default true
       */
  nullable?: boolean | undefined;
  /**
       * Disable value property patching
       *
       * @default false
       */
  noValuePatching?: boolean | undefined;
  /**
       * Positioning of the caret on click.
       *
       * Options:
       *
       * * `none`
       * * `lvp` - based on the last valid position (default)
       * * `radixFocus` - position caret to radixpoint on initial click
       * * `select` - select the whole input
       * * `ignore` - ignore the click and continue the mask
       *
       * @default "lvp"
       */
  positionCaretOnClick?: PositionCaretOnClick | undefined;
  /**
       * Apply casing at the mask-level.
       *
       * @default undefined
       */
  casing?: Casing | undefined;
  /**
       * Specify the inputmode - already in place for when browsers start to support them
       * https://html.spec.whatwg.org/#input-modalities:-the-inputmode-attribute
       *
       * @default "verbatim"
       */
  inputmode?: InputMode | undefined;
  /**
       * Specify to use the `data-inputmask` attributes or to ignore them.
       *
       * If you don't use data attributes you can disable the import by specifying `importDataAttributes: false`.
       *
       * @default true
       */
  importDataAttributes?: boolean | undefined;
  /**
       * Alter the behavior of the char shifting on entry or deletion.
       *
       * In some cases shifting the mask entries or deletion should be more restrictive.
       *
       * Ex. date masks. Shifting month to day makes no sense
       *
       * @default true
       */
  shiftPositions?: boolean | undefined;
  /**
       * Use the default defined definitions from the prototype.
       *
       * @default true
       */
  usePrototypeDefinitions?: boolean | undefined;
  /**
       * Minimum value. This needs to be in the same format as the `inputFormat` when used with the datetime alias.
       */
  min?: string | number | undefined;
  /**
       * Maximum value. This needs to be in the same format as the `inputFormat` when used with the datetime alias.
       */
  max?: string | number | undefined;

  /**
       * Number of fractionalDigits.
       *
       * Possible values:
       *
       * * A number describing the number of fractional digits.
       * * `*`
       * * Quantifier syntax like `2,4`. When the quantifier syntax is used, the `digitsOptional` option is ignored
       *
       * @default "*"
       */
  digits?: string | number | undefined;
  /**
       * Specify wheter the digits are optional.
       *
       * @default true
       */
  digitsOptional?: boolean | undefined;
  /**
       * Enforces the decimal part when leaving the input field.
       *
       * @default false
       */
  enforceDigitsOnBlur?: boolean | undefined;
  /**
       * Allow to enter -.
       *
       * @default true
       */
  allowMinus?: boolean | undefined;
  /**
       * Define your negationSymbol.
       *
       * @default { front: "-", back: "" }
       */
  negationSymbol?: { front: string; back: string } | undefined;
  /**
       * Define a prefix.
       *
       * @default ""
       */
  prefix?: string | undefined;
  /**
       * Define a suffix.
       *
       * @default ""
       */
  suffix?: string | undefined;
  /**
       * Set the maximum value when the user types a number which is greater that the value of max.
       *
       * @default false
       */
  SetMaxOnOverflow?: boolean | undefined;
  /**
       * Define the step the ctrl-up & ctrl-down must take.
       *
       * @default 1
       */
  step?: number | undefined;
  /**
       * Make unmasking returning a number instead of a string.
       *
       * Be warned that using the unmaskAsNumber option together with jQuery.serialize will fail as serialize expects a string. (See issue #1288)
       *
       * @default false
       */
  unmaskAsNumber?: boolean | undefined;
  /**
       * Indicates whether the value passed for initialization is text or a number.
       *
       * * `text` - radixpoint should be the same as in the options
       * * `number` - radixpoint should be a . as the default for a number in js
       *
       * @default "text"
       */
  inputType?: 'text' | 'number' | undefined;
  /**
       * Set the function for rounding the values when set.
       *
       * Other examples:
       * * `Math.floor`
       * * `fn(x) { // do your own rounding logic // return x; }`
       *
       * @default Math.round
       */
  roundingFN?: ((input: number) => number) | undefined;
  /**
       * Define shortcuts. This will allow typing 1k => 1000, 2m => 2000000
       *
       * To disable just pass shortcuts: `null` as option
       *
       * @default {k: "000", m: "000000"}
       */
  shortcuts?: { [shortcut: string]: string } | null | undefined;
  /**
       * Format used to input a date. This option is only effective for the datetime alias.
       *
       * Supported symbols
       *
       * * `d` - Day of the month as digits; no leading zero for single-digit days.
       * * `dd` - Day of the month as digits; leading zero for single-digit days.
       * * `ddd` - Day of the week as a three-letter abbreviation.
       * * `dddd` - Day of the week as its full name.
       * * `m` - Month as digits; no leading zero for single-digit months.
       * * `mm` - Month as digits; leading zero for single-digit months.
       * * `mmm` - Month as a three-letter abbreviation.
       * * `mmmm` - Month as its full name.
       * * `yy` - Year as last two digits; leading zero for years less than 10.
       * * `yyyy` - Year as 4 digits.
       * * `h` - Hours; no leading zero for single-digit hours (12-hour clock).
       * * `hh` - Hours; leading zero for single-digit hours (12-hour clock).
       * * `hx` - Hours; no limit; `x` = number of digits ~ use as h2, h3, ...
       * * `H` - Hours; no leading zero for single-digit hours (24-hour clock).
       * * `HH` - Hours; leading zero for single-digit hours (24-hour clock).
       * * `Hx` - Hours; no limit; `x` = number of digits ~ use as H2, H3, ...
       * * `M` - Minutes; no leading zero for single-digit minutes. Uppercase M unlike CF timeFormat's m to avoid
       *         conflict with months.
       * * `MM` - Minutes; leading zero for single-digit minutes. Uppercase MM unlike CF timeFormat's mm to avoid
       *          conflict with months.
       * * `s` - Seconds; no leading zero for single-digit seconds.
       * * `ss` - Seconds; leading zero for single-digit seconds.
       * * `l` - Milliseconds. 3 digits.
       * * `L` - Milliseconds. 2 digits.
       * * `t` - Lowercase, single-character time marker string: a or p.
       * * `tt` - Two-character time marker string: am or pm.
       * * `T` - Single-character time marker string: A or P.
       * * `TT` - Two-character time marker string: AM or PM.
       * * `Z` - US timezone abbreviation, e.g. EST or MDT. With non-US timezones or in the Opera browser, the
       *         GMT/UTC offset is returned, e.g. GMT-0500
       * * `o` - GMT/UTC timezone offset, e.g. -0500 or +0230.
       * * `S` - The date's ordinal suffix (st, nd, rd, or th). Works well with d.
       *
       * @default "isoDateTime"
       */
  inputFormat?: string | undefined;
  /**
       * Format of the unmasked value. This is only effective when used with the datetime alias.
       */
  outputFormat?: string | undefined;
  /**
       * Visual format when the input looses focus
       */
  displayFormat?: string | undefined;
  /**
       * Add new definitions to this inputmask.
       */
  definitions?:
  | {
    [key: string]: Definition;
  }
  | undefined;
  /**
       * Enable/disable prefilling of the year.
       * Although you can just over type the proposed value without deleting, many seems to see a problem with the year prediction.
       * This options is to disable this feature.
       *
       * @default true
       */
  prefillYear?: boolean | undefined;
}

export interface Definition {
  validator: string | DefinitionValidator;
  casing?: Casing | undefined;
  cardinality?: number | undefined;
  placeholder?: string | undefined;
  definitionSymbol?: string | undefined;
}

interface InsertPosition {
  /**
       * Position to insert.
       */
  pos: number;
  /**
       * Character to insert.
       */
  c: string;
  /**
       * @default true
       */
  fromIsValid?: boolean | undefined;
  /**
       * @default true
       */
  strict?: boolean | undefined;
}

interface CommandObject {
  /**
       * Position to insert.
       */
  pos?: number | undefined;
  /**
       * Character to insert.
       */
  c?: string | undefined;
  /**
       * Position of the caret.
       */
  caret?: number | undefined;
  /**
       * Position(s) to remove.
       */
  remove?: number | number[] | undefined;
  /**
       * Position(s) to add.
       */
  insert?: InsertPosition | InsertPosition[] | undefined;
  /**
       * * `true` => refresh validPositions from the complete buffer .
       * * `{ start: , end: }` => refresh from start to end.
       */
  refreshFromBuffer?: true | { start: number; end: number } | undefined;
  /**
       * Rewrite the maskPos within the isvalid function.
       */
  rewritePosition?: number | undefined;
}
