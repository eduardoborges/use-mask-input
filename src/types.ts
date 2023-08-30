import { Options as MaskOptions } from './inputmask.types';

export type { UseFormRegister, UseFormRegisterReturn } from 'react-hook-form';

export type Mask = 'email' | 'cpf' | 'datetime' | 'numeric' | 'currency' | 'decimal' | 'integer' | (string & {}) | (string[] & {}) | null;
export type Options = MaskOptions;
export type Input = HTMLInputElement | HTMLTextAreaElement | HTMLElement | HTMLInputElement | null;
