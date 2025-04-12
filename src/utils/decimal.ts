import { Pattern, PatternOptions } from '../types';

export function formatDecimal(
  raw: string,
  options?: PatternOptions,
): string {
  const digits = raw.replace(/\D/g, '').padStart(3, '0');
  const int = digits.slice(0, -2);
  const dec = digits.slice(-2);
  const value = Number(`${int}.${dec}`);

  const symbol = options?.decimal?.symbol || '';
  const thousandSeparator = options?.decimal?.thousandSeparator || '';
  const decimalSeparator = options?.decimal?.decimalSeparator || '.';

  const formatted = value
    .toFixed(2)
    .replace('.', decimalSeparator)
    .replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);

  return symbol ? `${symbol} ${formatted}` : formatted;
}

export function isDecimalPattern(pattern: Pattern): boolean {
  return pattern.includes('[DECIMAL]');
}
