import { createMask } from '../core/createMask';
import { bindInput } from '../effects/bindInput';
import { Input, Pattern, PatternOptions } from '../types';

/**
 *
 * @param pattern - The pattern to be used for the mask. It can be a string or an array of strings.
 * @example
 * ```ts
 * import { mask } from 'use-mask-input';
 * const input = document.querySelector('input') as HTMLInputElement;
 * mask(['999.999.999-99', '99.999.999/9999-99']).bind(input);
 * ```
 * @returns An object with a `format` function and a `bind` function.
 * The `format` function can be used to format a value according to the mask, and
 * the `bind` function can be used to bind the mask to an input element.
 *
 * @example
 * ```ts
 * import { mask } from 'use-mask-input';
 * const input = document.querySelector('input') as HTMLInputElement;
 * const { format, bind } = mask(['999.999.999-99', '99.999.999/9999-99']);
 * bind(input);
 * const formattedValue = format('12345678900');
 * console.log(formattedValue); // 123.456.789-00
 * ```
 */
export function mask(pattern: Pattern, options?: PatternOptions) {
  const formatter = createMask(pattern, options);
  return {
    format: formatter,
    bind: (input: Input) => {
      if (!input) throw new Error('Input is required');
      return bindInput(input, formatter, pattern, options);
    },
  };
}

export default mask;
