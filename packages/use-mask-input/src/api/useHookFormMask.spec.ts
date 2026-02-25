import { renderHook } from '@testing-library/react';
import inputmask from 'inputmask';
import {
  beforeEach,
  describe, expect, it, vi,
} from 'vitest';

import useHookFormMask from './useHookFormMask';

import type { FieldValues, UseFormRegister } from 'react-hook-form';

vi.mock('inputmask', () => ({
  default: vi.fn((options) => ({
    mask: vi.fn(),
    options,
  })),
}));

function makeRegisterFn(name = 'test') {
  return vi.fn(() => ({
    ref: vi.fn(),
    prevRef: vi.fn(),
    onChange: vi.fn(),
    onBlur: vi.fn(),
    name,
  }));
}

describe('useHookFormMask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a function', () => {
    const registerFn = makeRegisterFn();
    const { result } = renderHook(
      () => useHookFormMask(registerFn as UseFormRegister<FieldValues>),
    );
    expect(typeof result.current).toBe('function');
  });

  it('registers field with mask', () => {
    const input = document.createElement('input');
    const refCallback = vi.fn();
    const registerFn = vi.fn(() => ({
      ref: refCallback,
      prevRef: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    }));
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const { result } = renderHook(
      () => useHookFormMask(registerFn as UseFormRegister<FieldValues>),
    );
    const registration = result.current('phone', '999-999');

    expect(registerFn).toHaveBeenCalledWith('phone', undefined);
    expect(registration.ref).toBeDefined();
    expect(typeof registration.ref).toBe('function');

    registration.ref?.(input);

    expect(maskFn).toHaveBeenCalled();
  });

  it('merges register options with mask options', () => {
    const registerFn = makeRegisterFn('phone');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result } = renderHook(
      () => useHookFormMask(registerFn as UseFormRegister<FieldValues>),
    );
    result.current('phone', '999-999', { required: true });

    expect(registerFn).toHaveBeenCalledWith('phone', { required: true });
  });

  it('works with alias masks', () => {
    const registerFn = makeRegisterFn('cpf');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result } = renderHook(
      () => useHookFormMask(registerFn as UseFormRegister<FieldValues>),
    );
    const registration = result.current('cpf', 'cpf');

    expect(registration.ref).toBeDefined();
  });

  it('works with array masks', () => {
    const registerFn = makeRegisterFn('phone');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result } = renderHook(
      () => useHookFormMask(registerFn as UseFormRegister<FieldValues>),
    );
    const registration = result.current('phone', ['999-999', '9999-9999']);

    expect(registration.ref).toBeDefined();
  });

  it('preserves all register return properties', () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const registerFn = vi.fn(() => ({
      ref: vi.fn(),
      prevRef: vi.fn(),
      onChange,
      onBlur,
      name: 'phone',
    }));

    const { result } = renderHook(
      () => useHookFormMask(registerFn as UseFormRegister<FieldValues>),
    );
    const registration = result.current('phone', '999-999');

    expect(registration.onChange).toBe(onChange);
    expect(registration.onBlur).toBe(onBlur);
    expect(registration.name).toBe('phone');
  });

  it('handles null ref from register', () => {
    const registerFn = vi.fn(() => ({
      ref: undefined,
      prevRef: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    }));

    const { result } = renderHook(
      () => useHookFormMask(registerFn as unknown as UseFormRegister<FieldValues>),
    );
    const registration = result.current('phone', '999-999');

    expect(registration.ref).toBeDefined();
  });

  it('returns the same ref callback reference across multiple calls (stable identity)', () => {
    const registerFn = makeRegisterFn('phone');

    const { result } = renderHook(
      () => useHookFormMask(registerFn as UseFormRegister<FieldValues>),
    );

    const first = result.current('phone', '999-999');
    const second = result.current('phone', '999-999');

    expect(first.ref).toBe(second.ref);
  });

  it('returns different ref callbacks for different field/mask combinations', () => {
    const registerFn = vi.fn((name: string) => ({
      ref: vi.fn(),
      prevRef: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name,
    }));

    const { result } = renderHook(
      () => useHookFormMask(registerFn as unknown as UseFormRegister<FieldValues>),
    );

    const phone = result.current('phone', '999-999');
    const cpf = result.current('cpf', 'cpf');

    expect(phone.ref).not.toBe(cpf.ref);
  });

  it('invalidates the ref cache when registerFn changes (rerender with new registerFn)', () => {
    const registerFn1 = makeRegisterFn('phone');
    const registerFn2 = makeRegisterFn('phone');

    const { result, rerender } = renderHook(
      ({ fn }) => useHookFormMask(fn as UseFormRegister<FieldValues>),
      { initialProps: { fn: registerFn1 } },
    );

    const refBefore = result.current('phone', '999-999').ref;

    rerender({ fn: registerFn2 });

    const refAfter = result.current('phone', '999-999').ref;

    expect(refBefore).not.toBe(refAfter);
  });

  it('defines prevRef as a non-enumerable property', () => {
    const prevRef = vi.fn();
    const registerFn = vi.fn(() => ({
      ref: prevRef,
      prevRef: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    }));

    const { result } = renderHook(
      () => useHookFormMask(registerFn as UseFormRegister<FieldValues>),
    );
    const registration = result.current('phone', '999-999');

    const descriptor = Object.getOwnPropertyDescriptor(registration, 'prevRef');
    expect(descriptor?.enumerable).toBe(false);
    expect((registration as unknown as { prevRef: typeof prevRef }).prevRef).toBe(prevRef);
  });
});
