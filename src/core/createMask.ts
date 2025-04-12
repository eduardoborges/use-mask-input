import { Pattern, PatternOptions } from '../types';
import { applyPattern } from './applyPattern';

export function createMask(pattern: Pattern | Pattern[], options?: PatternOptions) {
  return (value: string): string => {
    if (Array.isArray(pattern)) {
      const digits = value.replace(/\D/g, '').length;
      const candidates = pattern
        .map((p) => ({ pattern: p, size: p.replace(/[^9A*]/g, '').length }))
        .sort((a, b) => a.size - b.size);

      const best = candidates.find((p) => digits <= p.size)?.pattern ?? pattern[pattern.length - 1];
      return applyPattern(value, best, options);
    }

    return applyPattern(value, pattern, options);
  };
}
