# Engine parity harness

This harness keeps the mask engine (`src/core/engine`) behaving the way
Inputmask 5.0.10-beta.61 does. Every fixture was first recorded from the
`inputmask` package, which the engine replaced. A scenario runs through a
driver, what it did is compared with its fixture, and any difference fails the
test.

Everything runs twice: in jsdom (`unit` project) and in Chromium (`browser`
project). The two environments have separate fixtures.

## Commands

Run from `packages/use-mask-input`.

```sh
pnpm parity                 # replay, jsdom
pnpm parity:browser         # replay, Chromium
pnpm parity:record          # rewrite both fixture sets from the engine
```

Recording writes what the engine does now. A fixture that changes is a change
in what users see, so record on purpose and read the diff before you commit
it. A new scenario has no Inputmask to compare with: check its fixture by hand.

`pnpm test` and `pnpm test:browser` include the replay.

| Variable | Effect |
|---|---|
| `PARITY_RECORD=1` | Turns the record specs on and the replay specs off. |
| `PARITY_BATCH=1` | Browser only: one command per key instead of one per run of keys. Slower, with the same result. |
| `PARITY_FRAMES=1` | Browser only: one command per step and a rendered frame after each. Much slower, with the same result. |

One scenario or one file:

```sh
pnpm parity -t 'library/cpf/typing'                          # replay by scenario id
PARITY_RECORD=1 pnpm exec vitest --project=unit --run \
  src/core/engine/__parity__/record.spec.ts -t 'records aliases-numeric'
```

## Adding scenarios

Add a file to `scenarios/` that exports `scenarios`. There is no index to
update. Ids are the fixture keys: unique across files, stable, made of letters,
digits and `. _ : + / -`.

```ts
import { blur, chars, focus, interactive, mask, press, staticCase, typing } from '../scenario';

import type { Scenario } from '../types';

export const scenarios: Scenario[] = [
  // format / unmask / isValid for each input, plus getemptymask and getmetadata
  staticCase('zip/static', { mask: '99999-999' }, ['', '01310100', '01310-100', 'abc']),

  // mask, focus, one keystroke per step, blur
  typing('zip/typing', { mask: '99999-999' }, '01310100'),

  // any sequence of steps
  interactive('zip/erase', { mask: '99999-999' }, [
    mask(), focus(), chars('01310'), press('Backspace'), blur(),
  ], { element: { attrs: { maxlength: '9' } } }),
];
```

`scenario.ts` has every step helper, and `staticFamily`, `typingFamily`,
`interactiveFamily` and `cross` to build scenarios from a table of masks and a
table of inputs. `alias('cpf')` gives the options of an alias this library
ships, resolved by `getMaskOptions`.

Then record, and commit the scenario with its fixtures.

### Callbacks

Give the options as a function to get a log, and wrap callbacks in `spy`. The
fixture then holds `this` and the arguments of every call.

```ts
interactive('cb/on-key-down', (t) => ({ mask: '99', onKeyDown: spy(t, 'onKeyDown') }), [
  mask(), focus(), text('1'),
]);
```

Calls made while the harness reads an observation (`onUnMask`, `isComplete`)
are not logged. Use a `call('unmaskedvalue')` step to log one on purpose.

### Scenario flags

- `env: 'unit' | 'browser'` restricts a scenario to one environment.
- `fresh: true` runs it on a freshly evaluated engine module, before the
  datetime alias has parsed its first date. Unit only.
- `passive: true` skips the observations that call into the engine.
- `unsettled(step)` leaves the step's timers pending. `after(ms, step)` sets
  the virtual time before it. `burst('1234')` types without running timers
  between keys.

## What a step observes

The text shown, `el.value`, the selection, `unmaskedvalue()`, `isComplete()`,
whether `el.inputmask` exists, `maxlength` / `inputmode` / `placeholder` /
`style.textAlign` / `dir`, the events dispatched on the element, what the
callbacks logged, what the engine wrote to the clipboard, what a submit would
have sent, and errors. When the engine throws, the error is recorded and the
run goes on.

In the event list `~` marks an event dispatched from script (the engine's),
`!` marks default prevented, and `|` separates the keystrokes of one step.

## What is pinned

- Every run starts at 2030-06-15T12:00Z, in UTC, and each step moves the
  clock 50ms. The datetime alias reads the year, and the engine compares
  timestamps.
- Timers run when a step ends. jsdom uses fake timers. The browser holds the
  timers the engine queues and runs each in a task of its own.
- The mask cache is emptied before each scenario, so the order scenarios run
  in does not matter.

## The jsdom driver is not a browser

It dispatches synthetic events and then does what a browser would do when the
keydown was not cancelled. Its limits:

- jsdom has `ontouchstart`, so the engine takes its mobile path: `maxlength`
  is removed from the element and the IME workaround is off.
- Ctrl and Meta shortcuts are `a` (select all), `c`, `x`, `v`. Undo does
  nothing. With Ctrl or Alt, an arrow, Backspace or Delete acts like the plain
  key. `paste` and `cut` steps use Ctrl.
- ArrowUp and ArrowDown go to the start and the end, also in a textarea.
- `change` fires on blur or Enter after a native edit, the way Chromium
  decides it. `select` and `selectionchange` are whatever jsdom fires.
- The clipboard is a string. `paste` and `cut` events carry a minimal
  `clipboardData`.
- A click sets the caret to an index. jsdom has no layout to hit-test.

## The browser driver

Real keys, mouse, focus and selection through `userEvent`. Three things are
not left to the browser, so fixtures replay on any machine:

- A click lands on a caret index. The mouse events are real, but the caret
  comes from the scenario.
- A paste carries the scenario's text, injected into the real `paste` event.
  The system clipboard is never read. `nativeInput` steps are synthetic.
- Characters outside printable ASCII are inserted as text, without a keydown.

A `cut` the engine lets through reaches the browser's clipboard. Headless
Chromium keeps a clipboard of its own; a headed run uses the system's.

What a Ctrl or Meta shortcut does natively depends on the operating system.
Keep those scenarios in `env: 'unit'` unless the engine cancels the key.

## Files

| File | Role |
|---|---|
| `types.ts` | Scenario, observation and fixture schema |
| `scenario.ts` | Authoring helpers |
| `scenarios/*.ts` | The corpus |
| `fixtures/{unit,browser}/*.json` | One file per scenario file, one line per scenario |
| `driver.ts` | Step loop and the steps both environments share |
| `driver.jsdom.ts`, `driver.browser.ts` | The two environments |
| `harness.ts` | Elements, event recorder, observation |
| `inspect.ts` | How values are rendered in logs and fixtures |
| `codec.ts`, `diff.ts` | Fixture encoding and failure messages |
| `registry.ts` | Finds the scenario files |
| `engine.ts` | Engine loading, clock and flags |
| `runner.ts` | The record and replay suites |
