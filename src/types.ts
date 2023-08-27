/* eslint-disable import/no-extraneous-dependencies */
import Inputmask from 'inputmask';

export type { UseFormRegister, UseFormRegisterReturn } from 'react-hook-form';

export type Mask = 'email' | 'cpf' | 'datetime' | 'numeric' | 'currency' | 'decimal' | 'integer' | (string & {}) | (string[] & {}) | null;
export type Options = Inputmask.Options;
export type Input = HTMLInputElement | HTMLTextAreaElement | HTMLElement | HTMLInputElement | null;
