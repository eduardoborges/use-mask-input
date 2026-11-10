import { domWindow } from './environment';

/** Listeners of one element: event name, then namespace, then the handlers in binding order. */
type EventRegistry = Record<string, Record<string, EventListener[]>>;

/** Property the data of an object is kept under. */
const DATA_KEY = '__data';

interface DataOwner {
  [DATA_KEY]?: Record<string, unknown>;
}

interface Registration {
  ev: string;
  namespace: string;
  handler: EventListener;
}

/** Listeners bound without a namespace land in this one. */
const GLOBAL_NAMESPACE = 'global';

/**
 * Reads or writes data kept on an object, under its `__data` property.
 * Without `value` it returns what is stored, or `null` when nothing was ever
 * stored on the object. Storing `null` is a write.
 */
export function data(owner: object, key: string, value?: unknown): unknown {
  const store: DataOwner = owner;

  if (value === undefined) {
    const stored = store[DATA_KEY];
    return stored ? stored[key] : null;
  }

  const stored = store[DATA_KEY] || {};
  store[DATA_KEY] = stored;
  stored[key] = value;
  return undefined;
}

/**
 * The listener registry of an element, created on first use. `undefined` for
 * anything that is not an `Element` of this window, so an element that
 * belongs to another frame gets no listeners.
 */
function registryOf(elem: Element | null | undefined): EventRegistry | undefined {
  if (elem == null || typeof Element === 'undefined' || !(elem instanceof Element)) {
    return undefined;
  }

  const registry = data(elem, 'events') || {};
  data(elem, 'events', registry);
  return registry as EventRegistry;
}

/**
 * Binds `handler` to one or more space-separated events. Each may carry a
 * namespace (`'keydown.inputmask'`) that `off` can target later.
 */
export function on(
  elem: Element | null | undefined,
  events: string,
  handler: EventListener,
): void {
  const registry = registryOf(elem);
  if (!elem || !registry) return;

  events.split(' ').forEach((event) => {
    const [ev, namespace = GLOBAL_NAMESPACE] = event.split('.');

    elem.addEventListener(ev, handler, false);
    registry[ev] = registry[ev] || {};
    registry[ev][namespace] = registry[ev][namespace] || [];
    registry[ev][namespace].push(handler);
  });
}

/**
 * Unbinds listeners that `on` bound.
 *
 * - no `events`: everything on the element
 * - `'.inputmask'`: every event of that namespace
 * - `'keydown'`: that event in every namespace
 * - `'keydown.inputmask'`: that event in that namespace
 *
 * With `handler`, only that listener is unbound.
 */
export function off(
  elem: Element | null | undefined,
  events?: string,
  handler?: EventListener,
): void {
  const registry = registryOf(elem);
  if (!elem || !registry) return;

  const registrationsIn = (ev: string, namespace: string): Registration[] => (
    handler === undefined
      ? (registry[ev][namespace] || []).map((bound) => ({ ev, namespace, handler: bound }))
      : [{ ev, namespace, handler }]
  );

  const resolveNamespace = (ev: string, namespace: string | undefined): Registration[] => {
    if (ev.length > 0) {
      const namespaces = namespace ? [namespace] : Object.keys(registry[ev]);
      return namespaces.flatMap((name) => registrationsIn(ev, name));
    }
    if (namespace) {
      return Object.keys(registry)
        .filter((name) => registry[name][namespace])
        .flatMap((name) => registrationsIn(name, namespace));
    }
    return [];
  };

  const removeEvent = ({ ev, namespace, handler: listener }: Registration): void => {
    if (!(ev in registry)) return;

    elem.removeEventListener(ev, listener, false);

    // Parity quirk: a listener that is not in a list still removes that list's
    // last entry (`splice(-1, 1)`).
    const namespaces = namespace === GLOBAL_NAMESPACE ? Object.keys(registry[ev]) : [namespace];
    namespaces.forEach((name) => {
      registry[ev][name].splice(registry[ev][name].indexOf(listener), 1);
    });
  };

  const eventList = events || Object.keys(registry).join(' ');
  if (eventList === '') return;

  eventList.split(' ').forEach((event) => {
    const [ev, namespace] = event.split('.');
    resolveNamespace(ev, namespace).forEach(removeEvent);
  });
}

/**
 * Builds an event the way `trigger` dispatches it: it bubbles, can be
 * cancelled and crosses shadow roots. `input` is an `InputEvent` with
 * `inputType: 'insertText'`; every other type is a `CustomEvent` with `detail`.
 */
function buildEvent(view: Window & typeof globalThis, type: string, detail: unknown): Event {
  const params: CustomEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    detail,
  };

  try {
    return type === 'input'
      ? new InputEvent(type, { ...params, inputType: 'insertText' })
      : new CustomEvent(type, params);
  } catch {
    // Without event constructors, build the event with the legacy factory.
    const legacy = view.document.createEvent('CustomEvent');
    legacy.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
    return legacy;
  }
}

/**
 * Dispatches one or more space-separated events on the element. The first
 * extra argument becomes the event's `detail`; any further ones are dropped.
 * A namespace on an event name is ignored: every listener of the event runs.
 */
export function trigger(
  elem: Element | null | undefined,
  events: string,
  ...args: unknown[]
): void {
  const view = domWindow();
  if (!elem || !view || !registryOf(elem)) return;

  events.split(' ').forEach((name) => {
    const [type] = name.split('.');
    elem.dispatchEvent(buildEvent(view, type, args[0]));
  });
}

/**
 * Creates an event the engine hands to its own handlers instead of
 * dispatching it: a `CustomEvent` in a browser, a plain `Event` on a server.
 * It does not bubble and cannot be cancelled.
 */
export function createEvent(type: string, params?: CustomEventInit): Event {
  const view = domWindow();

  return view && typeof view.CustomEvent === 'function'
    ? new view.CustomEvent(type, params)
    : new Event(type, params);
}
