/**
 * Schema of the parity harness: what a scenario is, what the driver observes,
 * and how observations are stored in a fixture.
 *
 * Scenarios are TypeScript because options can hold functions. Fixtures are
 * JSON and hold observations only.
 */

/** Anything a fixture can store. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Mask options as the engine receives them. Values are free-form on purpose. */
export type MaskOptions = Record<string, unknown>;

/** Handed to an options factory so callbacks can leave a trace in the fixture. */
export interface ScenarioContext {
  /** Appends `label(values…)` to the log of the step that is running. */
  log(label: string, ...values: unknown[]): void;
}

/**
 * Plain options are deep-cloned for every run. A factory is called once per
 * run, which is what callbacks need to reach the run's own log.
 */
export type OptionsSource = MaskOptions | ((context: ScenarioContext) => MaskOptions);

/** Where a scenario is meaningful. Defaults to `both`. */
export type ScenarioEnv = 'unit' | 'browser' | 'both';

interface ScenarioBase {
  /** Stable and unique across every scenario file. Used as the fixture key. */
  id: string;
  env?: ScenarioEnv;
  options: OptionsSource;
  /**
   * Runs on a freshly evaluated engine module, before anything else touched
   * it. Module-level engine state (the datetime alias keeps some) is only
   * reachable this way. Unit project only.
   */
  fresh?: boolean;
}

/** The engine's static helpers applied to a list of inputs. It needs no DOM. */
export interface StaticScenario extends ScenarioBase {
  kind: 'static';
  inputs: readonly string[];
}

export interface ElementSetup {
  /**
   * Defaults to `input`. Any tag other than `input` and `textarea` gives an
   * element with no `value` of its own: the engine supports it in part, or in
   * full when it has a `contenteditable` attribute.
   */
  tag?: string;
  /** `type` attribute of an input. Left out when undefined. */
  type?: string;
  /** Set before the first step: maxlength, dir, placeholder, readonly, disabled, inputmode… */
  attrs?: Record<string, string>;
  /** Initial value, or initial text. Also the value a form reset restores. */
  value?: string;
  /** Wraps the element in a `<form>`. Needed by `submit`, `reset` and Enter. */
  form?: boolean;
}

export interface KeyModifiers {
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  shift?: boolean;
}

interface StepTiming {
  /** Virtual milliseconds that pass before the step. Defaults to 50. */
  gap?: number;
  /**
   * `false` leaves the timers the step queued pending, so the next step runs
   * before them. A later step, or `flush`, runs them.
   */
  settle?: boolean;
}

/** `Inputmask(options).mask(el)`. Without options it uses the scenario's. */
export interface MaskStep extends StepTiming {
  do: 'mask';
  options?: OptionsSource;
}

/** `el.inputmask.option(options, noremask)`. */
export interface OptionStep extends StepTiming {
  do: 'option';
  options: OptionsSource;
  noremask?: boolean;
}

/** Any other instance method. The return value is observed. */
export interface CallStep extends StepTiming {
  do: 'call';
  method: string;
  args?: readonly unknown[];
}

export interface FocusStep extends StepTiming {
  do: 'focus';
  /** `script` calls `el.focus()`. `tab` arrives with the Tab key, which selects the text. */
  via?: 'script' | 'tab';
}

export interface BlurStep extends StepTiming {
  do: 'blur';
}

/** A mouse click that lands on the given caret index. Defaults to the end of the text. */
export interface ClickStep extends StepTiming {
  do: 'click';
  caret?: number;
}

/** One keystroke per character. */
export interface TypeStep extends StepTiming {
  do: 'type';
  text: string;
  /** Holds every timer until the last keystroke, like input faster than the event loop. */
  burst?: boolean;
}

/** A single key: `Backspace`, `ArrowLeft`, `Tab`, `a`… */
export interface KeyStep extends StepTiming, KeyModifiers {
  do: 'key';
  key: string;
}

/** `el.setSelectionRange(start, end)`. */
export interface SelectStep extends StepTiming {
  do: 'select';
  start: number;
  end?: number;
}

export interface PasteStep extends StepTiming {
  do: 'paste';
  text: string;
}

export interface CutStep extends StepTiming {
  do: 'cut';
}

/** `el.inputmask.setValue(value)` or `Inputmask.setValue(el, value)`. */
export interface SetValueStep extends StepTiming {
  do: 'setValue';
  value: string;
  via?: 'instance' | 'static';
}

/** `el.value = value`, through whatever accessor the element has. */
export interface AssignStep extends StepTiming {
  do: 'assign';
  value: string;
}

/**
 * The browser changed the value on its own and fired `input`: IME, mobile
 * keyboards, autofill. Synthetic in both environments.
 */
export interface NativeInputStep extends StepTiming {
  do: 'nativeInput';
  /** Inserted at the selection. Ignored when `value` is given. */
  data?: string;
  /** Replaces the whole value. */
  value?: string;
  /** Caret after the change. Defaults to the end of what was inserted. */
  caret?: number;
  /** Defaults to `insertText`. `deleteContentBackward` and `deleteContentForward` delete. */
  inputType?: string;
  /** A keydown that carries no usable key, sent first. */
  key?: 'Process' | 'Unidentified';
}

export interface MouseEnterStep extends StepTiming {
  do: 'mouseenter';
}

export interface MouseLeaveStep extends StepTiming {
  do: 'mouseleave';
}

export interface SubmitStep extends StepTiming {
  do: 'submit';
}

export interface ResetStep extends StepTiming {
  do: 'reset';
}

/** `el.inputmask.remove()` or `Inputmask.remove(el)`. */
export interface RemoveStep extends StepTiming {
  do: 'remove';
  via?: 'instance' | 'static';
}

/** Runs every pending timer. */
export interface FlushStep extends StepTiming {
  do: 'flush';
}

/** Sets an attribute, or removes it with `null`. */
export interface AttrStep extends StepTiming {
  do: 'attr';
  name: string;
  value: string | null;
}

/** `el.checkValidity()`, which fires `invalid` on an invalid element. */
export interface CheckValidityStep extends StepTiming {
  do: 'checkValidity';
}

/**
 * `el.inputmask = undefined`: the element loses its instance while the
 * listeners and whatever the engine stored on it stay, as on a node cloned
 * together with its events.
 */
export interface OrphanStep extends StepTiming {
  do: 'orphan';
}

/** The page dispatches a `CustomEvent` of its own on the element. */
export interface DispatchStep extends StepTiming {
  do: 'dispatch';
  event: string;
  detail?: unknown;
}

/** The hooks the engine calls when they are defined. */
export type HookName = 'caretHook' | 'keyEventHook' | 'writeBufferHook' | 'applyMaskHook';

/**
 * Defines one of the engine's hooks as a function that logs `this` and its
 * arguments. On the prototype it is there for instances yet to be created,
 * which is the only way `applyMaskHook` gets called; the harness takes it off
 * again when the scenario ends.
 */
export interface HookStep extends StepTiming {
  do: 'hook';
  name: HookName;
  /** Defaults to `instance`. */
  on?: 'instance' | 'prototype';
  /** Takes the hook off instead. */
  remove?: boolean;
}

/** What a `script` step gets to work with. */
export interface ScriptPage {
  element: HTMLElement;
  form: HTMLFormElement | null;
  /** The engine under test, for what no step covers. */
  engine: EngineFactory;
  log: ScenarioContext['log'];
  /** Dispatches an event as the page would, so the log does not take it for the engine's. */
  dispatch(event: Event, target?: EventTarget): boolean;
}

/**
 * Page code no other step covers. What it returns is observed like the
 * result of a `call`. Anything it changes outside the element outlives the
 * scenario, unless the scenario is `fresh`.
 */
export interface ScriptStep extends StepTiming {
  do: 'script';
  /** Says what the script does. Shown in failure messages. */
  label: string;
  run: (page: ScriptPage) => unknown;
}

export type Step =
  | MaskStep
  | OptionStep
  | CallStep
  | FocusStep
  | BlurStep
  | ClickStep
  | TypeStep
  | KeyStep
  | SelectStep
  | PasteStep
  | CutStep
  | SetValueStep
  | AssignStep
  | NativeInputStep
  | MouseEnterStep
  | MouseLeaveStep
  | SubmitStep
  | ResetStep
  | RemoveStep
  | FlushStep
  | AttrStep
  | CheckValidityStep
  | OrphanStep
  | DispatchStep
  | HookStep
  | ScriptStep;

/**
 * What the page reports about itself. `touch` and `userAgent` are read by the
 * engine once, when its module is evaluated or on first use, so they only
 * work on a `fresh` engine, in the unit project.
 */
export interface ScenarioEnvironment {
  /** `false` takes touch support away, so the engine does not take its mobile path. */
  touch?: boolean;
  /** What `navigator.userAgent` returns. */
  userAgent?: string;
  /** `false` leaves the page without `navigator.clipboard`, as on an insecure origin. */
  clipboard?: boolean;
}

/** A masked element driven through a sequence of steps. */
export interface InteractiveScenario extends ScenarioBase {
  kind: 'interactive';
  element?: ElementSetup;
  steps: readonly Step[];
  /**
   * Skips the observations that call into the engine (`el.value`,
   * `unmaskedvalue()`, `isComplete()`), for when reading them would change
   * what the next step does.
   */
  passive?: boolean;
  environment?: ScenarioEnvironment;
  /** Attributes observed after every step, on top of the fixed five. */
  watch?: readonly string[];
}

export type Scenario = StaticScenario | InteractiveScenario;

/** A value the engine returned, or the message of what it threw. */
export type Outcome = JsonValue | { throws: string };

export interface StaticInputObservation {
  format: Outcome;
  unmask: Outcome;
  valid: Outcome;
  /** Callback log of the three calls. */
  log: string[];
}

export interface StaticObservation {
  kind: 'static';
  emptyMask: Outcome;
  metadata: Outcome;
  inputs: StaticInputObservation[];
}

/** `maxlength`, `inputmode`, `placeholder`, `style.textAlign`, `dir`. */
export type ElementAttributes = [
  maxlength: string | null,
  inputmode: string | null,
  placeholder: string | null,
  textAlign: string,
  dir: string | null,
];

/** What the driver sees once a step and its timers are done. */
export interface StepObservation {
  /** The text the user sees: the native value, read past any patched accessor. */
  text: string;
  /** `el.value` through the element's own accessor. */
  value: Outcome;
  /** `[selectionStart, selectionEnd]`, or null where the element has no selection. */
  selection: [number, number] | null;
  /** `el.inputmask.unmaskedvalue()`. Null without an instance. */
  unmasked: Outcome;
  /** `el.inputmask.isComplete()`. Null without an instance. */
  complete: Outcome;
  /** Whether `el.inputmask` exists. */
  masked: boolean;
  attrs: ElementAttributes;
  /**
   * Events dispatched on the element (and its form) during the step, in order.
   * `~` in front marks one dispatched from script, `!` after marks default
   * prevented. `|` separates the keystrokes of a `type` step.
   */
  events: string[];
  /** What the scenario's callbacks logged during the step. */
  log: string[];
  /** Text the engine wrote with `navigator.clipboard.writeText`. */
  clipboard: string[];
  /** The value the form would have sent, once per `submit` event. */
  submitted: string[];
  /** Messages of errors thrown during the step. */
  errors: string[];
  /** Return value of a `call` or `script` step. Absent for every other step. */
  result?: Outcome;
  /** The attributes the scenario watches, in its order. Absent when it watches none. */
  watched?: (string | null)[];
}

export interface InteractiveObservation {
  kind: 'interactive';
  steps: StepObservation[];
}

export type Observation = StaticObservation | InteractiveObservation;

/**
 * One step in a fixture. State fields are left out when equal to the previous
 * step; the others are left out when empty.
 */
export interface EncodedStep {
  /** text */
  t?: string;
  /** value, only when it differs from the text */
  v?: JsonValue;
  /** selection: a number when collapsed, a pair otherwise */
  s?: number | [number, number] | null;
  /** unmasked */
  u?: JsonValue;
  /** complete */
  c?: JsonValue;
  /** masked, as 1 or 0 */
  m?: 0 | 1;
  /** attributes */
  a?: ElementAttributes;
  /** events, run-length encoded into one string */
  e?: string;
  /** log */
  l?: string[];
  /** clipboard */
  k?: string[];
  /** submitted */
  b?: string[];
  /** errors */
  x?: string[];
  /** result */
  r?: JsonValue;
  /** watched attributes */
  w?: (string | null)[];
}

/** `[format, unmask, valid]`, plus the log when there is one. */
export type EncodedStaticInput =
  | [format: JsonValue, unmask: JsonValue, valid: JsonValue]
  | [format: JsonValue, unmask: JsonValue, valid: JsonValue, log: string[]];

export type EncodedStatic = [emptyMask: JsonValue, metadata: JsonValue, inputs: EncodedStaticInput[]];

export type EncodedObservation = EncodedStatic | EncodedStep[];

/** A fixture file: one entry per scenario id. */
export type Fixture = Record<string, EncodedObservation>;

export type ParityEnv = 'unit' | 'browser';

/** The public surface of an Inputmask instance, as far as the harness drives it. */
export interface EngineInstance {
  mask(element: Element): unknown;
  getemptymask(): unknown;
  getmetadata(): unknown;
  [member: string]: unknown;
}

/** The engine's default export: callable without `new`, with the static helpers. */
export interface EngineFactory {
  (options?: MaskOptions): EngineInstance;
  format(value: string, options?: MaskOptions, metadata?: unknown): unknown;
  unmask(value: string, options?: MaskOptions): unknown;
  isValid(value: string, options?: MaskOptions): unknown;
  remove(element: Element): unknown;
  setValue(element: Element, value: string): unknown;
  prototype: { masksCache?: Record<string, unknown> };
}
