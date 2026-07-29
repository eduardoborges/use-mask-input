/* eslint-disable import-x/no-extraneous-dependencies */
import { mount } from '@vue/test-utils';
import { defineComponent, h, withDirectives } from 'vue';
import { describe, expect, it } from 'vitest';

import vMaskInput from './directive';

import type { VueMaskBinding } from './types';

/**
 * Lifecycle coverage: mount applies, update re-applies only on a real change,
 * unmount tears down. None of this needs a keyboard, so it stays in the fast
 * jsdom project. Real typing lives in directive.browser.spec.ts.
 *
 * Render functions rather than `template` strings throughout, so the suite
 * doesn't need Vue's runtime template compiler.
 */

const Host = defineComponent({
  props: { binding: { type: null as never, default: null } },
  render() {
    return withDirectives(h('input'), [[vMaskInput, this.binding as VueMaskBinding]]);
  },
});

const Wrapped = defineComponent({
  render: () => h('div', { class: 'wrap' }, [h('span', [h('input')])]),
});

function mountHost(binding: VueMaskBinding) {
  return mount(Host, { props: { binding } });
}

function maskOf(el: Element) {
  return (el as HTMLInputElement).inputmask;
}

describe('v-mask-input', () => {
  it('applies the mask on mount', () => {
    expect(maskOf(mountHost('cpf').element)).toBeDefined();
  });

  it('applies a raw pattern', () => {
    expect(maskOf(mountHost('(99) 99999-9999').element)).toBeDefined();
  });

  it('applies an array of patterns', () => {
    expect(maskOf(mountHost(['999-999', '999-999-999']).element)).toBeDefined();
  });

  it('applies the object form with options', () => {
    const wrapper = mountHost({ mask: 'currency', options: { prefix: 'R$ ' } });
    expect(maskOf(wrapper.element)?.opts?.prefix).toBe('R$ ');
  });

  it('lets user options override an alias default', () => {
    const wrapper = mountHost({ mask: 'brl-currency', options: { prefix: 'US$ ' } });
    const opts = maskOf(wrapper.element)?.opts;

    expect(opts?.prefix).toBe('US$ ');
    // the alias's own defaults survive the merge
    expect(opts?.radixPoint).toBe(',');
    expect(opts?.groupSeparator).toBe('.');
  });

  it('does not mask when the binding is null', () => {
    expect(maskOf(mountHost(null).element)).toBeUndefined();
  });

  it('re-applies when the mask changes', async () => {
    const wrapper = mountHost('cpf');
    const before = maskOf(wrapper.element);

    await wrapper.setProps({ binding: 'cnpj' });

    expect(maskOf(wrapper.element)).not.toBe(before);
  });

  it('does not re-apply when a re-render leaves the binding unchanged', async () => {
    const wrapper = mountHost('cpf');
    const before = maskOf(wrapper.element);

    await wrapper.setProps({ binding: 'cpf' });

    expect(maskOf(wrapper.element)).toBe(before);
  });

  it('does not re-apply for a structurally identical fresh object', async () => {
    // An inline object binding allocates a new object every render; identity
    // comparison alone would rebuild the buffer and drop the caret mid-typing.
    const wrapper = mountHost({ mask: 'cpf', options: { placeholder: '#' } });
    const before = maskOf(wrapper.element);

    await wrapper.setProps({ binding: { mask: 'cpf', options: { placeholder: '#' } } });

    expect(maskOf(wrapper.element)).toBe(before);
  });

  it('removes the mask instance on unmount', () => {
    const wrapper = mountHost('cpf');
    const { element } = wrapper;
    expect(maskOf(element)).toBeDefined();

    wrapper.unmount();

    expect(maskOf(element)).toBeUndefined();
  });

  it('reaches the inner input of a wrapper component', () => {
    const WrapperHost = defineComponent({
      render: () => withDirectives(h(Wrapped), [[vMaskInput, 'cpf']]),
    });

    const wrapper = mount(WrapperHost);

    expect(maskOf(wrapper.find('input').element)).toBeDefined();
  });

  it('exposes getSSRProps so server rendering does not warn', () => {
    expect(vMaskInput.getSSRProps?.({} as never, {} as never)).toEqual({});
  });
});
