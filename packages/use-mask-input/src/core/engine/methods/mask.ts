/**
 * Binds an engine to its element: patches the `value` property, registers the
 * event handlers and applies the value the element already holds.
 *
 * - Handlers are engine methods and are bound unwrapped:
 *   `this.eventRulerOn(el, 'blur', this.blurEvent)`.
 * - The callbacks `oncomplete`, `onincomplete` and `oncleared` are bound
 *   through the ruler as well, wrapped so they run on the element.
 * - Inside the patched `value` getter and setter `this` is the element. Its
 *   current engine (`this.inputmask`) decides `autoUnmask` and does the
 *   unmasking, and the engine that installed the patch does the rest.
 * - Those accessors need the element and the engine at once, so the logic
 *   sits in arrow functions that take the element, and the accessors are thin
 *   shells around them. `_valueGet` and `_valueSet` are built the same way.
 */
import { activeElementOf, environment } from '../environment';
import { looseEquals } from '../looseEquals';

import type { Engine, EventHandler, MaskedElement } from '../types';

type NativeValueGetter = NonNullable<Engine['__valueGet']>;
type NativeValueSetter = NonNullable<Engine['__valueSet']>;

/** `'partial'`: nothing can be typed, so the mask only applies to values set from script. */
type ElementSupport = boolean | 'partial';

// An element with no `value` accessor of its own, such as a contenteditable
// host, keeps its value in its text.
function textContentGet(this: MaskedElement): string {
  return this.textContent;
}

function textContentSet(this: MaskedElement, value: string): void {
  this.textContent = value;
}

// When `value` is not patched, the property itself is the native access.
function ownValueGet(this: MaskedElement): string {
  return this.value;
}

function ownValueSet(this: MaskedElement, value: string): void {
  this.value = value;
}

export const maskBindingMethods = {
  /** @upstream mask.js mask */
  bindMask(this: Engine): void {
    const { opts } = this;
    // `mask` gives the engine its element before it binds.
    const el = this.el as MaskedElement;
    const { iphone, mobile } = environment();

    // The accessors that read and write the element's value underneath the mask.
    let valueGet: NativeValueGetter | undefined;
    let valueSet: NativeValueSetter | undefined;

    // The patched `value` property. `element` is the `this` it is read or
    // written on, and may have another engine by then.
    const readValue = (element: MaskedElement): string | number => {
      const nativeGet = valueGet as NativeValueGetter;
      const { inputmask } = element;

      if (!inputmask) return nativeGet.call(element);
      if (inputmask.opts.autoUnmask) return inputmask.unmaskedvalue();
      if (this.getLastValidPosition() !== -1 || opts.nullable !== true) {
        if (activeElementOf(element) === element && opts.clearMaskOnLostFocus) {
          const buffer = this.isRTL
            ? this.clearOptionalTail(this.getBuffer().slice()).reverse()
            : this.clearOptionalTail(this.getBuffer().slice());
          return buffer.join('');
        }
        return nativeGet.call(element);
      }
      return '';
    };

    const writeValue = (element: MaskedElement, value: string): void => {
      (valueSet as NativeValueSetter).call(element, value);
      if (element.inputmask) element.inputmask.applyInputValue(element, value);
    };

    function getter(this: MaskedElement): string | number {
      return readValue(this);
    }

    function setter(this: MaskedElement, value: string): void {
      writeValue(this, value);
    }

    // `_valueGet` and `_valueSet`. `engine` is the `this` they are called on,
    // while the text direction comes from the engine that binds here.
    const readNativeValue = (engine: Engine, overruleRTL?: boolean): string => {
      const nativeGet = valueGet as NativeValueGetter;
      const element = engine.el as MaskedElement;

      return this.isRTL && overruleRTL !== true
        ? nativeGet.call(element).split('').reverse().join('')
        : nativeGet.call(element);
    };

    const writeNativeValue = (
      engine: Engine,
      value: string | null | undefined,
      overruleRTL?: boolean,
    ): void => {
      let nativeValue = '';
      if (value !== null && value !== undefined) {
        nativeValue = overruleRTL !== true && this.isRTL
          ? value.split('').reverse().join('')
          : value;
      }
      (valueSet as NativeValueSetter).call(engine.el as MaskedElement, nativeValue);
    };

    function engineValueGet(this: Engine, overruleRTL?: boolean): string {
      return readNativeValue(this, overruleRTL);
    }

    function engineValueSet(
      this: Engine,
      value: string | null | undefined,
      overruleRTL?: boolean,
    ): void {
      writeNativeValue(this, value, overruleRTL);
    }

    // Without a patched `value` the engine does not see a value set from
    // script, so it looks for one when the pointer comes over the element.
    const installNativeValueSetFallback = (): void => {
      this.eventRulerOn(el, 'mouseenter', function syncNativeValue(this: Engine): void {
        const value = this._valueGet(true);
        const bufferValue = (
          this.isRTL ? this.getBuffer().slice().reverse() : this.getBuffer()
        ).join('');
        if (!looseEquals(value, bufferValue)) this.applyInputValue(el, value);
      });
    };

    const patchValueProperty = (): void => {
      // This engine has patched the property already.
      if (this.__valueGet) return;

      if (opts.noValuePatching !== true) {
        const valueProperty = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
        if (valueProperty && valueProperty.get && valueProperty.set) {
          valueGet = valueProperty.get;
          valueSet = valueProperty.set;
          Object.defineProperty(el, 'value', { get: getter, set: setter, configurable: true });
        } else if (el.tagName.toLowerCase() !== 'input') {
          valueGet = textContentGet;
          valueSet = textContentSet;
          Object.defineProperty(el, 'value', { get: getter, set: setter, configurable: true });
        }
        // `remove` restores the property from these.
        this.__valueGet = valueGet;
        this.__valueSet = valueSet;
      }

      this._valueGet = engineValueGet;
      this._valueSet = engineValueSet;

      if (valueGet === undefined) {
        valueGet = ownValueGet;
        valueSet = ownValueSet;
        installNativeValueSetFallback();
      }
    };

    const isElementTypeSupported = (): ElementSupport => {
      const elementType = el.getAttribute('type');
      const tagName = el.tagName.toLowerCase();
      let isSupported: ElementSupport = (
        tagName === 'input' && opts.supportsInputType.includes(elementType as string)
      )
        || el.isContentEditable
        || tagName === 'textarea';

      if (!isSupported) {
        if (tagName === 'input') {
          // A type the browser does not know becomes `text`, which can be
          // masked. One it handles natively cannot.
          const probe = document.createElement('input');
          probe.setAttribute('type', elementType as string);
          isSupported = probe.type === 'text';
        } else {
          isSupported = 'partial';
        }
      }

      if (isSupported !== false) {
        patchValueProperty();
      } else {
        el.inputmask = undefined;
      }
      return isSupported;
    };

    // Listeners of an earlier mask must not interfere when masking again.
    this.eventRulerOff(el);
    const isSupported = isElementTypeSupported();
    if (isSupported === false) return;

    this.originalPlaceholder = el.placeholder;

    this.maxLength = el.maxLength;
    if (this.maxLength === -1) this.maxLength = undefined;
    if ('inputMode' in el && el.getAttribute('inputmode') === null) {
      el.inputMode = opts.inputmode;
      el.setAttribute('inputmode', opts.inputmode);
    }

    if (isSupported === true) {
      opts.showMaskOnFocus = opts.showMaskOnFocus
        && ['cc-number', 'cc-exp'].indexOf(el.autocomplete) === -1;
      if (iphone) {
        // An iPhone draws the caret of overwrite mode as a selection.
        opts.insertModeVisual = false;
        el.setAttribute('autocorrect', 'off');
      }

      const runOnElement = (callback: (this: MaskedElement, e: Event) => unknown): EventHandler => (
        (e) => callback.call(el, e)
      );

      // Listeners of one event run in the order they are bound here.
      this.eventRulerOn(el, 'submit', this.submitEvent);
      this.eventRulerOn(el, 'reset', this.resetEvent);
      this.eventRulerOn(el, 'blur', this.blurEvent);
      this.eventRulerOn(el, 'focus', this.focusEvent);
      this.eventRulerOn(el, 'invalid', this.invalidEvent);
      this.eventRulerOn(el, 'click', this.clickEvent);
      this.eventRulerOn(el, 'mouseleave', this.mouseleaveEvent);
      this.eventRulerOn(el, 'mouseenter', this.mouseenterEvent);
      this.eventRulerOn(el, 'paste', this.pasteEvent);
      this.eventRulerOn(el, 'cut', this.cutEvent);
      this.eventRulerOn(el, 'complete', runOnElement(opts.oncomplete));
      this.eventRulerOn(el, 'incomplete', runOnElement(opts.onincomplete));
      this.eventRulerOn(el, 'cleared', runOnElement(opts.oncleared));
      if (opts.inputEventOnly !== true) {
        this.eventRulerOn(el, 'keydown', this.keyEvent);
      }
      if (mobile || opts.inputEventOnly) {
        el.removeAttribute('maxLength');
      }
      this.eventRulerOn(el, 'input', this.inputFallBackEvent);
    }
    this.eventRulerOn(el, 'setvalue', this.setValueEvent);

    if (this.applyMaskHook !== undefined) this.applyMaskHook();

    // Rendering the buffer template also sets the mask length.
    this.getBufferTemplate();
    this.undoValue = this._valueGet(true);
    const activeElement = activeElementOf(el);
    if (
      this._valueGet(true) !== ''
      || opts.clearMaskOnLostFocus === false
      || activeElement === el
    ) {
      this.applyInputValue(el, this._valueGet(true));
      let buffer = this.getBuffer().slice();
      if (this.isBufferComplete(buffer) === false && opts.clearIncomplete) {
        this.resetMaskSet(false);
      }
      if (opts.clearMaskOnLostFocus && activeElement !== el) {
        if (this.getLastValidPosition() === -1) {
          buffer = [];
        } else {
          this.clearOptionalTail(buffer);
        }
      }
      if (
        opts.clearMaskOnLostFocus === false
        || (opts.showMaskOnFocus && activeElement === el)
        || this._valueGet(true) !== ''
      ) {
        this.writeBuffer(el, buffer);
      }
      if (activeElement === el) {
        this.caret(el, this.seekNext(this.getLastValidPosition()));
      } else {
        this.caret(el, 0);
      }
    }
  },
};

export type MaskBindingMethods = typeof maskBindingMethods;
