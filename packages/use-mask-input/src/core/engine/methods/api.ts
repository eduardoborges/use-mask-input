/**
 * The public methods of an engine. Their names and behaviour are the
 * Inputmask API; internal methods never reuse these names.
 */
import { data, trigger } from '../events';
import { extend } from '../extend';

import type {
  Engine,
  FormatResult,
  MaskDescriptor,
  MaskedElement,
  MaskPattern,
  MaskTargets,
  ResolvedOptions,
  UserOptions,
} from '../types';

/** Key the user options are stored under on a masked element. */
const DATA_KEY = '_inputmask_opts';

/**
 * Whether the target of `mask` is one element and not a list. A truthy
 * `nodeName` decides it, and reading it throws for `null` and `undefined`.
 */
function isSingleNode(target: HTMLElement | ArrayLike<HTMLElement>): target is HTMLElement {
  return Boolean((target as Partial<HTMLElement>).nodeName);
}

/**
 * The characters of a value to run through the mask. `onBeforeMask` may
 * replace the value first; a falsy answer keeps it.
 */
function valueBufferOf(engine: Engine, value: string): string[] {
  return (
    typeof engine.opts.onBeforeMask === 'function'
      ? engine.opts.onBeforeMask.call(engine, value, engine.opts) || value
      : value
  ).split('');
}

/** @upstream inputmask.js option */
function option<Name extends keyof ResolvedOptions>(
  this: Engine,
  options: Name,
): ResolvedOptions[Name];
function option(this: Engine, options: string): unknown;
function option(this: Engine, options: UserOptions, noremask?: boolean): Engine;
function option(this: Engine, options: string | UserOptions, noremask?: boolean): unknown {
  if (typeof options === 'string') {
    return this.opts[options as keyof ResolvedOptions];
  }
  if (typeof options === 'object') {
    extend(this.userOptions, options);
    if (this.el && noremask !== true) {
      this.mask(this.el);
    }
    // After a remask this is no longer the element's engine.
    return this;
  }
  return undefined;
}

/** @upstream inputmask.js format */
function format(this: Engine, value: string, metadata?: false): string;
function format(this: Engine, value: string, metadata: true): FormatResult;
function format(this: Engine, value: string, metadata?: boolean): string | FormatResult {
  this.maskset = this.maskset || this.generateMaskSet(this.opts, this.noMasksCache);
  this.checkVal(undefined, true, false, valueBufferOf(this, value));
  const formattedValue = this.isRTL
    ? this.getBuffer().slice().reverse().join('')
    : this.getBuffer().join('');

  return metadata
    ? {
      value: formattedValue,
      metadata: this.getmetadata(),
    }
    : formattedValue;
}

export const apiMethods = {
  /** @upstream inputmask.js mask */
  mask(this: Engine, elems: MaskTargets): Engine {
    // A string is an id first, and a selector when no element has that id.
    const targets = typeof elems === 'string'
      ? document.getElementById(elems) || document.querySelectorAll<HTMLElement>(elems)
      : elems;

    let elements: HTMLElement[];
    if (isSingleNode(targets)) {
      elements = [targets];
    } else {
      elements = Array.isArray(targets) ? targets : Array.prototype.slice.call(targets);
    }

    elements.forEach((element) => {
      const el = element as MaskedElement;
      const scopedOpts = extend(true, {}, this.opts);
      // Zero options, counting the ones read from data attributes, leaves the element alone.
      if (
        this.importAttributeOptions(
          el,
          scopedOpts,
          extend(true, {}, this.userOptions),
          this.dataAttribute,
        )
      ) {
        const maskset = this.generateMaskSet(scopedOpts, this.noMasksCache);
        if (maskset !== undefined) {
          if (el.inputmask !== undefined) {
            // Remasking: the old mask leaves the unmasked value behind for the new one.
            el.inputmask.opts.autoUnmask = true;
            el.inputmask.remove();
          }
          const engine = this.Inputmask(undefined, undefined, true);
          el.inputmask = engine;
          engine.opts = scopedOpts;
          engine.noMasksCache = this.noMasksCache;
          engine.userOptions = extend(true, {}, this.userOptions);
          engine.el = el;
          engine.maskset = maskset;

          data(el, DATA_KEY, this.userOptions);
          engine.bindMask();
        }
      }
    });

    const first = elements[0] as MaskedElement | undefined;
    return first ? first.inputmask || this : this;
  },

  option,

  /** @upstream inputmask.js unmaskedvalue */
  unmaskedvalue(this: Engine, value?: string): string | number {
    this.maskset = this.maskset || this.generateMaskSet(this.opts, this.noMasksCache);
    if (this.el === undefined || value !== undefined) {
      this.checkVal(undefined, false, false, valueBufferOf(this, value as string));
      if (typeof this.opts.onBeforeWrite === 'function') {
        this.opts.onBeforeWrite.call(this, undefined, this.getBuffer(), 0, this.opts);
      }
    }
    return this.unmaskedValueOf(this.el);
  },

  /** @upstream inputmask.js remove */
  remove(this: Engine): MaskedElement | undefined {
    const { el } = this;

    if (el) {
      data(el, DATA_KEY, null);
      // Leave the value in the element: unmasked with `autoUnmask`, as shown otherwise.
      const cv = this.opts.autoUnmask
        ? this.unmaskedValueOf(el)
        : this._valueGet(this.opts.autoUnmask);
      if (cv !== this.getBufferTemplate().join('')) {
        this._valueSet(cv as string, this.opts.autoUnmask);
      } else {
        this._valueSet('');
      }
      this.eventRulerOff(el);

      // Only an element whose own prototype declares `value` gets the native
      // accessors back, as an own property. A contenteditable host keeps the
      // patched one.
      const valueProperty = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
      if (valueProperty && this.__valueGet) {
        Object.defineProperty(el, 'value', {
          get: this.__valueGet,
          set: this.__valueSet,
          configurable: true,
        });
      }
      el.inputmask = undefined;
    }
    return el;
  },

  /** @upstream inputmask.js getemptymask */
  getemptymask(this: Engine): string {
    this.maskset = this.maskset || this.generateMaskSet(this.opts, this.noMasksCache);
    // For RTL this reverses the cached template itself, so every call flips it again.
    return (
      this.isRTL
        ? this.getBufferTemplate().reverse()
        : this.getBufferTemplate()
    ).join('');
  },

  /** @upstream inputmask.js hasMaskedValue */
  hasMaskedValue(this: Engine): boolean {
    return !this.opts.autoUnmask;
  },

  /** @upstream inputmask.js isComplete */
  isComplete(this: Engine): boolean | undefined {
    this.maskset = this.maskset || this.generateMaskSet(this.opts, this.noMasksCache);
    return this.isBufferComplete(this.getBuffer());
  },

  /** @upstream inputmask.js getmetadata */
  getmetadata(this: Engine): MaskPattern | null {
    this.maskset = this.maskset || this.generateMaskSet(this.opts, this.noMasksCache);
    const { metadata } = this.maskset;

    if (Array.isArray(metadata)) {
      let maskTarget: MaskPattern = this.getMaskTemplate(true, 0, false).join('');
      // The first entry with that mask wins: `maskTarget` is a descriptor from
      // then on, and no mask text equals one.
      metadata.forEach((mtdt) => {
        if ((mtdt as MaskDescriptor).mask === maskTarget) {
          maskTarget = mtdt;
        }
      });
      return maskTarget;
    }
    return metadata;
  },

  /** @upstream inputmask.js isValid */
  isValid(this: Engine, value?: string): boolean | undefined {
    this.maskset = this.maskset || this.generateMaskSet(this.opts, this.noMasksCache);
    // A falsy value is not applied. The answer is then about what the maskset already holds.
    if (value) {
      this.checkVal(undefined, true, false, valueBufferOf(this, value));
    }

    const buffer = this.clearOptionalTail([]);
    const isC = this.isBufferComplete(buffer);
    const isc2 = value === (this.isRTL ? buffer.reverse().join('') : buffer.join(''));

    return isC && (value === undefined || isc2);
  },

  format,

  /** @upstream inputmask.js setValue */
  setValue(this: Engine, value: string): void {
    if (this.el) {
      trigger(this.el, 'setvalue', [value]);
    }
  },
};

export type ApiMethods = typeof apiMethods;
