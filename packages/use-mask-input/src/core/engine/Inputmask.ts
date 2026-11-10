/**
 * The engine factory and its prototype.
 *
 * `Inputmask(options)` returns an engine. Every engine shares one prototype,
 * assembled here from the method groups under `methods/`, plus the registries
 * that aliases and definitions are added to. This module registers no alias:
 * import `./index` for the factory with the built-in ones.
 */
import { defaults } from './defaults';
import { definitions } from './definitions';
import { domWindow } from './environment';
import { trigger } from './events';
import { extend } from './extend';
import { apiMethods } from './methods/api';
import { eventHandlerMethods } from './methods/eventHandlers';
import { eventRulerMethods } from './methods/eventRuler';
import { inputHandlingMethods } from './methods/inputHandling';
import { lexerMethods } from './methods/lexer';
import { maskBindingMethods } from './methods/mask';
import { positioningMethods } from './methods/positioning';
import { testsMethods } from './methods/tests';
import { validationMethods } from './methods/validation';

import type {
  AliasDefinition,
  Engine,
  EngineState,
  FormatResult,
  MaskDefinition,
  MaskedElement,
  MaskOption,
  MaskTargets,
  ResolvedOptions,
  UserOptions,
} from './types';

/** The static functions of the factory. */
export interface InputmaskStatics {
  prototype: Engine;
  /** Merges options into the defaults every engine starts from. */
  extendDefaults(options: UserOptions): void;
  /** Adds or overrides mask symbols for every engine. */
  extendDefinitions(definition: Record<string, MaskDefinition>): void;
  /** Adds or overrides aliases for every engine. */
  extendAliases(alias: Record<string, AliasDefinition>): void;
  /** Masks a value without an element. */
  format(value: string, options?: UserOptions | null, metadata?: false): string;
  format(value: string, options: UserOptions | null | undefined, metadata: true): FormatResult;
  /** Unmasks a value without an element. */
  unmask(value: string, options?: UserOptions | null): string | number;
  /** Whether a masked value is a complete entry for the mask. */
  isValid(value: string, options?: UserOptions | null): boolean | undefined;
  /** Removes the mask from the elements that have one. */
  remove(elems: MaskTargets): void;
  /** Applies a value to the elements through their masks. */
  setValue(elems: MaskTargets, value: string): void;
}

/**
 * Creates an engine, with or without `new`.
 *
 * - `Inputmask('999-99')` and `Inputmask('numeric', { digits: 2 })`: the first
 *   argument is an alias name, or a mask when no alias has that name.
 * - `Inputmask({ mask: '999-99' })`: an options object. A second argument is
 *   then ignored.
 * - `internal` skips option handling. `mask` uses it for the engine it
 *   attaches to each element, and fills `opts` in itself.
 */
export interface InputmaskFactory extends InputmaskStatics {
  (alias?: MaskOption | UserOptions, options?: UserOptions | null, internal?: boolean): Engine;
  new (alias?: MaskOption | UserOptions, options?: UserOptions | null, internal?: boolean): Engine;
}

type PrototypeState = Pick<
  EngineState,
  'dataAttribute' | 'defaults' | 'definitions' | 'aliases' | 'masksCache' | 'i18n' | 'isRTL'
>;

const prototype = {} as Engine;

const prototypeState: PrototypeState & ThisType<Engine> = {
  dataAttribute: 'data-inputmask',
  defaults,
  definitions,
  aliases: {},
  masksCache: {},
  i18n: {},
  get isRTL(): boolean {
    return this.opts.isRTL || this.opts.numericInput;
  },
};

/** The first key of `source` that equals `name` when case is ignored. */
function findKeyIgnoringCase(source: Record<string, unknown>, name: string): string | undefined {
  return Object.keys(source).find((key) => key.toLowerCase() === name.toLowerCase());
}

/**
 * Turns the text of a data attribute into an option value. Values that are
 * not text (from the JSON form of `data-inputmask`) pass through.
 */
function parseAttributeOption(option: string, optionData: unknown): unknown {
  if (typeof optionData !== 'string') return optionData;

  if (option.startsWith('on')) {
    // A callback is given by the name of a global function.
    const view = domWindow();
    return view ? Reflect.get(view, optionData) : undefined;
  }
  if (optionData === 'false') return false;
  if (optionData === 'true') return true;
  if (option === 'mask') return optionData.replace(/\\\\/g, '\\');

  return optionData;
}

const optionMethods = {
  /** @upstream inputmask.js resolveAlias */
  resolveAlias(
    this: Engine,
    aliasStr: MaskOption,
    options: UserOptions | null | undefined,
    opts: ResolvedOptions,
  ): boolean {
    const resolved = opts;
    // `String` gives the key a property lookup would use, so a mask array or
    // `null` passed as the alias resolves the same way it does in Inputmask.
    const aliasDefinition = prototype.aliases[String(aliasStr)];

    if (aliasDefinition) {
      // An alias can build on another one: apply the parent first.
      if (aliasDefinition.alias) this.resolveAlias(aliasDefinition.alias, undefined, resolved);
      extend(true, resolved, aliasDefinition);
      // The alias may have overwritten options the caller set explicitly.
      extend(true, resolved, options);
      return true;
    }

    // Not an alias: take it as the mask.
    if (resolved.mask === null) resolved.mask = aliasStr;
    return false;
  },

  /** @upstream inputmask.js importAttributeOptions */
  importAttributeOptions(
    this: Engine,
    npt: MaskedElement,
    opts: ResolvedOptions,
    userOptions: UserOptions,
    dataAttribute: string,
  ): number {
    const element = npt;
    const resolved = opts;

    const importOption = (option: string, dataOption: unknown): void => {
      const attrOption = dataAttribute === '' ? option : `${dataAttribute}-${option}`;
      const optionData = dataOption !== undefined ? dataOption : element.getAttribute(attrOption);
      if (optionData === null) return;

      Reflect.set(userOptions, option, parseAttributeOption(option, optionData));
    };

    if (resolved.importDataAttributes === true) {
      // `data-inputmask="'alias': 'numeric', 'digits': 2"`: the body of an
      // object literal, single-quoted.
      const attrOptions = element.getAttribute(dataAttribute);
      const dataOptions: Record<string, unknown> | undefined = attrOptions
        ? JSON.parse(`{${attrOptions.replace(/'/g, '"')}}`)
        : undefined;

      const dataOption = (option: string): unknown => {
        const key = dataOptions && findKeyIgnoringCase(dataOptions, option);
        return dataOptions && key !== undefined ? dataOptions[key] : undefined;
      };

      // The alias comes first: it decides which options exist to be imported.
      importOption('alias', dataOption('alias'));
      if (userOptions.alias) this.resolveAlias(userOptions.alias, userOptions, resolved);

      Object.keys(resolved).forEach((option) => importOption(option, dataOption(option)));
    }
    extend(true, resolved, userOptions);

    if (element.dir === 'rtl' || resolved.rightAlign) {
      element.style.textAlign = 'right';
    }

    if (element.dir === 'rtl' || resolved.numericInput) {
      element.dir = 'ltr';
      element.removeAttribute('dir');
      resolved.isRTL = true;
    }

    return Object.keys(userOptions).length;
  },
};

export type OptionMethods = typeof optionMethods;

/** State every engine starts with. `maskset` is built by the first public call that needs it. */
function initialState(): Partial<EngineState> {
  return {
    el: undefined,
    maskset: undefined,
    refreshValue: false,
    undoValue: undefined,
    skipInputEvent: false,
    validationEvent: false,
    ignorable: false,
    mouseEnter: false,
    clicked: 0,
    originalPlaceholder: undefined,
    isComposing: false,
    lastInputEvent: null,
    hasAlternator: false,
  };
}

function Inputmask(
  alias?: MaskOption | UserOptions,
  options?: UserOptions | null,
  internal?: boolean,
): Engine {
  const instance: Engine = Object.assign(Object.create(prototype), initialState());

  if (internal !== true) {
    let userOptions: Partial<ResolvedOptions>;
    if (Object.prototype.toString.call(alias) === '[object Object]') {
      userOptions = alias as Partial<ResolvedOptions>;
    } else {
      // The alias is written onto the caller's own options object.
      userOptions = (options || {}) as Partial<ResolvedOptions>;
      if (alias) userOptions.alias = alias as MaskOption;
    }

    instance.opts = extend(true, {}, instance.defaults, userOptions) as ResolvedOptions;
    instance.noMasksCache = userOptions.definitions !== undefined;
    instance.userOptions = userOptions;
    instance.resolveAlias(instance.opts.alias, userOptions, instance.opts);
  }

  return instance;
}

/** A selector, an element or a list, as the list of elements it stands for. */
function resolveElements(elems: MaskTargets): ArrayLike<MaskedElement> {
  const found = typeof elems === 'string'
    ? document.getElementById(elems) || document.querySelectorAll<HTMLElement>(elems)
    : elems;

  return ('nodeName' in found ? [found] : found) as ArrayLike<MaskedElement>;
}

function format(value: string, options?: UserOptions | null, metadata?: false): string;
function format(
  value: string,
  options: UserOptions | null | undefined,
  metadata: true,
): FormatResult;
function format(
  value: string,
  options?: UserOptions | null,
  metadata?: boolean,
): string | FormatResult {
  const engine = Inputmask(options);
  return metadata ? engine.format(value, true) : engine.format(value);
}

const statics: Omit<InputmaskStatics, 'prototype'> = {
  extendDefaults(options) {
    extend(true, prototype.defaults, options);
  },

  extendDefinitions(definition) {
    extend(true, prototype.definitions, definition);
  },

  extendAliases(alias) {
    extend(true, prototype.aliases, alias);
  },

  format,

  unmask(value, options) {
    return Inputmask(options).unmaskedvalue(value);
  },

  isValid(value, options) {
    return Inputmask(options).isValid(value);
  },

  remove(elems) {
    Array.from(resolveElements(elems)).forEach((el) => {
      el.inputmask?.remove();
    });
  },

  setValue(elems, value) {
    // The list is used as it comes, so one without `forEach` throws here.
    const elements = resolveElements(elems) as MaskedElement[] | NodeListOf<MaskedElement>;
    elements.forEach((el: MaskedElement) => {
      if (el.inputmask) el.inputmask.setValue(value);
      else trigger(el, 'setvalue', [value]);
    });
  },
};

// Each group is copied by property descriptor. `Object.assign` would call the
// `isRTL` getter and copy its result.
[
  prototypeState,
  optionMethods,
  apiMethods,
  lexerMethods,
  testsMethods,
  positioningMethods,
  validationMethods,
  inputHandlingMethods,
  eventHandlerMethods,
  eventRulerMethods,
  maskBindingMethods,
].forEach((group) => {
  Object.defineProperties(prototype, Object.getOwnPropertyDescriptors(group));
});

// The property is not enumerable, so enumerating or cloning an engine does not
// pick up the factory.
Object.defineProperty(prototype, 'Inputmask', {
  value: Inputmask,
  writable: true,
  configurable: true,
  enumerable: false,
});

Inputmask.prototype = prototype;
Object.assign(Inputmask, statics);

export default Inputmask as InputmaskFactory;
