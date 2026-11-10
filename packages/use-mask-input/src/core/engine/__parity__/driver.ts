import { resetEngine } from './engine';
import {
  buildStage,
  CallbackLog,
  ClipboardStub,
  clonePlain,
  DEFAULT_GAP,
  EngineScope,
  environmentProblem,
  EventRecorder,
  instrument,
  invoke,
  observe,
  requireInstance,
  resolveOptions,
  setSelection,
  simulateNativeInput,
} from './harness';
import { outcomeOf, toJson } from './inspect';

import type { Workbench } from './harness';
import type {
  EngineFactory,
  HookStep,
  InteractiveObservation,
  InteractiveScenario,
  Observation,
  Outcome,
  ParityEnv,
  Scenario,
  ScriptStep,
  StaticInputObservation,
  StaticObservation,
  StaticScenario,
  Step,
  StepObservation,
} from './types';

/**
 * Runs one scenario against one engine and returns what it observed.
 *
 * This file is the part both environments share: the static runner, the step
 * loop, and every step that is a plain API call. How a keystroke, a click or
 * a paste reaches the element is the environment's business, behind `Session`.
 */

/** Called by a session from inside `act`, at the moments the loop has to see. */
export interface ActHooks {
  /** Between two steps taken in one go. `next` is the offset of the step about to start. */
  between(next: number): void;
  /** Between two keystrokes of one `type` step. */
  keystroke(): void;
}

/** One scenario's worth of an environment: its clock, its timers, its input devices. */
export interface Session {
  /** Moves the virtual clock forward without running any timer. */
  advance(milliseconds: number): void;
  /** Runs every timer the engine queued, right now. */
  flushSync(): void;
  /** Runs every timer the engine queued and lets the environment settle. */
  flush(): Promise<void>;
  /** How many steps, starting at `from`, `act` can take at once. At least 1. */
  batchSize(steps: readonly Step[], from: number): number;
  /** Performs steps that need an input device: keys, mouse, clipboard. */
  act(steps: readonly Step[], hooks: ActHooks): Promise<void>;
  close(): Promise<void>;
}

export interface Driver {
  env: ParityEnv;
  /** Once per spec file, before an engine is loaded. */
  setup(): Promise<void>;
  teardown(): Promise<void>;
  open(bench: Workbench): Session;
}

/** Steps a session performs. Everything else is an API call the loop makes itself. */
function needsInputDevice(step: Step): boolean {
  switch (step.do) {
    case 'click':
    case 'type':
    case 'key':
    case 'paste':
    case 'cut':
    case 'mouseenter':
    case 'mouseleave':
      return true;
    case 'focus':
      return step.via === 'tab';
    default:
      return false;
  }
}

class Play {
  readonly observations: StepObservation[] = [];

  private current: Step | undefined;

  private result: Outcome | undefined;

  /** Hooks this scenario put on the engine's prototype, to take off when it ends. */
  private readonly prototypeHooks = new Set<string>();

  private readonly scenario: InteractiveScenario;

  private readonly engine: EngineFactory;

  private readonly bench: Workbench;

  private readonly session: Session;

  constructor(scenario: InteractiveScenario, engine: EngineFactory, bench: Workbench, session: Session) {
    this.scenario = scenario;
    this.engine = engine;
    this.bench = bench;
    this.session = session;
  }

  async from(index: number): Promise<void> {
    const { steps } = this.scenario;
    if (index >= steps.length) return;

    const device = needsInputDevice(steps[index]);
    const count = device ? Math.max(1, this.session.batchSize(steps, index)) : 1;
    const last = steps[index + count - 1];

    this.begin(steps[index]);
    if (device) {
      await this.session.act(steps.slice(index, index + count), {
        between: (next) => this.between(steps[index + next - 1], steps[index + next]),
        keystroke: () => this.keystroke(),
      });
    } else {
      this.apply(steps[index]);
    }
    if (last.settle !== false || last.do === 'flush') await this.session.flush();
    this.record();

    await this.from(index + count);
  }

  private begin(step: Step): void {
    this.current = step;
    this.session.advance(step.gap ?? DEFAULT_GAP);
  }

  private between(finished: Step, next: Step): void {
    if (finished.settle !== false) this.session.flushSync();
    this.record();
    this.begin(next);
  }

  private keystroke(): void {
    const step = this.current;
    if (!(step?.do === 'type' && step.burst)) this.session.flushSync();
    this.bench.recorder.separate();
    this.session.advance(step?.gap ?? DEFAULT_GAP);
  }

  /** Leaves the engine's prototype the way the scenario found it. */
  dispose(): void {
    this.prototypeHooks.forEach((name) => Reflect.deleteProperty(this.engine.prototype, name));
    this.prototypeHooks.clear();
  }

  private record(): void {
    const observation = observe(this.bench, this.scenario.passive === true, this.scenario.watch);
    if (this.result !== undefined) observation.result = this.result;
    this.result = undefined;
    this.observations.push(observation);
  }

  private setHook(step: HookStep): void {
    const { name } = step;
    const { log } = this.bench;
    const onPrototype = step.on === 'prototype';
    const holder: object = onPrototype ? this.engine.prototype : requireInstance(this.bench.stage.target);

    if (step.remove) {
      Reflect.deleteProperty(holder, name);
      if (onPrototype) this.prototypeHooks.delete(name);
      return;
    }
    Reflect.set(holder, name, function hook(this: unknown, ...args: unknown[]): void {
      log.log(name, this, ...args);
    });
    if (onPrototype) this.prototypeHooks.add(name);
  }

  private runScript(step: ScriptStep): void {
    const { stage, log, recorder } = this.bench;
    const returned = step.run({
      element: stage.target,
      form: stage.form,
      engine: this.engine,
      log: log.log,
      dispatch: (event, target = stage.target) => target.dispatchEvent(recorder.own(event)),
    });
    if (returned !== undefined) this.result = toJson(returned);
  }

  /** An API call: the same code in both environments. Errors become observations. */
  private apply(step: Step): void {
    const {
      stage: { target, form }, scope, log, recorder,
    } = this.bench;
    const instance = (): object => requireInstance(target);

    scope.run(() => {
      switch (step.do) {
        case 'mask':
          this.engine(resolveOptions(step.options ?? this.scenario.options, log)).mask(target);
          break;
        case 'option':
          invoke(instance(), 'option', [resolveOptions(step.options, log), step.noremask]);
          break;
        case 'call':
          this.result = outcomeOf(() => invoke(instance(), step.method, step.args ?? []));
          break;
        case 'focus':
          target.focus();
          break;
        case 'blur':
          target.blur();
          break;
        case 'select':
          setSelection(target, step.start, step.end ?? step.start);
          break;
        case 'setValue':
          if (step.via === 'static') this.engine.setValue(target, step.value);
          else invoke(instance(), 'setValue', [step.value]);
          break;
        case 'assign':
          Reflect.set(target, 'value', step.value);
          break;
        case 'nativeInput':
          simulateNativeInput(this.bench, step);
          break;
        case 'submit':
          if (form) form.requestSubmit();
          else scope.note('submit needs element.form in the scenario');
          break;
        case 'reset':
          if (form) form.reset();
          else scope.note('reset needs element.form in the scenario');
          break;
        case 'remove':
          if (step.via === 'static') this.engine.remove(target);
          else invoke(instance(), 'remove', []);
          break;
        case 'attr':
          if (step.value === null) target.removeAttribute(step.name);
          else target.setAttribute(step.name, step.value);
          break;
        case 'checkValidity':
          invoke(target, 'checkValidity', []);
          break;
        case 'orphan':
          Reflect.set(target, 'inputmask', undefined);
          break;
        case 'dispatch':
          target.dispatchEvent(recorder.own(new CustomEvent(step.event, {
            bubbles: true, cancelable: true, detail: clonePlain(step.detail),
          })));
          break;
        case 'hook':
          this.setHook(step);
          break;
        case 'script':
          this.runScript(step);
          break;
        default:
          // `flush` does nothing by itself: the loop flushes after every step.
          break;
      }
    });
  }
}

async function runInteractive(
  scenario: InteractiveScenario,
  engine: EngineFactory,
  driver: Driver,
): Promise<InteractiveObservation> {
  const problem = environmentProblem(scenario);
  if (problem) {
    throw new Error(`${scenario.id}: ${problem}. Call applyEnvironment(scenario) before loading the engine it runs on.`);
  }

  const stage = buildStage(scenario.element);
  const scope = new EngineScope();
  const recorder = new EventRecorder(stage);
  const bench: Workbench = {
    stage, scope, recorder, clipboard: new ClipboardStub(), log: new CallbackLog(),
  };

  // Vitest only fails a run on window errors nobody listens for. These catch
  // what escapes the wrapped listeners, so a throw becomes an observation too.
  const onError = (event: ErrorEvent): void => {
    scope.report(event.error ?? event.message);
    event.preventDefault();
  };
  const onRejection = (event: PromiseRejectionEvent): void => {
    scope.report(event.reason);
    event.preventDefault();
  };

  // A selection or focus left by the previous scenario changes what an editing
  // host reports after blur, so every scenario starts without either.
  document.getSelection()?.removeAllRanges();
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

  document.body.append(stage.root);
  const restoreTarget = instrument(stage.target, scope, recorder);
  const restoreForm = stage.form ? instrument(stage.form, scope, recorder) : undefined;
  bench.clipboard.install(scenario.environment?.clipboard !== false);
  recorder.start();
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  let session: Session | undefined;
  let play: Play | undefined;

  try {
    session = driver.open(bench);
    play = new Play(scenario, engine, bench, session);
    await play.from(0);
    return { kind: 'interactive', steps: play.observations };
  } finally {
    try {
      await session?.close();
    } finally {
      play?.dispose();
      // Whatever closing the session did, the next scenario starts clean.
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      recorder.stop();
      bench.clipboard.uninstall();
      restoreTarget();
      restoreForm?.();
      stage.root.remove();
    }
  }
}

function runStatic(scenario: StaticScenario, engine: EngineFactory): StaticObservation {
  const log = new CallbackLog();
  // A fresh options object per call: the engine keeps and extends what it is given.
  const options = (): ReturnType<typeof resolveOptions> => resolveOptions(scenario.options, log);

  const emptyMask = outcomeOf(() => engine(options()).getemptymask());
  const metadata = outcomeOf(() => engine(options()).getmetadata());
  log.take();

  const inputs = scenario.inputs.map((input): StaticInputObservation => ({
    format: outcomeOf(() => engine.format(input, options())),
    unmask: outcomeOf(() => engine.unmask(input, options())),
    valid: outcomeOf(() => engine.isValid(input, options())),
    log: log.take(),
  }));

  return {
    kind: 'static', emptyMask, metadata, inputs,
  };
}

/**
 * Runs a scenario from a clean engine. The same call records a fixture and
 * replays one.
 */
export async function runScenario(
  scenario: Scenario,
  engine: EngineFactory,
  driver: Driver,
): Promise<Observation> {
  resetEngine(engine);
  return scenario.kind === 'static'
    ? runStatic(scenario, engine)
    : runInteractive(scenario, engine, driver);
}
