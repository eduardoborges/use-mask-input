import { Options as MaskOptions } from './inputmask.types';

export type { UseFormRegister, UseFormRegisterReturn } from 'react-hook-form';

export type Mask = 'datetime' | 'email' | 'numeric' | 'currency' | 'decimal' | 'integer' | 'percentage' | 'url' | 'ip' | 'mac' | 'ssn' | 'brl-currency' | 'cpf' | 'cnpj' | (string & {}) | (string[] & {}) | null;
export type Options = MaskOptions;
export type Input = HTMLInputElement | HTMLTextAreaElement | HTMLElement | HTMLInputElement | null;
