import { Input, Pattern, PatternOptions } from '../types';
import { isDecimalPattern } from '../utils/decimal';

export function bindInput(
  input: Input,
  maskFn: Function,
  pattern: Pattern,
  options?: PatternOptions,
): (() => void) | undefined {
  if (!input) return;

  if (input.tagName !== 'INPUT' && input.tagName !== 'TEXTAREA') {
    console.warn('bindInput only works with input and textarea elements');
    return;
  }

  const handleInput = () => {
    const oldValue = input.value;
    const cursorPos = input.selectionStart ?? oldValue.length;
    const isDecimal = isDecimalPattern(pattern);

    const getDigits = (value: string) => {
      if (isDecimal) return value.replace(/[^0-9]/g, '');
      return value;
    };

    const masked = maskFn(getDigits(oldValue), options);

    const newCursor = isDecimal
      ? masked.length
      : (() => {
        let newPos = cursorPos;
        let rawIndex = 0;
        for (let i = 0; i < masked.length && rawIndex < cursorPos; i += 1) {
          if (/\d|[a-zA-Z]/.test(masked[i])) rawIndex += 1;
          newPos = i + 1;
        }
        return newPos;
      })();

    input.value = masked;
    input.setSelectionRange(newCursor, newCursor);
  };

  const handleKeydown = (_e: Event) => {
    const e = _e as KeyboardEvent;
    if (e.key === 'Backspace') {
      const pos = input.selectionStart ?? 0;
      if (pos > 0 && /\W/.test(input.value[pos - 1])) {
        e.preventDefault();
        const chars = input.value.split('');
        for (let i = pos - 1; i >= 0; i -= 1) {
          if (/[a-zA-Z0-9]/.test(chars[i])) {
            chars.splice(i, 1);
            break;
          }
        }
        const masked = maskFn(chars.join(''), options);
        input.value = masked;
        const newPos = Math.max(pos - 1, 0);
        input.setSelectionRange(newPos, newPos);
      }
    }
  };

  input.addEventListener('input', handleInput);
  input.addEventListener('keydown', handleKeydown);

  return () => {
    input.removeEventListener('input', handleInput);
    input.removeEventListener('keydown', handleKeydown);
  };
}
