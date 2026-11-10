import { vi } from 'vitest';
import { cdp, userEvent } from 'vitest/browser';

import { CLOCK_START, readFlag } from './engine';
import { readText, setSelection } from './harness';

import type { ActHooks, Driver, Session } from './driver';
import type { EngineScope, Workbench } from './harness';
import type { KeyModifiers, KeyStep, Step, TypeStep } from './types';

/**
 * The browser driver: real keys, a real mouse, real focus and selection,
 * through `userEvent`.
 *
 * Three things are pinned down, because a fixture recorded on one machine has
 * to replay on another:
 *
 * - Timers the engine queues are held and run at known points, each in a task
 *   of its own. Left alone, a `setTimeout(0)` races the next input event.
 * - A click lands on a caret index. Font metrics differ per platform, so the
 *   same pixel would not be the same character everywhere.
 * - A paste carries the scenario's text. The real clipboard needs permission
 *   and belongs to whoever is at the machine.
 */

/** Keys `userEvent.keyboard` sends as real key presses, by name. */
const NAMED_KEYS = new Set([
  'Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'Insert', 'Home', 'End',
  'PageUp', 'PageDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Shift', 'Control', 'Alt', 'Meta',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
]);

const HELD_KEYS: [flag: keyof KeyModifiers, key: string][] = [
  ['ctrl', 'Control'],
  ['shift', 'Shift'],
  ['alt', 'Alt'],
  ['meta', 'Meta'],
];

/** Consecutive key steps sent to the browser in one command, unless PARITY_BATCH says otherwise. */
const DEFAULT_BATCH = 48;

/** Ids of held timers start here, out of the way of the ones the browser hands out. */
const FIRST_TIMER_ID = 2 ** 30;

/** More timer runs than this in one flush is a timer loop. */
const MAX_TIMER_RUNS = 5000;

/** Printable ASCII is what the provider presses as keys. Anything else it inserts as text. */
function isPressable(character: string): boolean {
  return /^[ -~]$/.test(character);
}

/** `{` and `[` open a key descriptor in the keyboard syntax; doubled, they are themselves. */
function literal(character: string): string {
  return character === '{' || character === '[' ? character + character : character;
}

function heldBy(step: KeyModifiers): string[] {
  return HELD_KEYS.filter(([flag]) => step[flag]).map(([, key]) => key);
}

function keyboardText(step: TypeStep | KeyStep): string {
  if (step.do === 'type') return Array.from(step.text, literal).join('');
  const held = heldBy(step);
  const key = isPressable(step.key) ? literal(step.key) : `{${step.key}}`;
  const down = held.map((name) => `{${name}>}`).join('');
  const up = held.toReversed().map((name) => `{/${name}}`).join('');
  return `${down}${key}${up}`;
}

function isKeyboardStep(step: Step): step is TypeStep | KeyStep {
  if (step.do === 'type') return step.text !== '' && Array.from(step.text).every(isPressable);
  return step.do === 'key' && (isPressable(step.key) || NAMED_KEYS.has(step.key));
}

/** What a trusted keydown means to the loop, in the order the browser will send them. */
type Boundary = { kind: 'none' } | { kind: 'keystroke' } | { kind: 'step'; offset: number };

function boundariesOf(steps: readonly (TypeStep | KeyStep)[]): Boundary[] {
  return steps.flatMap((step, offset) => {
    const first: Boundary = offset === 0 ? { kind: 'none' } : { kind: 'step', offset };
    if (step.do === 'key') {
      return [first, ...heldBy(step).map((): Boundary => ({ kind: 'none' }))];
    }
    const rest = Array.from(step.text).slice(1).map((): Boundary => ({ kind: 'keystroke' }));
    return [first, ...rest];
  });
}

function nextFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function nextTask(): Promise<void> {
  // A message instead of a timer, because the browser clamps nested timers to 4ms.
  return new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.addEventListener('message', () => {
      channel.port1.close();
      resolve();
    }, { once: true });
    channel.port1.start();
    channel.port2.postMessage(null);
  });
}

interface HeldTimer {
  id: number;
  due: number;
  order: number;
  run: () => void;
}

/**
 * Holds the timers the engine queues, and runs them when the driver says so.
 *
 * Only calls made while engine code is on the stack are held. Everything else
 * on the page, Vitest included, keeps its real timers.
 */
class TimerGate {
  private held: HeldTimer[] = [];

  private lastId = FIRST_TIMER_ID;

  private readonly native = { setTimeout: window.setTimeout, clearTimeout: window.clearTimeout };

  private readonly scope: EngineScope;

  constructor(scope: EngineScope) {
    this.scope = scope;
  }

  private readonly schedule = (handler: unknown, delay?: unknown, ...args: unknown[]): unknown => {
    if (!this.scope.active || typeof handler !== 'function') {
      return Reflect.apply(this.native.setTimeout, window, [handler, delay, ...args]);
    }
    this.lastId += 1;
    this.held.push({
      id: this.lastId,
      due: Date.now() + (Number(delay) || 0),
      order: this.lastId,
      run: () => Reflect.apply(handler, window, args),
    });
    return this.lastId;
  };

  private readonly cancel = (id?: unknown): void => {
    const index = this.held.findIndex((timer) => timer.id === id);
    if (index === -1) Reflect.apply(this.native.clearTimeout, window, [id]);
    else this.held.splice(index, 1);
  };

  install(): void {
    Object.defineProperty(window, 'setTimeout', { configurable: true, writable: true, value: this.schedule });
    Object.defineProperty(window, 'clearTimeout', { configurable: true, writable: true, value: this.cancel });
  }

  /** Puts the real timers back. Whatever is still held is dropped. */
  uninstall(): void {
    Object.defineProperty(window, 'setTimeout', { configurable: true, writable: true, value: this.native.setTimeout });
    Object.defineProperty(window, 'clearTimeout', { configurable: true, writable: true, value: this.native.clearTimeout });
    this.held = [];
  }

  private runNext(): void {
    const next = this.held.reduce((first, timer) => {
      const sooner = timer.due < first.due || (timer.due === first.due && timer.order < first.order);
      return sooner ? timer : first;
    });
    this.held.splice(this.held.indexOf(next), 1);
    if (next.due > Date.now()) vi.setSystemTime(new Date(next.due));
    this.scope.run(next.run);
  }

  /** Runs everything held, including what those runs queue, without yielding. */
  flushSync(): void {
    let runs = 0;
    while (this.held.length > 0 && runs < MAX_TIMER_RUNS) {
      this.runNext();
      runs += 1;
    }
    if (this.held.length > 0) {
      this.scope.note('timers kept rescheduling; the rest were dropped');
      this.held = [];
    }
  }

  /** Runs everything held, one task per timer, then yields once more to let the page settle. */
  async flush(budget = MAX_TIMER_RUNS): Promise<void> {
    await nextTask();
    if (this.held.length === 0) return;
    if (budget === 0) {
      this.flushSync();
      return;
    }
    this.runNext();
    await this.flush(budget - 1);
  }
}

interface KeyPlan {
  boundaries: Boundary[];
  seen: number;
  hooks: ActHooks;
}

class BrowserSession implements Session {
  private readonly gate: TimerGate;

  /**
   * PARITY_FRAMES waits for a rendered frame after every step, which also
   * means one step per command. Nothing here depends on a frame; the switch is
   * there to show it, at several times the run time.
   */
  private readonly waitsForFrames = readFlag('PARITY_FRAMES') !== undefined;

  private readonly maxBatch = this.waitsForFrames
    ? 1
    : Math.max(1, Number(readFlag('PARITY_BATCH')) || DEFAULT_BATCH);

  private plan: KeyPlan | undefined;

  private clickCaret: { caret: number | undefined } | undefined;

  private pasting: string | undefined;

  private pointerOver = false;

  private readonly bench: Workbench;

  constructor(bench: Workbench) {
    this.bench = bench;
    this.gate = new TimerGate(bench.scope);
    this.gate.install();
    vi.setSystemTime(new Date(CLOCK_START));
    bench.recorder.before('keydown', this.onKeyDown);
    bench.recorder.before('mousedown', this.onMouseDown);
    bench.recorder.before('paste', this.onPaste);
    window.addEventListener('paste', this.afterPaste);
  }

  advance(milliseconds: number): void {
    vi.setSystemTime(new Date(Date.now() + milliseconds));
  }

  flushSync(): void {
    this.gate.flushSync();
  }

  async flush(): Promise<void> {
    await this.gate.flush();
    if (this.waitsForFrames) await nextFrame();
  }

  batchSize(steps: readonly Step[], from: number): number {
    const run = steps.slice(from, from + this.maxBatch).findIndex((step) => !isKeyboardStep(step));
    return run === -1 ? Math.min(this.maxBatch, steps.length - from) : run;
  }

  async act(steps: readonly Step[], hooks: ActHooks): Promise<void> {
    if (steps.every(isKeyboardStep)) {
      await this.pressKeys(steps, hooks);
      return;
    }

    const { stage, log } = this.bench;
    const [step] = steps;
    switch (step.do) {
      case 'click':
        this.clickCaret = { caret: step.caret };
        await userEvent.click(stage.target, { force: true }).finally(() => {
          this.clickCaret = undefined;
        });
        this.pointerOver = true;
        break;
      case 'type':
        await this.typeOneByOne(Array.from(step.text), 0, hooks);
        break;
      case 'key':
        await userEvent.keyboard(keyboardText(step));
        break;
      case 'paste':
        this.pasting = step.text;
        log.neutralModifiers = true;
        await userEvent.paste().finally(() => {
          this.pasting = undefined;
          log.neutralModifiers = false;
        });
        break;
      case 'cut':
        log.neutralModifiers = true;
        await userEvent.cut().finally(() => {
          log.neutralModifiers = false;
        });
        break;
      case 'mouseenter':
        await userEvent.hover(stage.target, { force: true });
        this.pointerOver = true;
        break;
      case 'mouseleave':
        await this.movePointerAway();
        break;
      case 'focus':
        stage.before.focus();
        await userEvent.keyboard('{Tab}');
        break;
      default:
        break;
    }
  }

  async close(): Promise<void> {
    // A pointer left over the next scenario's element would enter it by itself.
    if (this.pointerOver) await this.movePointerAway();
    window.removeEventListener('paste', this.afterPaste);
    this.gate.uninstall();
    vi.setSystemTime(new Date(CLOCK_START));
  }

  private async movePointerAway(): Promise<void> {
    await userEvent.hover(this.bench.stage.away, { force: true });
    this.pointerOver = false;
  }

  /**
   * Sends a run of key steps as one command. A round trip to the browser per
   * key costs a frame; a run of keys in one command costs about one.
   *
   * The steps still end where they should: each trusted keydown that opens a
   * new step or keystroke first closes the one before it, from `onKeyDown`.
   */
  private async pressKeys(steps: readonly (TypeStep | KeyStep)[], hooks: ActHooks): Promise<void> {
    const plan: KeyPlan = { boundaries: boundariesOf(steps), seen: 0, hooks };
    this.plan = plan;
    await userEvent.keyboard(steps.map(keyboardText).join('')).finally(() => {
      this.plan = undefined;
    });
    if (plan.seen !== plan.boundaries.length) {
      this.bench.scope.note(`expected ${plan.boundaries.length} keydowns, the browser sent ${plan.seen}`);
    }
  }

  /** For text the provider cannot press as keys: one command per character. */
  private async typeOneByOne(characters: string[], index: number, hooks: ActHooks): Promise<void> {
    if (index >= characters.length) return;
    if (index > 0) hooks.keystroke();
    await userEvent.keyboard(literal(characters[index]));
    await this.typeOneByOne(characters, index + 1, hooks);
  }

  private readonly onKeyDown = (event: Event): void => {
    const { plan } = this;
    if (!plan || !event.isTrusted) return;
    const boundary = plan.boundaries[plan.seen];
    plan.seen += 1;
    if (boundary?.kind === 'step') plan.hooks.between(boundary.offset);
    else if (boundary?.kind === 'keystroke') plan.hooks.keystroke();
  };

  /**
   * Takes over what the browser does on mousedown: move focus, place the
   * caret. The events stay real; the caret lands on the index the scenario
   * names instead of wherever the pixel falls in this platform's font.
   */
  private readonly onMouseDown = (event: Event): void => {
    const { target } = this.bench.stage;
    if (!this.clickCaret || !event.isTrusted || event.target !== target) return;
    event.preventDefault();
    if (document.activeElement !== target) target.focus();
    const { length } = readText(target);
    setSelection(target, Math.min(this.clickCaret.caret ?? length, length));
  };

  private readonly onPaste = (event: Event): void => {
    const text = this.pasting;
    if (text === undefined || !event.isTrusted) return;
    Object.defineProperty(event, 'clipboardData', {
      configurable: true,
      value: {
        types: ['text/plain'],
        items: [],
        files: [],
        getData: (format: string) => (/^text/i.test(format) ? text : ''),
        setData: () => undefined,
      },
    });
  };

  /** The browser would insert its own clipboard. Insert the scenario's text instead. */
  private readonly afterPaste = (event: Event): void => {
    if (this.pasting === undefined || !event.isTrusted || event.defaultPrevented) return;
    // The page let the paste through. Cancelling it here is the driver's doing.
    this.bench.recorder.freeze(event);
    event.preventDefault();
    document.execCommand('insertText', false, this.pasting);
  };
}

export const browserDriver: Driver = {
  env: 'browser',

  async setup(): Promise<void> {
    try {
      // The datetime alias formats "today" in local time.
      await cdp().send('Emulation.setTimezoneOverride', { timezoneId: 'UTC' });
    } catch {
      // Only Chromium speaks CDP. Elsewhere the machine's zone stays.
    }
  },

  teardown(): Promise<void> {
    vi.useRealTimers();
    return Promise.resolve();
  },

  open: (bench) => new BrowserSession(bench),
};
