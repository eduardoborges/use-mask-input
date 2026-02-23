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

describe('useHookFormMaskAntd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a function', () => {
    const registerFn = vi.fn(() => ({
      ref: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'test',
    }));

    const maskedRegister = useHookFormMaskAntd(
      registerFn as UseFormRegister<FieldValues>,
    );

    expect(typeof maskedRegister).toBe('function');
  });

  it('throws when registerFn is missing', () => {
    const maskedRegister = useHookFormMaskAntd(
      undefined as unknown as UseFormRegister<FieldValues>,
    );

    expect(() => maskedRegister('field' as never, '999-999'))
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

    const maskedRegister = useHookFormMaskAntd(
      registerFn as UseFormRegister<FieldValues>,
    );
    const options = { placeholder: '_' } as never;

    const result = maskedRegister('phone' as never, '999-999', options);

    expect(registerFn).toHaveBeenCalledWith('phone', options);
    expect(result.ref).toBeDefined();
    expect(typeof result.ref).toBe('function');

    const inputRef = { input: inputElement } as unknown as Parameters<
      ReturnType<typeof useHookFormMaskAntd<FieldValues, never>>
    >[1];

    result.ref(inputRef as unknown as InputRef);

    expect(resolveInputRef).toHaveBeenCalledWith(inputElement);
    expect(applyMaskToElement).toHaveBeenCalledWith(
      inputElement,
      '999-999',
      options,
    );
    expect(prevRef).toHaveBeenCalledWith(inputElement);
  });

  it('handles null ref from register', () => {
    const registerFn = vi.fn(() => ({
      ref: undefined,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    }));

    const maskedRegister = useHookFormMaskAntd(
      registerFn as unknown as UseFormRegister<FieldValues>,
    );
    const result = maskedRegister('phone' as never, '999-999');

    expect(result.ref).toBeDefined();

    const inputElement = document.createElement('input');
    vi.mocked(resolveInputRef).mockReturnValue(inputElement);

    const inputRef = { input: inputElement } as unknown as Parameters<
      ReturnType<typeof useHookFormMaskAntd<FieldValues, never>>
    >[1];

    result.ref(inputRef as unknown as InputRef);

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

    const maskedRegister = useHookFormMaskAntd(
      registerFn as UseFormRegister<FieldValues>,
    );
    const result = maskedRegister('phone' as never, '999-999');

    expect(result.onChange).toBe(onChange);
    expect(result.onBlur).toBe(onBlur);
    expect(result.name).toBe('phone');

    const descriptor = Object.getOwnPropertyDescriptor(result, 'prevRef');
    expect(descriptor?.enumerable).toBe(false);
    expect((result as unknown as { prevRef: typeof prevRef }).prevRef)
      .toBe(prevRef);
  });
});
