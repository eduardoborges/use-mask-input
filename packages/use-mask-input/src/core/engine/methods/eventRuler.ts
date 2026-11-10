/**
 * Binds handlers to a masked element and decides which events reach them.
 *
 * Calling convention, shared with `eventHandlers.ts`:
 *
 * - `eventRulerOn(input, eventName, eventHandler)` binds one listener with
 *   `on(target, `${eventName}.inputmask`, listener)` from `../events`. The
 *   target is the element, or its form for `submit` and `reset`. An element
 *   without a form gets no `submit` or `reset` listener.
 * - The listener looks up the engine when the event fires, as
 *   `input.inputmask`, and calls `eventHandler.call(engine, event)`. A handler
 *   never sees the element as `this`.
 * - The callbacks `oncomplete`, `onincomplete` and `oncleared` go through the
 *   ruler like any handler, but Inputmask runs them on the element. `bindMask`
 *   wraps each one before binding it: `(e) => callback.call(el, e)`.
 * - When the element lost its engine, the listener unbinds everything with
 *   `off(input)` and masks the element again from the options stored under
 *   `data(input, '_inputmask_opts')`, through `this.Inputmask(options)`.
 * - A handler that returns `false` gets `preventDefault` and
 *   `stopPropagation` called on its event.
 * - `click` and `focus` handlers run in a `setTimeout(fn, 0)`, and only if the
 *   element still has an engine by then.
 * - `eventRulerOff` unbinds from the element only. Listeners on the form stay.
 */
import { data, off, on } from '../events';
import { keys } from '../keys';

import type {
  Engine, EventHandler, MaskedElement, MaskEvent, ResolvedOptions, UserOptions,
} from '../types';

/**
 * Whether the element's state keeps the event from its handler. A disabled
 * element takes nothing. A read-only one takes Ctrl+C, and takes Tab unless
 * the mask uses it to move between its own blocks.
 */
function isBlockedByElementState(
  input: MaskedElement,
  e: MaskEvent,
  opts: ResolvedOptions,
): boolean {
  if (input.disabled) return true;
  if (!input.readOnly) return false;

  const isCopy = e.type === 'keydown' && e.ctrlKey && e.key === keys.c;
  return !(isCopy || (opts.tabThrough === false && e.key === keys.Tab));
}

export const eventRulerMethods = {
  /** @upstream eventruler.js EventRuler.on */
  eventRulerOn<E extends Event>(
    this: Engine,
    input: MaskedElement,
    eventName: string,
    eventHandler: EventHandler<E>,
  ): void {
    const listener = (e: MaskEvent): unknown => {
      const { inputmask } = input;
      const currentOpts = inputmask ? inputmask.opts : undefined;
      // Inputmask leaves a `<form>` out of the next two checks. The `submit`
      // and `reset` listeners work on the input, so it only matters when the
      // masked element is itself a form.
      const isForm = input.nodeName === 'FORM';

      if (inputmask === undefined && !isForm) {
        // The engine is gone: unbind, and mask again if the options are still
        // stored. `remove` clears them and leaves the form listeners bound.
        const storedOptions = data(input, '_inputmask_opts') as UserOptions | null | undefined;
        off(input);
        if (storedOptions) this.Inputmask(storedOptions).mask(input);
        return undefined;
      }

      // Only a masked `<form>` gets this far without an engine. Inputmask
      // reads on and throws there, so nothing guards the reads below.
      const engine = inputmask as Engine;
      const opts = currentOpts as ResolvedOptions;

      if (
        !['submit', 'reset', 'setvalue'].includes(e.type)
        && !isForm
        && isBlockedByElementState(input, e, opts)
      ) {
        e.preventDefault();
        return undefined;
      }

      switch (e.type) {
        case 'input':
          if (engine.skipInputEvent === true) {
            engine.skipInputEvent = false;
            e.preventDefault();
            return undefined;
          }
          engine.lastInputEvent = { time: Date.now(), data: e.data };
          break;
        case 'keydown':
          // An IME can report the same text twice: as `input`, then as `keydown`.
          if (
            engine.lastInputEvent
            && Date.now() - engine.lastInputEvent.time < 10
            && engine.lastInputEvent.data === e.key
          ) {
            return false;
          }
          break;
        case 'click':
        case 'focus':
          if (engine.validationEvent) {
            // The browser is showing its validation message. Leave the field
            // so the message stays, and come back to it later.
            engine.validationEvent = false;
            input.blur();
            engine.HandleNativePlaceholder(
              input,
              (engine.isRTL
                ? engine.getBufferTemplate().slice().reverse()
                : engine.getBufferTemplate()
              ).join(''),
            );
            setTimeout(() => {
              input.focus();
            }, opts.validationEventTimeOut);
            return false;
          }
          // Chrome clears the initial selection after the click, so the handler
          // runs later.
          setTimeout(() => {
            // The mask may have been removed in the meantime.
            if (!input.inputmask) return;
            eventHandler.call(input.inputmask, e as E);
          }, 0);
          return undefined;
        // no default
      }

      const returnVal = eventHandler.call(engine, e as E);
      if (returnVal === false) {
        e.preventDefault();
        e.stopPropagation();
      }
      return returnVal;
    };

    const namespacedEvent = `${eventName}.inputmask`;
    if (['submit.inputmask', 'reset.inputmask'].includes(namespacedEvent)) {
      if (input.form !== null) on(input.form, namespacedEvent, listener);
    } else {
      on(input, namespacedEvent, listener);
    }
  },

  /** @upstream eventruler.js EventRuler.off */
  eventRulerOff(this: Engine, input: MaskedElement, event?: string): void {
    if (input.inputmask) off(input, event || '.inputmask');
  },
};

export type EventRulerMethods = typeof eventRulerMethods;
