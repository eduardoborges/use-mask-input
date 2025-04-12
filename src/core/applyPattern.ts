import { PatternOptions } from '../types';
import { formatDecimal } from '../utils/decimal';
import { parsePattern, MaskToken } from './parsePattern';

function isDigit(c: string) {
  return /\d/.test(c);
}

function isLetter(c: string) {
  return /[a-zA-Z]/.test(c);
}

function isWildcard(c: string) {
  return /[a-zA-Z0-9]/.test(c);
}

function applyTokens(value: string, tokens: MaskToken[], options: PatternOptions): string {
  const chars = value.replace(/[^a-zA-Z0-9]/g, '').split('');
  let result = '';

  const apply = (tks: MaskToken[]) => {
    tks.forEach((token) => {
      if (chars.length === 0) return;

      if (token.type === 'digit') {
        const index = chars.findIndex(isDigit);
        if (index !== -1) result += chars.splice(index, 1)[0];
      } else if (token.type === 'letter') {
        const index = chars.findIndex(isLetter);
        if (index !== -1) result += chars.splice(index, 1)[0];
      } else if (token.type === 'wildcard') {
        const index = chars.findIndex(isWildcard);
        if (index !== -1) result += chars.splice(index, 1)[0];
      } else if (token.type === 'fixed') {
        result += token.char;
      } else if (token.type === 'optional') {
        const before = result;
        const prevChars = [...chars];
        apply(token.tokens);
        if (result === before) chars.splice(0, chars.length - prevChars.length);
      } else if (token.type === 'currency') {
        const raw = chars.join('');
        result += formatDecimal(raw, options);
        chars.length = 0;
      }
    });
  };

  apply(tokens);
  return result;
}

const cache = new Map<string, MaskToken[]>();

export function applyPattern(value: string, pattern: string, options: PatternOptions): string {
  if (!cache.has(pattern)) {
    cache.set(pattern, parsePattern(pattern, options));
  }
  const tokens = cache.get(pattern)!;
  return applyTokens(value, tokens, options);
}
