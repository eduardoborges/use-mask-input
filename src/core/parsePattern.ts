/* eslint-disable no-continue */
import { PatternOptions } from '../types';
import { isDecimalPattern } from '../utils/decimal';

export type MaskToken =
  | { type: 'digit' }
  | { type: 'letter' }
  | { type: 'wildcard' }
  | { type: 'currency' }
  | { type: 'fixed'; char: string }
  | { type: 'optional'; tokens: MaskToken[] };

export function parsePattern(pattern: string, options: PatternOptions): MaskToken[] {
  // presets

  const tokens: MaskToken[] = [];
  const chars = pattern.split('');
  let i = 0;

  while (i < chars.length) {
    const char = chars[i];

    if (isDecimalPattern(pattern)) {
      tokens.push({ type: 'currency' });
      i += 'currency'.length;
      i += 1;
      continue;
    }

    if (char === '[') {
      let inner = '';
      i += 1;
      let depth = 1;
      while (i < chars.length && depth > 0) {
        if (chars[i] === '[') depth += 1;
        else if (chars[i] === ']') depth -= 1;
        if (depth > 0) inner += chars[i];
        i += 1;
      }

      tokens.push({ type: 'optional', tokens: parsePattern(inner, options) });
      continue;
    }

    const repeatMatch = pattern.slice(i).match(/^(9|A|\*)\{(\d+)\}/);
    if (repeatMatch) {
      const type = repeatMatch[1];
      const count = parseInt(repeatMatch[2], 10);
      let tokenType: string;
      switch (type) {
        case '9':
          tokenType = 'digit';
          break;
        case 'A':
          tokenType = 'letter';
          break;
        default:
          tokenType = 'wildcard';
      }
      for (let j = 0; j < count; j += 1) tokens.push({ type: tokenType as any });
      i += repeatMatch[0].length;
      continue;
    }

    if (char === '9') {
      tokens.push({ type: 'digit' });
    } else if (char.toUpperCase() === 'A') {
      tokens.push({ type: 'letter' });
    } else if (char === '*') {
      tokens.push({ type: 'wildcard' });
    } else if (char === 'C') {
      tokens.push({ type: 'currency' });
    } else {
      tokens.push({ type: 'fixed', char });
    }

    i += 1;
  }

  return tokens;
}
