import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import {
  createEvent, data, off, on, trigger,
} from './events';

type Registry = Record<string, Record<string, EventListener[]>>;

/** How many handlers the registry of an element holds, per event and namespace. */
function registryShape(elem: Element): Record<string, Record<string, number>> {
  const registry = data(elem, 'events') as Registry;

  return Object.fromEntries(
    Object.entries(registry).map(([ev, namespaces]) => [
      ev,
      Object.fromEntries(Object.entries(namespaces).map(([name, handlers]) => [name, handlers.length])),
    ]),
  );
}

describe('data', () => {
  it('returns null for an object nothing was stored on', () => {
    expect(data({}, 'anything')).toBeNull();
  });

  it('returns undefined for a key that was never stored once the object holds data', () => {
    const owner = {};
    data(owner, 'known', 1);

    expect(data(owner, 'unknown')).toBeUndefined();
  });

  it('stores a value and reads it back', () => {
    const owner = {};

    expect(data(owner, 'key', { some: 'value' })).toBeUndefined();
    expect(data(owner, 'key')).toEqual({ some: 'value' });
  });

  it('keeps falsy values, null included', () => {
    const owner = {};

    data(owner, 'zero', 0);
    data(owner, 'empty', '');
    data(owner, 'cleared', 'value');
    data(owner, 'cleared', null);

    expect(data(owner, 'zero')).toBe(0);
    expect(data(owner, 'empty')).toBe('');
    expect(data(owner, 'cleared')).toBeNull();
  });

  it('keeps the data on the object itself, under __data', () => {
    const owner = {};
    data(owner, 'key', 'value');

    expect(owner).toEqual({ __data: { key: 'value' } });
  });
});

describe('events', () => {
  let parent: HTMLDivElement;
  let el: HTMLInputElement;

  beforeEach(() => {
    parent = document.createElement('div');
    el = document.createElement('input');
    parent.appendChild(el);
    document.body.appendChild(parent);
  });

  afterEach(() => {
    parent.remove();
    vi.unstubAllGlobals();
  });

  describe('on', () => {
    it('calls the handler with the element as this and the event as argument', () => {
      const calls: [unknown, Event][] = [];
      on(el, 'custom', function handler(this: unknown, e: Event) { calls.push([this, e]); });

      const event = new Event('custom');
      el.dispatchEvent(event);

      expect(calls).toEqual([[el, event]]);
      expect(calls[0][0]).toBe(el);
      expect(calls[0][1]).toBe(event);
    });

    it('files a handler under the global namespace when the event names none', () => {
      on(el, 'click', vi.fn());

      expect(registryShape(el)).toEqual({ click: { global: 1 } });
    });

    it('files a handler under the namespace after the dot', () => {
      on(el, 'keydown.inputmask', vi.fn());
      on(el, 'keydown.other', vi.fn());
      on(el, 'keydown.inputmask', vi.fn());

      expect(registryShape(el)).toEqual({ keydown: { inputmask: 2, other: 1 } });
    });

    it('binds several space-separated events at once', () => {
      const handler = vi.fn();
      on(el, 'focus.inputmask blur.inputmask change', handler);

      el.dispatchEvent(new Event('focus'));
      el.dispatchEvent(new Event('blur'));
      el.dispatchEvent(new Event('change'));

      expect(handler).toHaveBeenCalledTimes(3);
      expect(registryShape(el)).toEqual({
        focus: { inputmask: 1 }, blur: { inputmask: 1 }, change: { global: 1 },
      });
    });

    it('runs handlers of one event in the order they were bound', () => {
      const order: string[] = [];
      on(el, 'thing.b', () => order.push('first'));
      on(el, 'thing.a', () => order.push('second'));
      on(el, 'thing', () => order.push('third'));

      el.dispatchEvent(new Event('thing'));

      expect(order).toEqual(['first', 'second', 'third']);
    });

    it('binds to a form too', () => {
      const form = document.createElement('form');
      const handler = vi.fn();
      on(form, 'submit.inputmask', handler);

      form.dispatchEvent(new Event('submit'));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does nothing for a missing element', () => {
      expect(() => {
        on(null, 'click', vi.fn());
        on(undefined, 'click', vi.fn());
      }).not.toThrow();
    });

    it('binds nothing to an element of another frame', () => {
      const frame = document.createElement('iframe');
      document.body.appendChild(frame);
      const foreign = (frame.contentDocument as Document).createElement('input');
      const handler = vi.fn();

      on(foreign, 'click', handler);
      foreign.dispatchEvent(new Event('click'));

      expect(foreign instanceof Element).toBe(false);
      expect(handler).not.toHaveBeenCalled();
      frame.remove();
    });
  });

  describe('trigger', () => {
    it('dispatches input as an InputEvent that reports typed text', () => {
      const seen: InputEvent[] = [];
      el.addEventListener('input', (e) => seen.push(e as InputEvent));

      trigger(el, 'input');

      expect(seen).toHaveLength(1);
      expect(seen[0]).toBeInstanceOf(InputEvent);
      expect(seen[0].type).toBe('input');
      expect(seen[0].inputType).toBe('insertText');
      expect(seen[0].bubbles).toBe(true);
      expect(seen[0].cancelable).toBe(true);
      expect(seen[0].composed).toBe(true);
      expect(seen[0].detail).toBe(0);
      expect(seen[0].data).toBeNull();
    });

    it.each(['change', 'complete', 'incomplete', 'cleared', 'setvalue', 'click', 'keyup'])(
      'dispatches %s as a CustomEvent that bubbles, can be cancelled and is composed',
      (type) => {
        const seen: Event[] = [];
        el.addEventListener(type, (e) => seen.push(e));

        trigger(el, type);

        expect(seen).toHaveLength(1);
        expect(seen[0]).toBeInstanceOf(CustomEvent);
        expect(seen[0].constructor).toBe(CustomEvent);
        expect(seen[0].type).toBe(type);
        expect(seen[0].bubbles).toBe(true);
        expect(seen[0].cancelable).toBe(true);
        expect(seen[0].composed).toBe(true);
        expect((seen[0] as CustomEvent).detail).toBeNull();
        expect(seen[0].target).toBe(el);
      },
    );

    it('passes the first extra argument as detail and drops the rest', () => {
      const details: unknown[] = [];
      el.addEventListener('setvalue', (e) => details.push((e as CustomEvent).detail));

      trigger(el, 'setvalue', ['12345', 3], 'dropped');
      trigger(el, 'setvalue', 'text');
      trigger(el, 'setvalue', 0);
      trigger(el, 'setvalue', null);
      trigger(el, 'setvalue');

      expect(details).toEqual([['12345', 3], 'text', 0, null, null]);
    });

    it('hands the detail array over as is, not a copy', () => {
      const detail = ['value'];
      let received: unknown;
      el.addEventListener('setvalue', (e) => { received = (e as CustomEvent).detail; });

      trigger(el, 'setvalue', detail);

      expect(received).toBe(detail);
    });

    it('reaches listeners on ancestors', () => {
      const bubbled: string[] = [];
      parent.addEventListener('change', (e) => bubbled.push(e.type));
      parent.addEventListener('input', (e) => bubbled.push(e.type));
      document.addEventListener('complete', (e) => bubbled.push(e.type), { once: true });

      trigger(el, 'change');
      trigger(el, 'input');
      trigger(el, 'complete');

      expect(bubbled).toEqual(['change', 'input', 'complete']);
    });

    it('reaches handlers bound with on and plain listeners alike', () => {
      const viaOn = vi.fn();
      const viaListener = vi.fn();
      on(el, 'change.inputmask', viaOn);
      el.addEventListener('change', viaListener);

      trigger(el, 'change');

      expect(viaOn).toHaveBeenCalledTimes(1);
      expect(viaListener).toHaveBeenCalledTimes(1);
    });

    it('dispatches synchronously', () => {
      const order: string[] = [];
      el.addEventListener('change', () => order.push('handler'));

      order.push('before');
      trigger(el, 'change');
      order.push('after');

      expect(order).toEqual(['before', 'handler', 'after']);
    });

    it('dispatches each of several space-separated events', () => {
      const types: string[] = [];
      el.addEventListener('input', (e) => types.push(e.type));
      el.addEventListener('change', (e) => types.push(e.type));

      trigger(el, 'input change');

      expect(types).toEqual(['input', 'change']);
    });

    it('ignores a namespace: every listener of the event runs', () => {
      const namespaced = vi.fn();
      const other = vi.fn();
      on(el, 'keydown.inputmask', namespaced);
      on(el, 'keydown.other', other);

      trigger(el, 'keydown.inputmask');

      expect(namespaced).toHaveBeenCalledTimes(1);
      expect(other).toHaveBeenCalledTimes(1);
      expect((namespaced.mock.calls[0][0] as Event).type).toBe('keydown');
    });

    it('lets a listener cancel the event', () => {
      let prevented: boolean | undefined;
      el.addEventListener('change', (e) => {
        e.preventDefault();
        prevented = e.defaultPrevented;
      });

      trigger(el, 'change');

      expect(prevented).toBe(true);
    });

    it('does nothing for a missing element', () => {
      expect(() => {
        trigger(null, 'change');
        trigger(undefined, 'change');
      }).not.toThrow();
    });

    it('falls back to the legacy event factory when the constructors are missing', () => {
      const seen: Event[] = [];
      el.addEventListener('input', (e) => seen.push(e));
      el.addEventListener('setvalue', (e) => seen.push(e));
      vi.stubGlobal('InputEvent', undefined);
      vi.stubGlobal('CustomEvent', undefined);

      trigger(el, 'input');
      trigger(el, 'setvalue', ['value']);
      vi.unstubAllGlobals();

      expect(seen.map((e) => [e.type, e.bubbles, e.cancelable, (e as CustomEvent).detail])).toEqual([
        ['input', true, true, null],
        ['setvalue', true, true, ['value']],
      ]);
      expect(seen[0]).toBeInstanceOf(CustomEvent);
    });
  });

  describe('off', () => {
    const handlers = {
      keydown: vi.fn(), input: vi.fn(), change: vi.fn(), clickOther: vi.fn(), clickMask: vi.fn(),
    };

    const fire = (): Record<string, number> => {
      Object.values(handlers).forEach((handler) => handler.mockClear());
      ['keydown', 'input', 'change', 'click'].forEach((type) => el.dispatchEvent(new Event(type)));

      return Object.fromEntries(
        Object.entries(handlers).map(([name, handler]) => [name, handler.mock.calls.length]),
      );
    };

    beforeEach(() => {
      on(el, 'keydown.inputmask', handlers.keydown);
      on(el, 'input.inputmask', handlers.input);
      on(el, 'change', handlers.change);
      on(el, 'click.other', handlers.clickOther);
      on(el, 'click.inputmask', handlers.clickMask);
    });

    it('unbinds one namespace across every event', () => {
      off(el, '.inputmask');

      expect(fire()).toEqual({
        keydown: 0, input: 0, change: 1, clickOther: 1, clickMask: 0,
      });
      expect(registryShape(el)).toEqual({
        keydown: { inputmask: 0 },
        input: { inputmask: 0 },
        change: { global: 1 },
        click: { other: 1, inputmask: 0 },
      });
    });

    it('unbinds one event in one namespace', () => {
      off(el, 'click.other');

      expect(fire()).toEqual({
        keydown: 1, input: 1, change: 1, clickOther: 0, clickMask: 1,
      });
    });

    it('unbinds one event in every namespace', () => {
      off(el, 'click');

      expect(fire()).toEqual({
        keydown: 1, input: 1, change: 1, clickOther: 0, clickMask: 0,
      });
      expect(registryShape(el).click).toEqual({ other: 0, inputmask: 0 });
    });

    it('unbinds several space-separated events', () => {
      off(el, 'keydown.inputmask change');

      expect(fire()).toEqual({
        keydown: 0, input: 1, change: 0, clickOther: 1, clickMask: 1,
      });
    });

    it('unbinds everything when no event is named', () => {
      off(el);

      expect(fire()).toEqual({
        keydown: 0, input: 0, change: 0, clickOther: 0, clickMask: 0,
      });
      expect(registryShape(el)).toEqual({
        keydown: { inputmask: 0 },
        input: { inputmask: 0 },
        change: { global: 0 },
        click: { other: 0, inputmask: 0 },
      });
    });

    it('treats an empty event list like none', () => {
      off(el, '');

      expect(fire()).toEqual({
        keydown: 0, input: 0, change: 0, clickOther: 0, clickMask: 0,
      });
    });

    it('unbinds only the given handler', () => {
      const extra = vi.fn();
      on(el, 'keydown.inputmask', extra);

      off(el, 'keydown.inputmask', handlers.keydown);
      el.dispatchEvent(new Event('keydown'));

      expect(handlers.keydown).not.toHaveBeenCalled();
      expect(extra).toHaveBeenCalledTimes(1);
      expect(registryShape(el).keydown).toEqual({ inputmask: 1 });
    });

    it('leaves listeners bound without on alone', () => {
      const plain = vi.fn();
      el.addEventListener('keydown', plain);

      off(el);
      el.dispatchEvent(new Event('keydown'));

      expect(plain).toHaveBeenCalledTimes(1);
    });

    it('lets a handler be bound again afterwards', () => {
      off(el, '.inputmask');
      on(el, 'keydown.inputmask', handlers.keydown);

      expect(fire().keydown).toBe(1);
    });

    it('does nothing for a namespace that was never used', () => {
      off(el, '.unknown');

      expect(fire()).toEqual({
        keydown: 1, input: 1, change: 1, clickOther: 1, clickMask: 1,
      });
    });

    it('does nothing for a missing element', () => {
      expect(() => {
        off(null);
        off(undefined, '.inputmask');
      }).not.toThrow();
    });

    it('throws for an event that was never bound, as Inputmask does', () => {
      expect(() => off(el, 'never')).toThrow(TypeError);
      expect(() => off(el, 'never.inputmask')).toThrow(TypeError);
    });

    it('drops the last handler of a list when asked to unbind one that is not in it, as Inputmask does', () => {
      const second = vi.fn();
      on(el, 'click.inputmask', second);

      off(el, 'click.inputmask', vi.fn());

      // The registry forgets `second`, but its DOM listener is still bound.
      expect(registryShape(el).click).toEqual({ other: 1, inputmask: 1 });
      el.dispatchEvent(new Event('click'));
      expect(second).toHaveBeenCalledTimes(1);
    });
  });

  describe('createEvent', () => {
    it('creates a CustomEvent that neither bubbles nor can be cancelled', () => {
      const event = createEvent('keypress');

      expect(event).toBeInstanceOf(CustomEvent);
      expect(event.constructor).toBe(CustomEvent);
      expect(event.type).toBe('keypress');
      expect(event.bubbles).toBe(false);
      expect(event.cancelable).toBe(false);
      expect(event.composed).toBe(false);
      expect((event as CustomEvent).detail).toBeNull();
    });

    it.each(['_checkval', 'checkval', 'keypress', 'keydown', 'input'])('keeps the type %s as given', (type) => {
      expect(createEvent(type).type).toBe(type);
    });

    it('ignores preventDefault, since the event cannot be cancelled', () => {
      const event = createEvent('keypress');
      event.preventDefault();

      expect(event.defaultPrevented).toBe(false);
    });

    it('can carry a key set by hand', () => {
      const event: Event & { key?: string } = createEvent('keypress');
      event.key = 'a';

      expect(event.key).toBe('a');
    });

    it('passes the init values through', () => {
      const event = createEvent('thing', { bubbles: true, cancelable: true, detail: 7 }) as CustomEvent;

      expect([event.bubbles, event.cancelable, event.detail]).toEqual([true, true, 7]);
    });

    it('is not dispatched anywhere', () => {
      const listener = vi.fn();
      document.addEventListener('keypress', listener);

      createEvent('keypress');

      expect(listener).not.toHaveBeenCalled();
      document.removeEventListener('keypress', listener);
    });
  });
});
