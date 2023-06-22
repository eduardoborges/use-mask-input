/* eslint-disable import/no-extraneous-dependencies */
export type { UseFormRegister, UseFormRegisterReturn } from 'react-hook-form';

export type Mask = Inputmask.Options['mask'] | 'email' | 'cpf' | 'datetime' | 'numeric' | 'currency' | 'decimal' | 'integer' | null | undefined;
export type Options = Inputmask.Options;
export type Input = HTMLInputElement | HTMLTextAreaElement | HTMLElement | HTMLInputElement | null;
