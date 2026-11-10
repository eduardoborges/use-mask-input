import { KEYSTROKE } from './codec';
import {
  errorMessage, inspect, outcomeOf,
} from './inspect';

import type {
  ElementAttributes,
  ElementSetup,
  MaskOptions,
  NativeInputStep,
  OptionsSource,
  Scenario,
  ScenarioContext,
  ScenarioEnvironment,
  StepObservation,
} from './types';

/**
 * What both drivers share: the elements a scenario runs on, the recorders
 * that watch them, and the reads that make up an observation. The stimulus
 * differs between jsdom and a browser; what is watched does not.
 */

/** Virtual milliseconds between two steps, and between two keystrokes. */
export const DEFAULT_GAP = 50;

export type TextControl = HTMLInputElement | HTMLTextAreaElement;

export interface Stage {
  root: HTMLElement;
  /** The element the scenario masks. */
  target: HTMLElement;
  form: HTMLFormElement | null;
  /** Focusable neighbours, so Tab and Shift+Tab have somewhere to go. */
  before: HTMLElement;
  after: HTMLElement;
  /** Where the pointer rests while it is not over the target. */
  away: HTMLElement;
}

function styled(tag: string, style: string): HTMLElement {
  const element = document.createElement(tag);
  element.setAttribute('style', style);
  return element;
}

function neighbour(label: string): HTMLElement {
  const button = document.createElement('button');
  button.setAttribute('type', 'button');
  button.textContent = label;
  return button;
}

/** Targets without a `value` of their own have no size until they hold text. */
const TARGET_STYLE = '[data-parity-holder] > :not(input):not(textarea) { display: block; min-width: 200px; min-height: 20px }';

const EDITABLE_VALUES = ['', 'true', 'plaintext-only'];

/**
 * jsdom has no `isContentEditable`, and without it the engine never sees an
 * editing host. Where the property is missing, the target gets it the way a
 * browser computes it for an element whose ancestors are not editable.
 */
function describeEditability(target: HTMLElement): void {
  if (Reflect.has(target, 'isContentEditable')) return;
  Object.defineProperty(target, 'isContentEditable', {
    configurable: true,
    get: () => EDITABLE_VALUES.includes((target.getAttribute('contenteditable') ?? 'inherit').toLowerCase()),
  });
}

function buildTarget(setup: ElementSetup): HTMLElement {
  const target = document.createElement(setup.tag ?? 'input');
  if (setup.type !== undefined) target.setAttribute('type', setup.type);
  Object.entries(setup.attrs ?? {}).forEach(([name, value]) => target.setAttribute(name, value));
  if (setup.value !== undefined) {
    // The default value, so a form reset brings it back.
    if (target instanceof HTMLInputElement) target.setAttribute('value', setup.value);
    else target.textContent = setup.value;
  }
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) describeEditability(target);
  return target;
}

/** Builds the elements of one scenario. Nothing is attached to the document yet. */
export function buildStage(setup: ElementSetup = {}): Stage {
  // Fixed to the corner so the target sits at the same spot in every scenario,
  // away from the top-left pixel where an idle pointer rests.
  const root = styled('div', 'position:fixed;top:0;left:0;z-index:2147483647;background:#fff;padding:4px');
  const away = styled('div', 'width:200px;height:28px');
  const before = neighbour('before');
  const after = neighbour('after');
  const target = buildTarget(setup);
  const form = setup.form ? document.createElement('form') : null;
  const holder = form ?? styled('div', 'display:block');
  const style = document.createElement('style');

  style.textContent = TARGET_STYLE;
  holder.setAttribute('data-parity-holder', '');
  holder.append(target);
  root.append(style, away, before, holder, after);

  return {
    root, target, form, before, after, away,
  };
}

function valueAccessor(element: Element): PropertyDescriptor | undefined {
  return Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
}

/** The text the user sees: the prototype's accessor, past any patch on the element. */
export function readText(element: HTMLElement): string {
  const getter = valueAccessor(element)?.get;
  return getter ? String(getter.call(element)) : element.textContent ?? '';
}

/** Sets the text the way the browser does when the user edits it. */
export function writeText(element: HTMLElement, value: string): void {
  const setter = valueAccessor(element)?.set;
  if (setter) {
    setter.call(element, value);
    return;
  }
  // An edit changes the text node that is there. It does not replace it.
  const only = element.childNodes.length === 1 ? element.firstChild : null;
  if (only instanceof Text) only.data = value;
  else element.replaceChildren(value);
}

export function isTextControl(element: unknown): element is TextControl {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}

/** An element the user types into that is not a text control: `contenteditable`. */
export function isEditingHost(element: unknown): element is HTMLElement {
  return element instanceof HTMLElement
    && !isTextControl(element)
    && Reflect.get(element, 'isContentEditable') === true;
}

/** Whether typing can land in the element at all. */
export function isEditable(element: unknown): element is HTMLElement {
  return isTextControl(element) || isEditingHost(element);
}

function textNodesOf(node: Node): Text[] {
  return Array.from(node.childNodes).flatMap((child) => (
    child instanceof Text ? [child] : textNodesOf(child)
  ));
}

interface DomPoint {
  node: Node;
  offset: number;
}

/** Where a character offset of the element's text falls, as a range boundary. */
function pointAt(element: HTMLElement, offset: number): DomPoint {
  let remaining = Math.max(0, offset);
  let last: DomPoint = { node: element, offset: 0 };
  const hit = textNodesOf(element).find((node) => {
    if (remaining <= node.length) return true;
    remaining -= node.length;
    last = { node, offset: node.length };
    return false;
  });
  return hit ? { node: hit, offset: remaining } : last;
}

/** The character offset of a range boundary inside the element. */
function offsetOf(element: HTMLElement, node: Node, offset: number): number {
  const before = element.ownerDocument.createRange();
  before.setStart(element, 0);
  before.setEnd(node, offset);
  return before.toString().length;
}

/** The document's selection as character offsets, when it lies inside the element. */
function domSelectionOf(element: HTMLElement): [number, number] | null {
  const selection = element.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!element.contains(range.commonAncestorContainer)) return null;
  return [
    offsetOf(element, range.startContainer, range.startOffset),
    offsetOf(element, range.endContainer, range.endOffset),
  ];
}

/**
 * Null for input types that have no selection. An element that is not a text
 * control has the document's selection, when that lies inside it and the
 * element has focus. Without focus, where that selection ends up is the
 * browser's business: the engine never sets a caret on blur.
 */
export function selectionOf(element: unknown): [number, number] | null {
  if (!isTextControl(element)) {
    if (!(element instanceof HTMLElement) || element.ownerDocument.activeElement !== element) return null;
    return domSelectionOf(element);
  }
  try {
    const { selectionStart: start, selectionEnd: end } = element;
    return typeof start === 'number' && typeof end === 'number' ? [start, end] : null;
  } catch {
    return null;
  }
}

/** Whether the selection was made towards the start, as Shift+ArrowLeft makes it. */
export function isBackwardSelection(element: unknown): boolean {
  if (isTextControl(element)) return element.selectionDirection === 'backward';
  if (!(element instanceof HTMLElement)) return false;
  const selection = element.ownerDocument.getSelection();
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  if (!selection || !range || range.collapsed) return false;
  return selection.focusNode === range.startContainer && selection.focusOffset === range.startOffset;
}

export function setSelection(
  element: unknown,
  start: number,
  end: number = start,
  direction?: 'forward' | 'backward' | 'none',
): void {
  if (!isTextControl(element)) {
    const selection = element instanceof HTMLElement ? element.ownerDocument.getSelection() : null;
    if (!selection || !(element instanceof HTMLElement)) return;
    const [anchor, focus] = direction === 'backward' ? [end, start] : [start, end];
    const from = pointAt(element, anchor);
    const to = pointAt(element, focus);
    selection.setBaseAndExtent(from.node, from.offset, to.node, to.offset);
    return;
  }
  try {
    element.setSelectionRange(start, end, direction);
  } catch {
    // Input types without a selection throw; there is nothing to place.
  }
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function';
}

/**
 * Knows when engine code is on the stack, and keeps what it throws.
 *
 * The browser driver holds back only the timers queued from inside the
 * engine, and both drivers record an engine error as an observation instead
 * of letting it fail the run.
 */
export class EngineScope {
  private depth = 0;

  private errors: string[] = [];

  get active(): boolean {
    return this.depth > 0;
  }

  report(error: unknown): void {
    this.errors.push(errorMessage(error));
  }

  /** Records something the driver could not do, where the fixture will show it. */
  note(message: string): void {
    this.errors.push(`driver: ${message}`);
  }

  /** Runs engine code and records what it throws or rejects with. The caller never sees it. */
  run<Result>(action: () => Result): Result | undefined {
    this.depth += 1;
    try {
      const result = action();
      if (isThenable(result)) result.then(undefined, (reason: unknown) => this.report(reason));
      return result;
    } catch (error) {
      this.report(error);
      return undefined;
    } finally {
      this.depth -= 1;
    }
  }

  /** Runs reads that reach into the engine, leaving their errors to the caller. */
  track<Result>(action: () => Result): Result {
    this.depth += 1;
    try {
      return action();
    } finally {
      this.depth -= 1;
    }
  }

  takeErrors(): string[] {
    const taken = this.errors;
    this.errors = [];
    return taken;
  }
}

/** Event types the engine could listen to, as dispatched by the user agent or the driver. */
const USER_EVENTS = new Set([
  'keydown', 'input', 'paste', 'cut', 'copy', 'focus', 'blur', 'click',
  'mouseenter', 'mouseleave', 'change', 'submit', 'reset', 'invalid',
  'compositionstart', 'compositionend',
]);

/** Listened to from the start. Any other type is picked up when it is dispatched. */
const WATCHED_EVENTS = [
  ...USER_EVENTS,
  'keyup', 'keypress', 'beforeinput', 'mousedown', 'mouseup', 'dblclick',
  'focusin', 'focusout', 'select', 'setvalue', 'complete', 'incomplete', 'cleared',
];

/** The only events a user agent dispatches on a form that say anything about the engine. */
const FORM_EVENTS = new Set(['submit', 'reset']);

interface RecordedEvent {
  event: Event;
  scripted: boolean;
}

type EventHook = (event: Event) => void;

/**
 * Records the events dispatched on the target and its form.
 *
 * An event the engine dispatches from script is always recorded. One that
 * comes from the user agent or the driver is recorded only when the engine
 * could be listening for it; the rest (keyup, mousedown…) would be noise.
 */
export class EventRecorder {
  private entries: (RecordedEvent | typeof KEYSTROKE)[] = [];

  private submitted: string[] = [];

  private readonly watched = new Set<string>();

  private readonly owned = new WeakSet<Event>();

  private readonly hooks = new Map<string, EventHook[]>();

  private readonly frozen = new WeakMap<Event, boolean>();

  private readonly stage: Stage;

  constructor(stage: Stage) {
    this.stage = stage;
  }

  private readonly capture = (event: Event): void => {
    (this.hooks.get(event.type) ?? []).forEach((hook) => hook(event));
    const { target, form } = this.stage;
    if (event.target !== target && event.target !== form) return;
    // A real submission would navigate away from the test page.
    if (event.type === 'submit') event.preventDefault();
    const scripted = !event.isTrusted && !this.owned.has(event);
    // Entering the target also enters its form, which adds nothing.
    const expected = event.target === form ? FORM_EVENTS : USER_EVENTS;
    if (!scripted && !expected.has(event.type)) return;
    this.entries.push({ event, scripted });
  };

  private readonly bubble = (event: Event): void => {
    // Runs after the engine's own submit handler: this is what would be sent.
    if (event.target === this.stage.form) this.submitted.push(readText(this.stage.target));
  };

  start(): void {
    WATCHED_EVENTS.forEach((type) => this.watch(type));
    document.addEventListener('submit', this.bubble);
  }

  stop(): void {
    this.watched.forEach((type) => document.removeEventListener(type, this.capture, true));
    this.watched.clear();
    document.removeEventListener('submit', this.bubble);
  }

  /** Starts recording a type. Called for whatever the engine dispatches. */
  watch(type: string): void {
    if (this.watched.has(type)) return;
    this.watched.add(type);
    document.addEventListener(type, this.capture, true);
  }

  /** Runs `hook` for every event of the type, anywhere in the document, before it is recorded. */
  before(type: string, hook: EventHook): void {
    this.watch(type);
    this.hooks.set(type, [...(this.hooks.get(type) ?? []), hook]);
  }

  /** Marks an event the driver is about to dispatch, so it is not taken for the engine's. */
  own<Dispatched extends Event>(event: Dispatched): Dispatched {
    this.owned.add(event);
    return event;
  }

  /**
   * Fixes what the log will say about `defaultPrevented`. A driver calls it
   * right before it cancels an event itself, once the page has had its say.
   */
  freeze(event: Event): void {
    this.frozen.set(event, event.defaultPrevented);
  }

  /** Marks the boundary between two keystrokes of one step. */
  separate(): void {
    this.entries.push(KEYSTROKE);
  }

  take(): string[] {
    const taken = this.entries;
    this.entries = [];
    return taken.map((entry) => {
      if (entry === KEYSTROKE) return KEYSTROKE;
      const { event, scripted } = entry;
      // The recorder prevents every submit itself, so the flag would say nothing.
      const prevented = (this.frozen.get(event) ?? event.defaultPrevented) && event.type !== 'submit';
      const type = event.type.replace(/[^\w.:-]/g, '?');
      return `${scripted ? '~' : ''}${type}${prevented ? '!' : ''}`;
    });
  }

  takeSubmitted(): string[] {
    const taken = this.submitted;
    this.submitted = [];
    return taken;
  }
}

type AnyListener = EventListenerOrEventListenerObject;

/**
 * Wraps the listeners the engine adds to `target`, and watches what it
 * dispatches there. Returns the function that undoes it.
 *
 * The methods are shadowed on the element itself, so nothing outside the
 * scenario is patched.
 */
export function instrument(target: EventTarget, scope: EngineScope, recorder: EventRecorder): () => void {
  const wrappers = new WeakMap<object, EventListener>();

  const wrap = (listener: AnyListener): EventListener => {
    const known = wrappers.get(listener);
    if (known) return known;
    const wrapped = function wrappedListener(this: unknown, event: Event): void {
      scope.run(() => (
        typeof listener === 'function' ? listener.call(this, event) : listener.handleEvent(event)
      ));
    };
    wrappers.set(listener, wrapped);
    return wrapped;
  };

  const shadows: Record<string, unknown> = {
    addEventListener(this: EventTarget, type: string, listener: AnyListener | null, options?: unknown): void {
      const registered = listener === null ? null : wrap(listener);
      EventTarget.prototype.addEventListener.call(this, type, registered, options as AddEventListenerOptions);
    },
    removeEventListener(this: EventTarget, type: string, listener: AnyListener | null, options?: unknown): void {
      const registered = listener === null ? null : wrappers.get(listener) ?? listener;
      EventTarget.prototype.removeEventListener.call(this, type, registered, options as EventListenerOptions);
    },
    dispatchEvent(this: EventTarget, event: Event): boolean {
      recorder.watch(event.type);
      return EventTarget.prototype.dispatchEvent.call(this, event);
    },
  };

  Object.entries(shadows).forEach(([name, value]) => {
    Object.defineProperty(target, name, { configurable: true, writable: true, value });
  });
  return () => Object.keys(shadows).forEach((name) => Reflect.deleteProperty(target, name));
}

/**
 * Stands in for `navigator.clipboard.writeText`, which the engine calls on
 * cut. jsdom has no clipboard, and a headless browser denies the write.
 */
export class ClipboardStub {
  /** What a paste inserts. The jsdom driver keeps its emulated clipboard here. */
  text = '';

  private writes: string[] = [];

  private restore: (() => void) | undefined;

  /** `available: false` leaves the page without a clipboard, as an insecure origin does. */
  install(available = true): void {
    if (!available) {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
      this.restore = () => Reflect.deleteProperty(navigator, 'clipboard');
      return;
    }
    const record = (value: string): Promise<void> => {
      this.writes.push(String(value));
      this.text = String(value);
      return Promise.resolve();
    };
    const holder: object = 'clipboard' in navigator && navigator.clipboard ? navigator.clipboard : navigator;
    const name = holder === navigator ? 'clipboard' : 'writeText';
    Object.defineProperty(holder, name, {
      configurable: true,
      writable: true,
      value: holder === navigator ? { writeText: record } : record,
    });
    this.restore = () => Reflect.deleteProperty(holder, name);
  }

  uninstall(): void {
    this.restore?.();
    this.restore = undefined;
  }

  takeWrites(): string[] {
    const taken = this.writes;
    this.writes = [];
    return taken;
  }
}

/** The log a scenario's callbacks write to. One per run. */
export class CallbackLog implements ScenarioContext {
  /** Set while the driver reads an observation: those calls are not the step's. */
  paused = false;

  /** Set while the browser presses the platform's paste or cut shortcut. */
  neutralModifiers = false;

  private entries: string[] = [];

  readonly log = (label: string, ...values: unknown[]): void => {
    if (this.paused) return;
    const options = { neutralModifiers: this.neutralModifiers };
    this.entries.push(`${label}(${values.map((value) => inspect(value, options)).join(', ')})`);
  };

  take(): string[] {
    const taken = this.entries;
    this.entries = [];
    return taken;
  }
}

/** A deep copy of plain data. Functions, dates and other instances are shared. */
export function clonePlain(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clonePlain);
  if (typeof value !== 'object' || value === null) return value;
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clonePlain(entry)]));
}

/**
 * The options for one engine call. The engine writes into the object it is
 * given (`option()` extends it in place), so no two calls share one.
 */
export function resolveOptions(source: OptionsSource, context: ScenarioContext): MaskOptions {
  return typeof source === 'function' ? source(context) : clonePlain(source) as MaskOptions;
}

export interface Workbench {
  stage: Stage;
  scope: EngineScope;
  recorder: EventRecorder;
  clipboard: ClipboardStub;
  log: CallbackLog;
}

function instanceOf(target: HTMLElement): unknown {
  return Reflect.get(target, 'inputmask');
}

/** The instance on the element. Throws when there is none, like calling into `undefined` would. */
export function requireInstance(target: HTMLElement): object {
  const instance = instanceOf(target);
  if (typeof instance !== 'object' || instance === null) throw new Error('the element has no inputmask');
  return instance;
}

export function invoke(receiver: object, method: string, args: readonly unknown[]): unknown {
  const member: unknown = Reflect.get(receiver, method);
  if (typeof member !== 'function') throw new Error(`${method} is not a function`);
  return Reflect.apply(member, receiver, args);
}

function attributesOf(target: HTMLElement): ElementAttributes {
  return [
    target.getAttribute('maxlength'),
    target.getAttribute('inputmode'),
    target.getAttribute('placeholder'),
    target.style.textAlign,
    target.getAttribute('dir'),
  ];
}

/** Reads everything a step is judged by, and collects what happened during it. */
export function observe(bench: Workbench, passive: boolean, watch: readonly string[] = []): StepObservation {
  const {
    stage: { target }, scope, recorder, clipboard, log,
  } = bench;

  // The reads below call the scenario's callbacks too (onUnMask, isComplete).
  // Those calls come from the harness, so they stay out of the step's log.
  log.paused = true;
  const shown = readText(target);
  const instance = instanceOf(target);
  const masked = typeof instance === 'object' && instance !== null;
  const readable = masked && !passive ? instance : null;
  const state = scope.track(() => ({
    value: passive ? shown : outcomeOf(() => Reflect.get(target, 'value')),
    unmasked: readable ? outcomeOf(() => invoke(readable, 'unmaskedvalue', [])) : null,
    complete: readable ? outcomeOf(() => invoke(readable, 'isComplete', [])) : null,
  }));
  log.paused = false;

  const observation: StepObservation = {
    text: shown,
    ...state,
    selection: selectionOf(target),
    masked,
    attrs: attributesOf(target),
    events: recorder.take(),
    log: log.take(),
    clipboard: clipboard.takeWrites(),
    submitted: recorder.takeSubmitted(),
    errors: scope.takeErrors(),
  };
  if (watch.length > 0) observation.watched = watch.map((name) => target.getAttribute(name));
  return observation;
}

function environmentOf(scenario: Scenario): ScenarioEnvironment {
  return (scenario.kind === 'interactive' ? scenario.environment : undefined) ?? {};
}

/**
 * Puts the scenario's `touch` and `userAgent` in place and returns what takes
 * them out again.
 *
 * Call it before the engine the scenario runs on is loaded. The engine reads
 * both on first use and keeps the answer, so it has to be an instance that
 * has not read them yet. A `fresh` engine, loaded after this, is one.
 */
export function applyEnvironment(scenario: Scenario): () => void {
  const { touch, userAgent } = environmentOf(scenario);
  const undo: (() => void)[] = [];

  const touchSupport = Object.getOwnPropertyDescriptor(globalThis, 'ontouchstart');
  if (touch === false && touchSupport) {
    Reflect.deleteProperty(globalThis, 'ontouchstart');
    undo.push(() => Object.defineProperty(globalThis, 'ontouchstart', touchSupport));
  }
  if (userAgent !== undefined) {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => userAgent });
    undo.push(() => Reflect.deleteProperty(navigator, 'userAgent'));
  }
  return () => undo.forEach((restore) => restore());
}

/** What is wrong with the page for this scenario, if `applyEnvironment` was skipped. */
export function environmentProblem(scenario: Scenario): string | undefined {
  const { touch, userAgent } = environmentOf(scenario);
  if (touch === false && 'ontouchstart' in globalThis) return 'the page still reports touch support';
  if (userAgent !== undefined && navigator.userAgent !== userAgent) return 'navigator.userAgent is not the one it asks for';
  return undefined;
}

interface TextChange {
  value: string;
  caret: number;
}

function changeOf(step: NativeInputStep, current: string, selection: [number, number]): TextChange {
  if (step.value !== undefined) {
    return { value: step.value, caret: step.caret ?? step.value.length };
  }

  const [start, end] = selection;
  const collapsed = start === end;
  let from = start;
  let to = end;
  let inserted = step.data ?? '';
  if (step.inputType === 'deleteContentBackward') {
    from = collapsed ? Math.max(0, start - 1) : start;
    inserted = '';
  } else if (step.inputType === 'deleteContentForward') {
    to = collapsed ? Math.min(current.length, end + 1) : end;
    inserted = '';
  }
  const caret = from + inserted.length;
  return { value: current.slice(0, from) + inserted + current.slice(to), caret: step.caret ?? caret };
}

/**
 * The browser editing the value by itself: it changes the text, moves the
 * caret and fires `input`, with at most a keydown that names no key. The same
 * synthetic events in both environments, since no keyboard produces this.
 */
export function simulateNativeInput(bench: Workbench, step: NativeInputStep): void {
  const { stage: { target }, recorder } = bench;
  const inputType = step.inputType ?? 'insertText';
  const data = step.data ?? null;
  const send = <Sent extends Event>(event: Sent): Sent => {
    target.dispatchEvent(recorder.own(event));
    return event;
  };
  // 229 is what browsers report for a key an input method swallowed.
  const unusableKey: KeyboardEventInit = {
    key: step.key, keyCode: 229, bubbles: true, cancelable: true,
  };

  if (step.key) send(new KeyboardEvent('keydown', unusableKey));

  const before = send(new InputEvent('beforeinput', {
    inputType, data, bubbles: true, cancelable: true,
  }));
  if (!before.defaultPrevented) {
    const current = readText(target);
    const end = current.length;
    const change = changeOf(step, current, selectionOf(target) ?? [end, end]);
    writeText(target, change.value);
    setSelection(target, change.caret);
    // Browsers do not let a page cancel `input`.
    send(new InputEvent('input', {
      inputType, data, bubbles: true, cancelable: false,
    }));
  }

  if (step.key) send(new KeyboardEvent('keyup', unusableKey));
}
