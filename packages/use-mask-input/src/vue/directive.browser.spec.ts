/* eslint-disable import-x/no-extraneous-dependencies */
import { userEvent } from '@vitest/browser/context';
import { createApp, ref } from 'vue';
import {
  afterEach, describe, expect, it,
} from 'vitest';

import vMaskInput from './directive';

import type { App } from 'vue';

/**
 * The parts jsdom cannot prove.
 *
 * The rest of this repo's suite deliberately never simulates a keystroke —
 * see the header comments in core/optionsPassthrough.spec.ts and
 * core/maxLength.spec.ts for why. jsdom reports `ontouchstart`, so Inputmask
 * takes its mobile path and clears `maxlength` itself; caret and selection
 * behaviour is approximate; and simulated input does not round-trip through
 * the engine the way a real browser does.
 *
 * So everything here is a real Chromium, real keystrokes, real caret, and real
 * compiler-generated `v-model` — the browser project aliases `vue` to the full
 * build so `template` strings compile, rather than hand-wiring `vModelText`
 * and testing an approximation of what ships.
 */

let active: { app: App; host: HTMLDivElement } | null = null;

function render(options: Parameters<typeof createApp>[0]) {
  const host = document.createElement('div');
  document.body.appendChild(host);

  const app = createApp(options);
  app.directive('mask-input', vMaskInput);
  app.mount(host);
  active = { app, host };

  const input = host.querySelector('input');
  if (!input) throw new Error('no input rendered');

  return input;
}

function teardown() {
  active?.app.unmount();
  active?.host.remove();
  active = null;
}

/**
 * The text the user actually sees.
 *
 * Inputmask replaces the element's `value` property, and under `autoUnmask`
 * its getter returns the *unmasked* value. Reading the masked display
 * therefore has to go through the native descriptor.
 */
function displayed(el: HTMLInputElement): string {
  const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  return native?.get?.call(el) as string;
}

afterEach(teardown);

describe('typing through a mask in a real browser', () => {
  it('formats a cpf alias as the user types', async () => {
    const input = render({ template: '<input v-mask-input="\'cpf\'" />' });

    await userEvent.click(input);
    await userEvent.type(input, '12345678901');

    expect(displayed(input)).toBe('123.456.789-01');
  });

  it('formats a raw pattern as the user types', async () => {
    const input = render({ template: '<input v-mask-input="\'(99) 99999-9999\'" />' });

    await userEvent.click(input);
    await userEvent.type(input, '11987654321');

    expect(displayed(input)).toBe('(11) 98765-4321');
  });

  it('matches the longer pattern from an array as input grows', async () => {
    const input = render({
      data: () => ({ masks: ['999-999', '999-999-999'] }),
      template: '<input v-mask-input="masks" />',
    });

    await userEvent.click(input);
    await userEvent.type(input, '123456789');

    expect(displayed(input)).toBe('123-456-789');
  });

  it('keeps maxlength from blocking a literal-bearing mask (#191)', async () => {
    // jsdom cannot show this: it reports ontouchstart, so Inputmask clears the
    // attribute itself there and the assertion proves nothing.
    const input = render({ template: '<input maxlength="11" v-mask-input="\'cpf\'" />' });

    await userEvent.click(input);
    await userEvent.type(input, '12345678901');

    expect(displayed(input)).toBe('123.456.789-01');
  });

  it('leaves maxlength alone for an open-ended mask', () => {
    const input = render({ template: '<input maxlength="5" v-mask-input="\'numeric\'" />' });

    expect(input.getAttribute('maxlength')).toBe('5');
  });
});

describe('v-model interaction', () => {
  it('binds the unmasked value while displaying the masked one', async () => {
    const model = ref('');
    const input = render({
      setup: () => ({ model }),
      template: '<input v-model="model" v-mask-input="{ mask: \'cpf\', options: { autoUnmask: true } }" />',
    });

    await userEvent.click(input);
    await userEvent.type(input, '12345678901');

    expect(displayed(input)).toBe('123.456.789-01');
    expect(model.value).toBe('12345678901');
  });

  it('binds the masked value without autoUnmask', async () => {
    const model = ref('');
    const input = render({
      setup: () => ({ model }),
      template: '<input v-model="model" v-mask-input="\'cpf\'" />',
    });

    await userEvent.click(input);
    await userEvent.type(input, '12345678901');

    expect(model.value).toBe('123.456.789-01');
  });

  it('produces the same result whichever directive is declared first', async () => {
    // Inputmask owns the element's `value` accessor, so v-model reads and
    // writes through the engine regardless of directive hook order.
    const modelFirst = ref('');
    const inputA = render({
      setup: () => ({ model: modelFirst }),
      template: '<input v-model="model" v-mask-input="{ mask: \'cpf\', options: { autoUnmask: true } }" />',
    });
    await userEvent.click(inputA);
    await userEvent.type(inputA, '12345678901');
    const displayA = displayed(inputA);

    teardown();

    const maskFirst = ref('');
    const inputB = render({
      setup: () => ({ model: maskFirst }),
      template: '<input v-mask-input="{ mask: \'cpf\', options: { autoUnmask: true } }" v-model="model" />',
    });
    await userEvent.click(inputB);
    await userEvent.type(inputB, '12345678901');

    expect(displayed(inputB)).toBe(displayA);
    expect(maskFirst.value).toBe(modelFirst.value);
  });

  it('masks an initial value provided by the model', () => {
    const model = ref('12345678901');
    const input = render({
      setup: () => ({ model }),
      template: '<input v-model="model" v-mask-input="{ mask: \'cpf\', options: { autoUnmask: true } }" />',
    });

    expect(displayed(input)).toBe('123.456.789-01');
  });

  it('registers the first delete after a programmatic value (#193)', async () => {
    const model = ref('12345678901');
    const input = render({
      setup: () => ({ model }),
      template: '<input v-model="model" v-mask-input="{ mask: \'cpf\', options: { autoUnmask: true } }" />',
    });

    await userEvent.click(input);
    // select-all via the element rather than a chord: it is Meta+A on macOS and
    // Control+A elsewhere, and this spec has to pass on both.
    input.select();
    await userEvent.keyboard('{Delete}');

    // The React side had to force ref ordering to make this fire (#193).
    expect(model.value).not.toBe('12345678901');

    await userEvent.type(input, '98765432100');

    expect(displayed(input)).toBe('987.654.321-00');
    expect(model.value).toBe('98765432100');
  });
});

describe('caret behaviour', () => {
  it('keeps value and caret when a re-render leaves the binding unchanged', async () => {
    const spare = ref(0);
    const input = render({
      setup: () => ({ spare }),
      template: '<div>{{ spare }}<input v-mask-input="\'cpf\'" /></div>',
    });

    await userEvent.click(input);
    await userEvent.type(input, '12345678');

    const valueBefore = displayed(input);
    input.setSelectionRange(4, 4);

    spare.value += 1;
    await new Promise((resolve) => { requestAnimationFrame(() => resolve(null)); });

    expect(displayed(input)).toBe(valueBefore);
    expect(input.selectionStart).toBe(4);
  });
});
