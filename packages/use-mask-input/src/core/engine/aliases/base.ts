/**
 * The extra definitions (`A`, `&`, `#`) and the aliases `cssunit`, `url`,
 * `ip`, `email`, `mac`, `vin` and `ssn`.
 *
 * Rules for every alias module:
 *
 * - Export one `AliasRegistration` and register nothing at module scope.
 *   `aliases/index.ts` adds it to the prototype registries.
 * - The module may import the factory (`../Inputmask`) to read
 *   `Inputmask.prototype.definitions` or `Inputmask.prototype.i18n`, but only
 *   inside functions: the registries are filled after this module is evaluated.
 * - A callback reaches the engine through the `this` Inputmask calls it with.
 *   `ResolvedOptions` types each callback with that `this`.
 */
import type {
  AliasRegistration, CommandObject, MaskSet, ResolvedOptions,
} from '../types';

/**
 * Radix for `parseInt` that leaves the choice to the text, as a call without
 * a radix does: 16 after a `0x` prefix, 10 otherwise.
 */
const RADIX_FROM_TEXT = 0;

/** Three digits that make an octet: `000` to `255`. */
const ipValidatorRegex = /25[0-5]|2[0-4][0-9]|[01][0-9][0-9]/;

/**
 * Validates a digit of an IP address together with the digits before it in
 * the same octet.
 *
 * @upstream extensions/inputmask.extensions.js ipValidator
 */
function ipValidator(
  chrs: string,
  maskset: MaskSet,
  pos: number,
  _strict: boolean,
  opts: ResolvedOptions,
): boolean | CommandObject {
  // Read without a guard: with no buffer rendered, any position past the first throws.
  const buffer = maskset.buffer as string[];

  let octet: string;
  if (pos - 1 > -1 && buffer[pos - 1] !== '.') {
    octet = buffer[pos - 1] + chrs;
    if (pos - 2 > -1 && buffer[pos - 2] !== '.') {
      octet = buffer[pos - 2] + octet;
    } else octet = `0${octet}`;
  } else octet = `00${chrs}`;

  if (
    opts.greedy
    && parseInt(octet, RADIX_FROM_TEXT) > 255
    && ipValidatorRegex.test(`00${octet.charAt(2)}`)
  ) {
    // The digit overflows the octet: start the next one with it.
    const nextBuffer = [...buffer.slice(0, pos), '.', octet.charAt(2)];
    if ((nextBuffer.join('').match(/\./g) as RegExpMatchArray).length < 4) {
      return {
        refreshFromBuffer: true,
        buffer: nextBuffer,
        caret: pos + 2,
      };
    }
  }
  return ipValidatorRegex.test(octet);
}

// Hooks declare every parameter Inputmask's own have, used or not, so their
// `length` is the same.

/** @upstream extensions/inputmask.extensions.js */
export const baseAliases: AliasRegistration = {
  definitions: {
    A: {
      validator: '[A-Za-z\u0410-\u044F\u0401\u0451\u00C0-\u00FF\u00B5]',
      casing: 'upper',
    },
    // alphanumeric
    '&': {
      validator: '[0-9A-Za-z\u0410-\u044F\u0401\u0451\u00C0-\u00FF\u00B5]',
      casing: 'upper',
    },
    // hexadecimal
    '#': {
      validator: '[0-9A-Fa-f]',
      casing: 'upper',
    },
  },
  aliases: {
    cssunit: {
      regex: '[+-]?[0-9]+\\.?([0-9]+)?(px|em|rem|ex|%|in|cm|mm|pt|pc)',
    },
    url: {
      regex: '(https?|ftp)://.*',
      autoUnmask: false,
      keepStatic: false,
      tabThrough: true,
    },
    ip: {
      mask: 'i{1,3}.j{1,3}.k{1,3}.l{1,3}',
      definitions: {
        i: {
          validator: ipValidator,
        },
        j: {
          validator: ipValidator,
        },
        k: {
          validator: ipValidator,
        },
        l: {
          validator: ipValidator,
        },
      },
      onUnMask(maskedValue, _unmaskedValue, _opts) {
        return maskedValue;
      },
      inputmode: 'decimal',
      substitutes: { ',': '.' },
    },
    email: {
      // One address, then up to `quantifier` more when a separator is set.
      mask({ separator, quantifier }) {
        const emailMask = '*{1,64}[.*{1,64}][.*{1,64}][.*{1,63}]@-{1,63}.-{1,63}[.-{1,63}][.-{1,63}]';
        let mask = emailMask;
        if (separator) {
          for (let i = 0; i < (quantifier as number); i += 1) {
            mask += `[${separator}${emailMask}]`;
          }
        }
        return mask;
      },
      greedy: false,
      casing: 'lower',
      separator: null,
      quantifier: 5,
      skipOptionalPartCharacter: '',
      onBeforePaste(pastedValue, _opts) {
        return pastedValue.toLowerCase().replace('mailto:', '');
      },
      definitions: {
        '*': {
          validator:
            '[0-9\uFF11-\uFF19A-Za-z\u0410-\u044F\u0401\u0451\u00C0-\u00FF\u00B5!#$%&\'*+/=?^_`{|}~-]',
        },
        '-': {
          validator: '[0-9A-Za-z-]',
        },
      },
      onUnMask(maskedValue, _unmaskedValue, _opts) {
        return maskedValue;
      },
      inputmode: 'email',
    },
    mac: {
      mask: '##:##:##:##:##:##',
    },
    // https://en.wikipedia.org/wiki/Vehicle_identification_number
    vin: {
      mask: 'V{13}9{4}',
      definitions: {
        V: {
          validator: '[A-HJ-NPR-Za-hj-npr-z\\d]',
          casing: 'upper',
        },
      },
      clearIncomplete: true,
      autoUnmask: true,
    },
    // https://en.wikipedia.org/wiki/Social_Security_number
    ssn: {
      mask: '999-99-9999',
      postValidation(_buffer, _pos, _c, _currentResult, _opts, _maskset, _strict) {
        const bffr = this.getMaskTemplate(true, this.getLastValidPosition(), true, true);
        // Rejects the numbers that are never issued, on what is typed so far.
        return /^(?!219-09-9999|078-05-1120)(?!666|000|9.{2}).{3}-(?!00).{2}-(?!0{4}).{4}$/.test(
          bffr.join(''),
        );
      },
    },
  },
};
