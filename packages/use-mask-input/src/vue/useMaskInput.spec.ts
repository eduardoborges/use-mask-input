/* eslint-disable import-x/no-extraneous-dependencies */
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it } from 'vitest';

import useMaskInput from './useMaskInput';
import vMaskInput from './directive';
import { formatWithMask } from '../core';

describe('useMaskInput', () => {
  it('masks the element the ref is bound to', () => {
    const { maskRef } = useMaskInput('cpf');
    const input = document.createElement('input');

    maskRef(input);

    expect(input.inputmask).toBeDefined();
  });

  it('passes options through to the engine', () => {
    const { maskRef } = useMaskInput('currency', { prefix: 'R$ ' });
    const input = document.createElement('input');

    maskRef(input);

    expect(input.inputmask?.opts?.prefix).toBe('R$ ');
  });

  it('returns the unmasked value', () => {
    const { maskRef, unmaskedValue } = useMaskInput('cpf');
    const input = document.createElement('input');
    document.body.appendChild(input);

    maskRef(input);
    input.inputmask?.setValue?.('12345678901');

    expect(input.value).toBe('123.456.789-01');
    expect(unmaskedValue()).toBe('12345678901');
  });

  it('returns an empty string before the ref is attached', () => {
    const { unmaskedValue } = useMaskInput('cpf');
    expect(unmaskedValue()).toBe('');
  });

  it('clears its element when the ref detaches on unmount', () => {
    const { maskRef, unmaskedValue } = useMaskInput('cpf');
    const input = document.createElement('input');

    maskRef(input);
    expect(() => maskRef(null)).not.toThrow();

    expect(unmaskedValue()).toBe('');
  });

  it('reaches the inner input when bound to a component instance', () => {
    const Inner = defineComponent({
      render: () => h('div', [h('input')]),
    });

    const { maskRef } = useMaskInput('cpf');
    const Host = defineComponent({
      render: () => h(Inner, { ref: maskRef as never }),
    });

    const wrapper = mount(Host);

    expect(wrapper.find('input').element.inputmask).toBeDefined();
  });

  it('resolves the same configuration as the directive', () => {
    // Both surfaces route through applyMask, so a given mask and options must
    // produce identical engine configuration.
    const viaComposable = document.createElement('input');
    useMaskInput('brl-currency', { prefix: 'US$ ' }).maskRef(viaComposable);

    const viaDirective = document.createElement('input');
    vMaskInput.mounted?.(
      viaDirective,
      { value: { mask: 'brl-currency', options: { prefix: 'US$ ' } } } as never,
      {} as never,
      null as never,
    );

    expect(viaComposable.inputmask?.opts?.prefix)
      .toBe(viaDirective.inputmask?.opts?.prefix);
    expect(viaComposable.inputmask?.opts?.radixPoint)
      .toBe(viaDirective.inputmask?.opts?.radixPoint);
    expect(viaComposable.inputmask?.opts?.groupSeparator)
      .toBe(viaDirective.inputmask?.opts?.groupSeparator);
  });

  it('formats identically to the static engine helper', () => {
    expect(formatWithMask('12345678901', 'cpf')).toBe('123.456.789-01');
  });
});
