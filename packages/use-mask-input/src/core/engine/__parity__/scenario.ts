import { getMaskOptions } from '../../maskConfig';

import type { Mask, Options } from '../../../types/mask';
import type {
  AssignStep,
  AttrStep,
  BlurStep,
  CallStep,
  CheckValidityStep,
  ClickStep,
  CutStep,
  DispatchStep,
  ElementSetup,
  FlushStep,
  FocusStep,
  HookName,
  HookStep,
  InteractiveScenario,
  KeyModifiers,
  KeyStep,
  MaskOptions,
  MaskStep,
  MouseEnterStep,
  MouseLeaveStep,
  NativeInputStep,
  OptionStep,
  OptionsSource,
  OrphanStep,
  PasteStep,
  RemoveStep,
  ResetStep,
  ScenarioContext,
  ScenarioEnv,
  ScenarioEnvironment,
  ScriptPage,
  ScriptStep,
  SelectStep,
  SetValueStep,
  StaticScenario,
  Step,
  SubmitStep,
  TypeStep,
} from './types';

/**
 * The authoring API. A scenario file exports `scenarios`, built with what is
 * here: step helpers, the three scenario builders, and the family helpers
 * that turn a table of masks and a table of inputs into many scenarios.
 */

/** Steps can be nested one level, so helpers that return several fit in a list. */
export type StepList = readonly (Step | readonly Step[])[];

export interface ScenarioExtras {
  env?: ScenarioEnv;
  fresh?: boolean;
}

export interface InteractiveExtras extends ScenarioExtras {
  element?: ElementSetup;
  passive?: boolean;
  /** `touch` and `userAgent` make the scenario `fresh`, since the engine reads them once. */
  environment?: ScenarioEnvironment;
  watch?: readonly string[];
}

// --- steps -----------------------------------------------------------------

export function mask(options?: OptionsSource): MaskStep {
  return options === undefined ? { do: 'mask' } : { do: 'mask', options };
}

export function option(options: OptionsSource, noremask?: boolean): OptionStep {
  return noremask === undefined ? { do: 'option', options } : { do: 'option', options, noremask };
}

/** Calls an instance method and observes what it returns: `call('option', 'mask')`. */
export function call(method: string, ...args: unknown[]): CallStep {
  return { do: 'call', method, args };
}

export function focus(via?: 'script' | 'tab'): FocusStep {
  return via === undefined ? { do: 'focus' } : { do: 'focus', via };
}

export function blur(): BlurStep {
  return { do: 'blur' };
}

export function click(caret?: number): ClickStep {
  return caret === undefined ? { do: 'click' } : { do: 'click', caret };
}

/** Types the whole text in one step: one observation at the end. */
export function text(value: string): TypeStep {
  return { do: 'type', text: value };
}

/** Like `text`, with every timer held until the last keystroke. */
export function burst(value: string): TypeStep {
  return { do: 'type', text: value, burst: true };
}

/** One step per character, so a failure names the keystroke that diverged. */
export function chars(value: string): TypeStep[] {
  return Array.from(value, (character) => text(character));
}

/** A single key, with modifiers: `press('Home', { shift: true })`. */
export function press(key: string, modifiers: KeyModifiers = {}): KeyStep {
  return { do: 'key', key, ...modifiers };
}

export function select(start: number, end?: number): SelectStep {
  return end === undefined ? { do: 'select', start } : { do: 'select', start, end };
}

export function paste(value: string): PasteStep {
  return { do: 'paste', text: value };
}

export function cut(): CutStep {
  return { do: 'cut' };
}

export function setValue(value: string, via?: 'instance' | 'static'): SetValueStep {
  return via === undefined ? { do: 'setValue', value } : { do: 'setValue', value, via };
}

/** `el.value = value`. */
export function assign(value: string): AssignStep {
  return { do: 'assign', value };
}

export function nativeInput(details: Omit<NativeInputStep, 'do'>): NativeInputStep {
  return { do: 'nativeInput', ...details };
}

/** A character committed by an IME: a `Process` keydown, then a composition insert. */
export function ime(data: string): NativeInputStep {
  return nativeInput({ data, key: 'Process', inputType: 'insertCompositionText' });
}

/** A character from a mobile keyboard: an `Unidentified` keydown, then the insert. */
export function mobileKey(data: string): NativeInputStep {
  return nativeInput({ data, key: 'Unidentified' });
}

/** The browser replacing the whole value, as autofill does. */
export function autofill(value: string): NativeInputStep {
  return nativeInput({ value, inputType: 'insertReplacementText' });
}

export function hover(): MouseEnterStep {
  return { do: 'mouseenter' };
}

export function unhover(): MouseLeaveStep {
  return { do: 'mouseleave' };
}

export function submit(): SubmitStep {
  return { do: 'submit' };
}

export function reset(): ResetStep {
  return { do: 'reset' };
}

export function remove(via?: 'instance' | 'static'): RemoveStep {
  return via === undefined ? { do: 'remove' } : { do: 'remove', via };
}

export function flush(): FlushStep {
  return { do: 'flush' };
}

export function attr(name: string, value: string | null): AttrStep {
  return { do: 'attr', name, value };
}

export function checkValidity(): CheckValidityStep {
  return { do: 'checkValidity' };
}

/** The element loses its instance and keeps its listeners, like a node cloned with its events. */
export function orphan(): OrphanStep {
  return { do: 'orphan' };
}

/** The page dispatches a `CustomEvent` on the element: `dispatch('setvalue', ['12', 1])`. */
export function dispatch(event: string, detail?: unknown): DispatchStep {
  return detail === undefined ? { do: 'dispatch', event } : { do: 'dispatch', event, detail };
}

/** Defines an engine hook that logs its calls, on the instance or on the prototype. */
export function hook(name: HookName, on?: 'instance' | 'prototype'): HookStep {
  return on === undefined ? { do: 'hook', name } : { do: 'hook', name, on };
}

export function unhook(name: HookName, on?: 'instance' | 'prototype'): HookStep {
  return { ...hook(name, on), remove: true };
}

/** Page code no other step covers. The label says what it does. */
export function script(label: string, run: (page: ScriptPage) => unknown): ScriptStep {
  return { do: 'script', label, run };
}

/** Leaves the step's timers pending, so the next step runs before them. */
export function unsettled<S extends Step>(step: S): S {
  return { ...step, settle: false };
}

/** Sets how many virtual milliseconds pass before the step. */
export function after<S extends Step>(gap: number, step: S): S {
  return { ...step, gap };
}

// --- options ---------------------------------------------------------------

/** Options of an alias this library ships, resolved the way the library does. */
export function alias(name: Mask, options?: MaskOptions): MaskOptions {
  return { ...getMaskOptions(name, options as Options | undefined) };
}

/**
 * A callback that logs `this` and its arguments, then defers to `implementation`.
 * The log lands in the fixture, which is how a scenario pins down what a
 * callback is called with.
 */
export function spy<Args extends unknown[], Result>(
  context: ScenarioContext,
  name: string,
  implementation?: (this: unknown, ...args: Args) => Result,
): (this: unknown, ...args: Args) => Result | undefined {
  return function spied(this: unknown, ...args: Args): Result | undefined {
    context.log(name, this, ...args);
    return implementation?.apply(this, args);
  };
}

// --- scenarios -------------------------------------------------------------

/** `format`, `unmask` and `isValid` for every input, plus the empty mask and metadata. */
export function staticCase(
  id: string,
  options: OptionsSource,
  inputs: readonly string[],
  extras: ScenarioExtras = {},
): StaticScenario {
  return {
    kind: 'static', id, options, inputs, ...extras,
  };
}

export function interactive(
  id: string,
  options: OptionsSource,
  steps: StepList,
  extras: InteractiveExtras = {},
): InteractiveScenario {
  const { touch, userAgent } = extras.environment ?? {};
  const readOnce = touch !== undefined || userAgent !== undefined;
  return {
    kind: 'interactive', id, options, steps: steps.flat(), ...extras, ...(readOnce ? { fresh: true } : {}),
  };
}

/** Masks, focuses, types the text one keystroke per step, and blurs. */
export function typing(
  id: string,
  options: OptionsSource,
  value: string,
  extras: InteractiveExtras = {},
): InteractiveScenario {
  return interactive(id, options, [mask(), focus(), chars(value), blur()], extras);
}

// --- families --------------------------------------------------------------

/** Every pairing of the two tables, in table order. */
export function cross<Left, Right, Result>(
  lefts: Record<string, Left>,
  rights: Record<string, Right>,
  build: (leftName: string, left: Left, rightName: string, right: Right) => Result,
): Result[] {
  return Object.entries(lefts).flatMap(([leftName, left]) => (
    Object.entries(rights).map(([rightName, right]) => build(leftName, left, rightName, right))
  ));
}

/** One static scenario per mask, `<prefix>/<mask name>`, all with the same inputs. */
export function staticFamily(
  prefix: string,
  masks: Record<string, OptionsSource>,
  inputs: readonly string[],
  extras: ScenarioExtras = {},
): StaticScenario[] {
  return Object.entries(masks).map(([name, options]) => (
    staticCase(`${prefix}/${name}`, options, inputs, extras)
  ));
}

/** One typing scenario per mask and text: `<prefix>/<mask name>/<text name>`. */
export function typingFamily(
  prefix: string,
  masks: Record<string, OptionsSource>,
  texts: Record<string, string>,
  extras: InteractiveExtras = {},
): InteractiveScenario[] {
  return cross(masks, texts, (maskName, options, textName, value) => (
    typing(`${prefix}/${maskName}/${textName}`, options, value, extras)
  ));
}

/** One interactive scenario per mask, all running the same steps. */
export function interactiveFamily(
  prefix: string,
  masks: Record<string, OptionsSource>,
  steps: StepList,
  extras: InteractiveExtras = {},
): InteractiveScenario[] {
  return Object.entries(masks).map(([name, options]) => (
    interactive(`${prefix}/${name}`, options, steps, extras)
  ));
}
