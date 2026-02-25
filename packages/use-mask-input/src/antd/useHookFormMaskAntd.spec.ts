import { renderHook } from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { applyMaskToElement, resolveInputRef } from '../core';
import useHookFormMaskAntd from './useHookFormMaskAntd';

import type { InputRef } from 'antd';
import type {
  FieldValues,
  UseFormRegister,
} from 'react-hook-form';

vi.mock('../core', () => ({
  applyMaskToElement: vi.fn(),
  resolveInputRef: vi.fn(),
}));

function makeRegisterFn(name = 'test') {
  return vi.fn(() => ({
    ref: vi.fn(),
    onChange: vi.fn(),
    onBlur: vi.fn(),
    name,
  }));
}

describe('useHookFormMaskAntd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a function', () => {
    const registerFn = makeRegisterFn();
    const { result } = renderHook(() =>
      useHookFormMaskAntd(registerFn as UseFormRegister<FieldValues>),
    );
    expect(typeof result.current).toBe('function');
  });

  it('throws when registerFn is missing', () => {
    const { result } = renderHook(() =>
      useHookFormMaskAntd(undefined as unknown as UseFormRegister<FieldValues>),
    );
    expect(() => result.current('field' as never, '999-999'))
      .toThrowError('registerFn is required');
  });

  it('registers field with mask and calls core helpers', () => {
    const inputElement = document.createElement('input');
    const prevRef = vi.fn();
    const registerFn = vi.fn(() => ({
      ref: prevRef,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    }));

    vi.mocked(resolveInputRef).mockReturnValue(inputElement);

    const { result } = renderHook(() =>
      useHookFormMaskAntd(registerFn as UseFormRegister<FieldValues>),
    );
    const options = { placeholder: '_' } as never;
    const registration = result.current('phone' as never, '999-999', options);

    expect(registerFn).toHaveBeenCalledWith('phone', options);
    expect(registration.ref).toBeDefined();
    expect(typeof registration.ref).toBe('function');

    registration.ref({ input: inputElement } as unknown as InputRef);

    expect(resolveInputRef).toHaveBeenCalledWith(inputElement);
    expect(applyMaskToElement).toHaveBeenCalledWith(inputElement, '999-999', options);
    expect(prevRef).toHaveBeenCalledWith(inputElement);
  });

  it('handles null ref from register', () => {
    const registerFn = vi.fn(() => ({
      ref: undefined,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    }));

    const { result } = renderHook(() =>
      useHookFormMaskAntd(registerFn as unknown as UseFormRegister<FieldValues>),
    );
    const registration = result.current('phone' as never, '999-999');

    expect(registration.ref).toBeDefined();

    const inputElement = document.createElement('input');
    vi.mocked(resolveInputRef).mockReturnValue(inputElement);

    registration.ref({ input: inputElement } as unknown as InputRef);

    expect(applyMaskToElement).toHaveBeenCalled();
  });

  it('preserves register return properties and defines non-enumerable prevRef', () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const prevRef = vi.fn();
    const registerFn = vi.fn(() => ({
      ref: prevRef,
      onChange,
      onBlur,
      name: 'phone',
    }));

    const { result } = renderHook(() =>
      useHookFormMaskAntd(registerFn as UseFormRegister<FieldValues>),
    );
    const registration = result.current('phone' as never, '999-999');

    expect(registration.onChange).toBe(onChange);
    expect(registration.onBlur).toBe(onBlur);
    expect(registration.name).toBe('phone');

    const descriptor = Object.getOwnPropertyDescriptor(registration, 'prevRef');
    expect(descriptor?.enumerable).toBe(false);
    expect((registration as unknown as { prevRef: typeof prevRef }).prevRef).toBe(prevRef);
  });

  it('returns the same ref callback reference across multiple calls (stable identity)', () => {
    const registerFn = makeRegisterFn('phone');

    const { result } = renderHook(() =>
      useHookFormMaskAntd(registerFn as UseFormRegister<FieldValues>),
    );

    const first = result.current('phone' as never, '999-999');
    const second = result.current('phone' as never, '999-999');

    expect(first.ref).toBe(second.ref);
  });

  it('returns different ref callbacks for different field/mask combinations', () => {
    const registerFn = vi.fn((name: string) => ({
      ref: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name,
    }));

    const { result } = renderHook(() =>
      useHookFormMaskAntd(registerFn as unknown as UseFormRegister<FieldValues>),
    );

    const phone = result.current('phone' as never, '999-999');
    const cpf = result.current('cpf' as never, 'cpf');

    expect(phone.ref).not.toBe(cpf.ref);
  });

  it('invalidates the ref cache when registerFn changes (rerender with new registerFn)', () => {
    const registerFn1 = makeRegisterFn('phone');
    const registerFn2 = makeRegisterFn('phone');

    const { result, rerender } = renderHook(
      ({ fn }) => useHookFormMaskAntd(fn as UseFormRegister<FieldValues>),
      { initialProps: { fn: registerFn1 } },
    );

    const refBefore = result.current('phone' as never, '999-999').ref;

    rerender({ fn: registerFn2 });

    const refAfter = result.current('phone' as never, '999-999').ref;

    expect(refBefore).not.toBe(refAfter);
  });
});
