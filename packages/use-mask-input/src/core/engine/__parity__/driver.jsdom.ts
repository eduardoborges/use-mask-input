import { vi } from 'vitest';

import { CLOCK_START } from './engine';
import {
  isBackwardSelection, isEditable, isEditingHost, isTextControl, readText, selectionOf, setSelection,
  writeText,
} from './harness';

import type { ActHooks, Driver, Session } from './driver';
import type { TextControl, Workbench } from './harness';
import type { KeyModifiers, Step } from './types';

/**
 * The jsdom driver: synthetic events, plus the default actions jsdom leaves
 * out.
 *
 * A browser acts on a keydown nobody cancelled: it inserts the character,
 * deletes, moves the caret, moves focus. jsdom dispatches the event and stops
 * there, so this file does the rest. The emulation is small on purpose: both
 * engines only need the same stimulus, and that does not take a faithful
 * browser.
 *
 * What is edited is a text control or an editing host (`contenteditable`). A
 * host has no selection of its own: its caret is the document's selection.
 */

type ModifierFlag = keyof KeyModifiers;

const FAKED_TIMERS = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] as const;

/** A flush that still has timers after this many rounds is a timer loop. */
const MAX_FLUSH_ROUNDS = 20;

/** The order a hand presses modifiers in, with the key each one reports. */
const MODIFIER_KEYS: [flag: ModifierFlag, key: string][] = [
  ['ctrl', 'Control'],
  ['shift', 'Shift'],
  ['alt', 'Alt'],
  ['meta', 'Meta'],
];

const KEY_CODES: Record<string, number> = {
  Backspace: 8,
  Tab: 9,
  Enter: 13,
  Shift: 16,
  Control: 17,
  Alt: 18,
  Escape: 27,
  ' ': 32,
  PageUp: 33,
  PageDown: 34,
  End: 35,
  Home: 36,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Insert: 45,
  Delete: 46,
  Meta: 91,
};

const CARET_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);

function isPrintable(key: string): boolean {
  return Array.from(key).length === 1;
}

function keyCodeOf(key: string): number {
  if (key in KEY_CODES) return KEY_CODES[key];
  return /^[a-z0-9]$/i.test(key) ? key.toUpperCase().charCodeAt(0) : 0;
}

function codeOf(key: string): string {
  if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`;
  if (/^\d$/.test(key)) return `Digit${key}`;
  if (key === ' ') return 'Space';
  return isPrintable(key) ? '' : key;
}

function flagsOf(held: [ModifierFlag, string][]): KeyModifiers {
  return Object.fromEntries(held.map(([flag]) => [flag, true]));
}

/** A disabled or read-only control takes no edits. An editing host is never either. */
function isLocked(element: HTMLElement): boolean {
  return isTextControl(element) && (element.disabled || element.readOnly);
}

/** The most characters the element holds, or -1 when nothing limits it. */
function limitOf(element: HTMLElement): number {
  return isTextControl(element) ? element.maxLength : -1;
}

function selectionInside(element: HTMLElement): boolean {
  return selectionOf(element) !== null;
}

/** A control the user edited, and what it held before the first of those edits. */
interface UserEdit {
  control: TextControl;
  before: string;
}

class JsdomSession implements Session {
  private pointerOver = false;

  private userEdit: UserEdit | undefined;

  private readonly bench: Workbench;

  constructor(bench: Workbench) {
    this.bench = bench;
    vi.useFakeTimers({ now: CLOCK_START, toFake: [...FAKED_TIMERS] });
    // A browser fires `change` right before `blur`.
    bench.recorder.before('blur', (event) => {
      if (event.target === this.userEdit?.control) this.commitChange();
    });
    this.followFocus();
  }

  /**
   * An editing host gets the caret at its start when focus arrives from
   * elsewhere, and the browser drops the selection again when focus leaves.
   * jsdom moves focus and leaves the selection alone.
   */
  private followFocus(): void {
    const { stage: { target }, recorder } = this.bench;
    recorder.before('focus', (event) => {
      if (event.target === target && isEditingHost(target) && !selectionInside(target)) setSelection(target, 0);
    });
    recorder.before('blur', (event) => {
      if (event.target === target && isEditingHost(target) && selectionInside(target)) {
        document.getSelection()?.removeAllRanges();
      }
    });
  }

  advance(milliseconds: number): void {
    // Sets the clock without firing anything: pending timers stay pending.
    vi.setSystemTime(Date.now() + milliseconds);
  }

  flushSync(): void {
    let rounds = 0;
    while (vi.getTimerCount() > 0 && rounds < MAX_FLUSH_ROUNDS) {
      try {
        vi.runAllTimers();
      } catch (error) {
        this.bench.scope.report(error);
      }
      rounds += 1;
    }
    if (vi.getTimerCount() > 0) {
      this.bench.scope.note('timers kept rescheduling; the rest were dropped');
      vi.clearAllTimers();
    }
  }

  flush(): Promise<void> {
    this.flushSync();
    return Promise.resolve();
  }

  // One step at a time: nothing here is slow enough to be worth batching.
  batchSize(): number {
    return 1;
  }

  act(steps: readonly Step[], hooks: ActHooks): Promise<void> {
    this.perform(steps[0], hooks);
    return Promise.resolve();
  }

  close(): Promise<void> {
    vi.useRealTimers();
    // Real timers bring the real clock back, and static scenarios read it too.
    vi.setSystemTime(new Date(CLOCK_START));
    return Promise.resolve();
  }

  private perform(step: Step, hooks: ActHooks): void {
    switch (step.do) {
      case 'click':
        this.click(step.caret);
        break;
      case 'type':
        Array.from(step.text).forEach((character, index) => {
          if (index > 0) hooks.keystroke();
          this.press(character, {});
        });
        break;
      case 'key':
        this.press(step.key, step);
        break;
      case 'paste':
        this.bench.clipboard.text = step.text;
        this.press('v', { ctrl: true });
        break;
      case 'cut':
        this.press('x', { ctrl: true });
        break;
      case 'mouseenter':
        this.pointerEnter();
        break;
      case 'mouseleave':
        this.pointerLeave();
        break;
      case 'focus':
        this.bench.stage.before.focus();
        this.press('Tab', {});
        break;
      default:
        break;
    }
  }

  // --- keyboard ------------------------------------------------------------

  /** Keys go wherever focus is, like a keyboard's do. */
  private focused(): Element {
    return document.activeElement ?? document.body;
  }

  private key(type: string, key: string, modifiers: KeyModifiers): KeyboardEvent {
    const event = new KeyboardEvent(type, {
      key,
      code: codeOf(key),
      keyCode: keyCodeOf(key),
      bubbles: true,
      cancelable: true,
      composed: true,
      ctrlKey: modifiers.ctrl === true,
      metaKey: modifiers.meta === true,
      altKey: modifiers.alt === true,
      shiftKey: modifiers.shift === true,
    });
    this.focused().dispatchEvent(this.bench.recorder.own(event));
    return event;
  }

  private press(key: string, modifiers: KeyModifiers): void {
    const held = MODIFIER_KEYS.filter(([flag]) => modifiers[flag]);
    held.forEach(([, name], index) => this.key('keydown', name, flagsOf(held.slice(0, index + 1))));

    const down = this.key('keydown', key, modifiers);
    if (!down.defaultPrevented) this.defaultAction(key, modifiers);
    this.key('keyup', key, modifiers);

    held
      .map(([, name], index) => ({ name, still: flagsOf(held.slice(0, index)) }))
      .toReversed()
      .forEach(({ name, still }) => this.key('keyup', name, still));
  }

  /** What a browser does with a keydown the page did not cancel. */
  private defaultAction(key: string, modifiers: KeyModifiers): void {
    const target = this.focused();
    const control = isEditable(target) ? target : null;

    if (CARET_KEYS.has(key)) {
      this.moveCaret(control, key, modifiers);
    } else if (key === 'Backspace') {
      this.erase(control, 'deleteContentBackward');
    } else if (key === 'Delete') {
      this.erase(control, 'deleteContentForward');
    } else if (key === 'Tab') {
      this.tab(modifiers.shift === true);
    } else if (key === 'Enter') {
      this.enter(control, modifiers);
    } else if (modifiers.ctrl || modifiers.meta) {
      this.shortcut(control, key.toLowerCase());
    } else if (isPrintable(key) && !modifiers.alt) {
      const pressed = this.key('keypress', key, modifiers);
      if (!pressed.defaultPrevented) this.insert(control, key, 'insertText');
    }
  }

  private moveCaret(control: HTMLElement | null, key: string, modifiers: KeyModifiers): void {
    const selection = selectionOf(control);
    if (!control || !selection) return;

    const [start, end] = selection;
    const { length } = readText(control);
    const backward = isBackwardSelection(control);
    const anchor = backward ? end : start;
    const head = backward ? start : end;
    const stepwise = start === end || modifiers.shift === true;

    let next = length;
    if (key === 'Home' || key === 'ArrowUp' || (key === 'ArrowLeft' && modifiers.meta)) {
      next = 0;
    } else if (key === 'ArrowLeft') {
      // Without Shift, an arrow collapses a selection to its edge.
      next = stepwise ? Math.max(0, head - 1) : start;
    } else if (key === 'ArrowRight' && !modifiers.meta) {
      next = stepwise ? Math.min(length, head + 1) : end;
    }

    if (modifiers.shift) {
      setSelection(control, Math.min(anchor, next), Math.max(anchor, next), next < anchor ? 'backward' : 'forward');
    } else {
      setSelection(control, next);
    }
  }

  private tab(backwards: boolean): void {
    const { before, target, after } = this.bench.stage;
    const order = [before, target, after].filter((element) => !(isTextControl(element) && element.disabled));
    const active = document.activeElement;
    const index = order.findIndex((element) => element === active);
    if (index === -1) return;

    const next = order[index + (backwards ? -1 : 1)];
    if (!next) {
      order[index].blur();
      return;
    }
    next.focus();
    // Arriving with Tab selects the whole text of a control.
    if (document.activeElement === next && isTextControl(next)) setSelection(next, 0, readText(next).length);
  }

  private enter(control: HTMLElement | null, modifiers: KeyModifiers): void {
    if (this.key('keypress', 'Enter', modifiers).defaultPrevented) return;
    if (control instanceof HTMLTextAreaElement) {
      this.insert(control, '\n', 'insertLineBreak');
      return;
    }
    // In an editing host a browser starts a new block. That is not emulated.
    if (!isTextControl(control)) return;
    // Enter finishes editing an input, the way leaving it does.
    if (control === this.userEdit?.control) this.commitChange();
    // Implicit submission: Enter in the only field of a form submits it.
    control.form?.requestSubmit();
  }

  private shortcut(control: HTMLElement | null, key: string): void {
    switch (key) {
      case 'a':
        if (control) setSelection(control, 0, readText(control).length);
        break;
      case 'c':
        this.copy(control);
        break;
      case 'x':
        this.cut(control);
        break;
      case 'v':
        this.paste(control);
        break;
      default:
        // Undo and the rest: a programmatic write empties the undo stack, so
        // a masked field has nothing for the browser to undo.
        break;
    }
  }

  // --- editing -------------------------------------------------------------

  private inputEvent(control: HTMLElement, type: 'beforeinput' | 'input', inputType: string, data: string | null): InputEvent {
    const event = new InputEvent(type, {
      inputType,
      data,
      bubbles: true,
      composed: true,
      // Browsers let a page cancel `beforeinput` but not `input`.
      cancelable: type === 'beforeinput',
    });
    control.dispatchEvent(this.bench.recorder.own(event));
    return event;
  }

  /** Replaces a range of the text, with the events a browser fires around the edit. */
  private edit(control: HTMLElement, range: [number, number], inserted: string, inputType: string, data: string | null): void {
    const [from, to] = range;
    const changes = from !== to || inserted !== '';
    if (this.inputEvent(control, 'beforeinput', inputType, data).defaultPrevented || !changes) return;

    const current = readText(control);
    // Only a text control reports its edits with `change`.
    if (isTextControl(control) && this.userEdit?.control !== control) this.userEdit = { control, before: current };
    writeText(control, current.slice(0, from) + inserted + current.slice(to));
    setSelection(control, from + inserted.length);
    this.inputEvent(control, 'input', inputType, data);
  }

  /**
   * The native `change`: fired when editing ends, if the user edited the
   * control and it no longer holds what it held before the first edit. Values
   * set from script do not count as edits, so a mask that handles every key
   * itself never triggers it.
   */
  private commitChange(): void {
    const edit = this.userEdit;
    this.userEdit = undefined;
    if (!edit || readText(edit.control) === edit.before) return;
    edit.control.dispatchEvent(this.bench.recorder.own(new Event('change', { bubbles: true })));
  }

  private editableRange(control: HTMLElement | null): [number, number] | null {
    if (!control || isLocked(control)) return null;
    const end = readText(control).length;
    return selectionOf(control) ?? [end, end];
  }

  private insert(control: HTMLElement | null, text: string, inputType: string): void {
    const range = this.editableRange(control);
    if (!control || !range) return;

    const kept = readText(control).length - (range[1] - range[0]);
    const limit = limitOf(control);
    const room = limit < 0 ? text.length : Math.max(0, limit - kept);
    this.edit(control, range, text.slice(0, room), inputType, text);
  }

  private erase(control: HTMLElement | null, inputType: 'deleteContentBackward' | 'deleteContentForward'): void {
    const range = this.editableRange(control);
    if (!control || !range) return;

    let [from, to] = range;
    if (from === to && inputType === 'deleteContentBackward') from = Math.max(0, from - 1);
    else if (from === to) to = Math.min(readText(control).length, to + 1);
    this.edit(control, [from, to], '', inputType, null);
  }

  // --- clipboard -----------------------------------------------------------

  private clipboardEvent(type: 'copy' | 'cut' | 'paste'): Event {
    const { clipboard, recorder } = this.bench;
    const event = new Event(type, { bubbles: true, cancelable: true, composed: true });
    // jsdom has neither ClipboardEvent nor DataTransfer.
    Object.defineProperty(event, 'clipboardData', {
      value: {
        types: ['text/plain'],
        getData: (format: string) => (type === 'paste' && /^text/i.test(format) ? clipboard.text : ''),
        setData: () => undefined,
      },
    });
    this.focused().dispatchEvent(recorder.own(event));
    return event;
  }

  private selectedText(control: HTMLElement | null): string {
    const selection = selectionOf(control);
    return control && selection ? readText(control).slice(selection[0], selection[1]) : '';
  }

  private copy(control: HTMLElement | null): void {
    if (this.clipboardEvent('copy').defaultPrevented) return;
    const selected = this.selectedText(control);
    if (selected !== '') this.bench.clipboard.text = selected;
  }

  private cut(control: HTMLElement | null): void {
    if (this.clipboardEvent('cut').defaultPrevented) return;
    // Read after the event: the page's handler may have moved the selection,
    // and the browser cuts whatever is selected by then.
    const range = this.editableRange(control);
    const selected = this.selectedText(control);
    if (!control || !range || selected === '') return;
    this.bench.clipboard.text = selected;
    this.edit(control, range, '', 'deleteByCut', null);
  }

  private paste(control: HTMLElement | null): void {
    if (this.clipboardEvent('paste').defaultPrevented) return;
    this.insert(control, this.bench.clipboard.text, 'insertFromPaste');
  }

  // --- mouse ---------------------------------------------------------------

  private mouse(type: string, bubbles = true): MouseEvent {
    const event = new MouseEvent(type, {
      bubbles, cancelable: bubbles, composed: true, button: 0, detail: 1,
    });
    this.bench.stage.target.dispatchEvent(this.bench.recorder.own(event));
    return event;
  }

  private pointerEnter(): void {
    if (this.pointerOver) return;
    this.pointerOver = true;
    this.mouse('mouseover');
    this.mouse('mouseenter', false);
    this.mouse('mousemove');
  }

  private pointerLeave(): void {
    if (!this.pointerOver) return;
    this.pointerOver = false;
    this.mouse('mouseout');
    this.mouse('mouseleave', false);
  }

  private click(caret: number | undefined): void {
    const { target } = this.bench.stage;
    this.pointerEnter();
    // A disabled control gets no button events at all.
    if (isTextControl(target) && target.disabled) return;

    if (!this.mouse('mousedown').defaultPrevented) {
      if (document.activeElement !== target) target.focus();
      const { length } = readText(target);
      setSelection(target, Math.min(caret ?? length, length));
    }
    this.mouse('mouseup');
    this.mouse('click');
  }
}

let previousZone: string | undefined;

export const jsdomDriver: Driver = {
  env: 'unit',

  setup(): Promise<void> {
    // The datetime alias formats "today" in local time.
    previousZone = process.env.TZ;
    process.env.TZ = 'UTC';
    return Promise.resolve();
  },

  teardown(): Promise<void> {
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
    vi.useRealTimers();
    return Promise.resolve();
  },

  open: (bench) => new JsdomSession(bench),
};
