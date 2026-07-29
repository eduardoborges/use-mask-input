import { describe, expect, it } from 'vitest';

import resolveVueElement from './resolveVueElement';

/**
 * Vue hands a `:ref` callback the component's public instance, not an element.
 * These cases cover every shape that can arrive, including the ones that must
 * resolve to null rather than guess.
 */

function wrapperWith(inner: string) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = inner;
  return wrapper;
}

describe('resolveVueElement', () => {
  it('returns a native input unchanged', () => {
    const input = document.createElement('input');
    expect(resolveVueElement(input)).toBe(input);
  });

  it('digs the input out of a wrapper element', () => {
    const wrapper = wrapperWith('<span><input /></span>');
    expect(resolveVueElement(wrapper)).toBe(wrapper.querySelector('input'));
  });

  it('unwraps a component instance whose $el is a wrapper', () => {
    const wrapper = wrapperWith('<input />');
    expect(resolveVueElement({ $el: wrapper })).toBe(wrapper.querySelector('input'));
  });

  it('unwraps a component instance whose $el is the input itself', () => {
    const input = document.createElement('input');
    expect(resolveVueElement({ $el: input })).toBe(input);
  });

  it('resolves a textarea', () => {
    const wrapper = wrapperWith('<textarea></textarea>');
    expect(resolveVueElement(wrapper)).toBe(wrapper.querySelector('textarea'));
  });

  it('returns null for a fragment root, where $el is a text anchor node', () => {
    // Vue itself refuses this case for directives, so the composable does too
    // rather than walk to parentElement and risk finding a sibling input.
    expect(resolveVueElement({ $el: document.createTextNode('') })).toBeNull();
  });

  it('returns null when the component has no maskable element', () => {
    expect(resolveVueElement({ $el: wrapperWith('<span>no input</span>') })).toBeNull();
  });

  it('returns null for null, undefined and a bare object', () => {
    expect(resolveVueElement(null)).toBeNull();
    expect(resolveVueElement(undefined as never)).toBeNull();
    expect(resolveVueElement({})).toBeNull();
  });
});
