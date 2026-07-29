import type { Options as MaskOptions } from './inputmask.types';

/**
 * Framework-agnostic mask types.
 *
 * Split out of `./index.ts` so the Vue entry can import them without dragging
 * in that module's `react` and `react-hook-form` type imports. `./index.ts`
 * re-exports everything here, so the React-facing surface is unchanged.
 */

export type Mask = 'datetime'
  | 'email'
  | 'numeric'
  | 'currency'
  | 'decimal'
  | 'integer'
  | 'percentage'
  | 'url'
  | 'ip'
  | 'mac'
  | 'ssn'
  | 'brl-currency'
  | 'cpf'
  | 'cnpj'
  | 'br-bank-account'
  | 'br-bank-agency'
  | (string & {})
  | (string[] & {})
  | null;

export type Options = MaskOptions;

export type Input = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

export interface UnmaskedValueApi {
  unmaskedValue: () => string;
}
