/**
 * Turns a mask string into the token tree the test resolver walks.
 *
 * `generateMaskSet` resolves the `mask` option in place: it calls a mask
 * function, joins several masks into one alternation and settles `keepStatic`,
 * all on the options object it is given.
 */
import { escapeRegex } from '../escapeRegex';
import { extend } from '../extend';

import type {
  Engine,
  MaskDefinition,
  MaskDescriptor,
  MaskPattern,
  MaskSet,
  MaskToken,
  MatchValidator,
  ResolvedOptions,
  TestMatch,
} from '../types';

/** An entry of a token's `matches`: a nested token or a test match. */
type MaskNode = MaskToken | TestMatch;

/**
 * Whether a mask comes as `{ mask, ...metadata }`. A `mask` that is a function
 * does not count: the entry is then taken as the mask text itself.
 */
function hasMaskField(pattern: MaskPattern): pattern is MaskDescriptor {
  const descriptor = pattern as MaskDescriptor;
  return descriptor.mask !== undefined && typeof descriptor.mask !== 'function';
}

/** The number a quantifier bound stands for. `'*'`, `'+'` and a missing bound come back as they are. */
function toCount<Bound extends string | undefined>(bound: Bound): Bound | number {
  return Number.isNaN(Number(bound)) ? bound : parseInt(bound as string, 10);
}

/** The validator of a definition in the form a test match keeps it. */
function definitionValidator(validator: MaskDefinition['validator'], flag: string): MatchValidator {
  // A definition without a validator accepts any character.
  if (!validator) return /./;
  return typeof validator === 'string' ? new RegExp(validator, flag) : { test: validator };
}

/**
 * Applies `repeat` to the mask text. With `keepStatic` on, it also rewrites an
 * optional part that starts with the character before it, so `9[99]` becomes
 * the alternation `(9|999)`.
 */
function preProcessMask(
  mask: string,
  {
    repeat, groupmarker, quantifiermarker, keepStatic,
  }: ResolvedOptions,
): string {
  let processed = mask;

  // `repeat` is text when it comes from a data attribute, so `'3'` counts as 3.
  if (Number(repeat) > 0 || repeat === '*' || repeat === '+') {
    let repeatStart = repeat;
    if (repeat === '*') repeatStart = 0;
    else if (repeat === '+') repeatStart = 1;

    if (repeatStart !== repeat) {
      processed = `${groupmarker[0]}${processed}${groupmarker[1]}${quantifiermarker[0]}${repeatStart},${repeat}${quantifiermarker[1]}`;
    } else {
      for (let i = 1; i < Number(repeatStart); i += 1) {
        processed += mask;
      }
    }
  }

  if (keepStatic === true) {
    const optionalParts = processed.match(/(.)\[([^\]]*)\]/g);
    if (optionalParts) {
      optionalParts.forEach((optionalPart) => {
        const [before, rest] = optionalPart.split('[');
        const optional = rest.replace(']', '');
        processed = processed.replace(
          new RegExp(`${escapeRegex(before)}\\[${escapeRegex(optional)}\\]`),
          before.charAt(0) === optional.charAt(0)
            ? `(${before}|${before}${optional})`
            : `${before}[${optional}]`,
        );
      });
    }
  }

  return processed;
}

export const lexerMethods = {
  /** @upstream mask-lexer.js generateMaskSet */
  generateMaskSet(this: Engine, opts: ResolvedOptions, nocache?: boolean): MaskSet {
    const resolved = opts;

    const generateMask = (maskOption: string | null, metadata: MaskSet['metadata']): MaskSet => {
      let mask = maskOption;
      let regexMask = false;

      if (mask === null || mask === '') {
        // No mask: the `regex` option is the mask, and without one anything goes.
        regexMask = true;
        mask = resolved.regex !== null
          ? resolved.regex.replace(/^(\^)(.*)(\$)$/, '$2')
          : '.*';
      }
      // A one-character mask that grows while typing shows no placeholder.
      if (mask.length === 1 && resolved.greedy === false && resolved.repeat !== 0) {
        resolved.placeholder = '';
      }
      mask = preProcessMask(mask, resolved);

      let maskdefKey: string;
      if (regexMask) {
        maskdefKey = `regex_${resolved.regex}`;
      } else {
        maskdefKey = resolved.numericInput ? mask.split('').reverse().join('') : mask;
      }
      // `keepStatic` and a placeholder map change the tests a mask resolves to,
      // so each combination gets its own cache entry.
      if (resolved.keepStatic !== null) {
        maskdefKey = `ks_${resolved.keepStatic}${maskdefKey}`;
      }
      if (typeof resolved.placeholder === 'object') {
        maskdefKey = `ph_${JSON.stringify(resolved.placeholder)}${maskdefKey}`;
      }

      const { masksCache } = this.Inputmask.prototype;
      if (masksCache[maskdefKey] === undefined || nocache === true) {
        const masksetDefinition: MaskSet = {
          mask,
          maskToken: this.Inputmask.prototype.analyseMask(mask, regexMask, resolved),
          validPositions: [],
          _buffer: undefined,
          buffer: undefined,
          tests: {},
          excludes: {},
          metadata,
          maskLength: undefined,
          jitOffset: {},
        };
        if (nocache === true) return masksetDefinition;

        masksCache[maskdefKey] = masksetDefinition;
      }

      // The cached maskset stays pristine: every caller gets its own copy.
      return extend(true, {}, masksCache[maskdefKey]);
    };

    if (typeof resolved.mask === 'function') {
      resolved.mask = resolved.mask(resolved);
    }

    if (Array.isArray(resolved.mask)) {
      if (resolved.mask.length > 1) {
        // Several masks are the alternatives of one mask, and those stay static unless told otherwise.
        if (resolved.keepStatic === null) {
          resolved.keepStatic = true;
        }

        let altMask = resolved.groupmarker[0];
        (resolved.isRTL ? resolved.mask.reverse() : resolved.mask).forEach((pattern) => {
          if (altMask.length > 1) {
            altMask += resolved.alternatormarker;
          }
          if (hasMaskField(pattern)) {
            altMask += pattern.mask;
          } else {
            altMask += pattern;
          }
        });
        altMask += resolved.groupmarker[1];

        return generateMask(altMask, resolved.mask);
      }

      // An empty list leaves `undefined` here, and the mask is read unguarded below.
      resolved.mask = resolved.mask.pop() as MaskPattern;
    }

    let maskset: MaskSet;
    if (resolved.mask && hasMaskField(resolved.mask)) {
      maskset = generateMask(resolved.mask.mask, resolved.mask);
    } else {
      maskset = generateMask(resolved.mask as string | null, resolved.mask);
    }

    if (resolved.keepStatic === null) {
      resolved.keepStatic = false;
    }

    return maskset;
  },

  /** @upstream mask-lexer.js analyseMask */
  analyseMask(
    this: Engine,
    mask: string,
    regexMask: boolean,
    opts: ResolvedOptions,
  ): MaskToken[] {
    const resolved = opts;
    // Both tokenizers keep their position between `exec` calls, so each run gets its own.
    const maskTokenizer = /(?:[?*+]|\{[0-9+*]+(?:,[0-9+*]*)?(?:\|[0-9+*]*)?\})|[^.?*+^${[]()|\\]+|./g;
    const regexTokenizer = /\[\^?]?(?:[^\\\]]+|\\[\S\s]?)*]?|\\(?:0(?:[0-3][0-7]{0,2}|[4-7][0-7]?)?|[1-9][0-9]*|x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4}|c[A-Za-z]|[\S\s]?)|\((?:\?[:=!]?)?|(?:[?*+]|\{[0-9]+(?:,[0-9]*)?\})\??|[^.?*+^${[()|\\]+|./g;
    const tokenizer = regexMask ? regexTokenizer : maskTokenizer;

    const rootToken = this.createMaskToken();
    /** Groups, optional parts and alternations still being read, innermost last. */
    const openTokens: MaskToken[] = [];
    const maskTokens: MaskToken[] = [];
    /** The piece of mask text being handled. */
    let lexeme = '';
    let escaped = false;
    let closeRegexGroup = false;

    /** Wraps matches in a group that is already closed. */
    const groupify = (matches: MaskNode[]): MaskToken => {
      const groupToken = this.createMaskToken(true);
      groupToken.openGroup = false;
      groupToken.matches = matches;
      return groupToken;
    };

    /**
     * Placeholder a position of a regex mask takes from a placeholder map. The
     * key is the number of top-level matches read so far.
     */
    const mappedPlaceholder = (): string | undefined => (
      typeof resolved.placeholder === 'object'
        ? resolved.placeholder[rootToken.matches.length]
        : undefined
    );

    /** Adds the test match, or matches, for `element` to `mtoken`: at `position`, or at the end. */
    const insertTestDefinition = (mtoken: MaskToken, element: string, position?: number): void => {
      let insertAt = position !== undefined ? position : mtoken.matches.length;
      let prevMatch: MaskNode | undefined = mtoken.matches[insertAt - 1];
      let flag = resolved.casing ? 'i' : '';

      if (regexMask) {
        if (
          element.indexOf('[') === 0
          || (escaped && /\\d|\\s|\\w|\\p/i.test(element))
          || element === '.'
        ) {
          if (/\\p\{.*}/i.test(element)) flag += 'u';
          const classMatch: TestMatch = {
            fn: new RegExp(element, flag),
            static: false,
            optionality: false,
            newBlockMarker: prevMatch === undefined ? 'master' : prevMatch.def !== element,
            casing: null,
            def: element,
            placeholder: mappedPlaceholder(),
            nativeDef: element,
          };
          mtoken.matches.splice(insertAt, 0, classMatch);
        } else {
          // Of an escape only the last character is kept: `\.` is a static dot.
          const literal = escaped ? element[element.length - 1] : element;
          literal.split('').forEach((lmnt) => {
            prevMatch = mtoken.matches[insertAt - 1];
            const staticMatch: TestMatch = {
              fn: /[a-z]/i.test(resolved.staticDefinitionSymbol || lmnt)
                ? new RegExp(`[${resolved.staticDefinitionSymbol || lmnt}]`, flag)
                : null,
              static: true,
              optionality: false,
              newBlockMarker: prevMatch === undefined
                ? 'master'
                : prevMatch.def !== lmnt && prevMatch.static !== true,
              casing: null,
              def: resolved.staticDefinitionSymbol || lmnt,
              placeholder: resolved.staticDefinitionSymbol !== undefined
                ? lmnt
                : mappedPlaceholder(),
              nativeDef: `${escaped ? "'" : ''}${lmnt}`,
            };
            mtoken.matches.splice(insertAt, 0, staticMatch);
            insertAt += 1;
          });
        }
        escaped = false;
      } else {
        const maskdef = (resolved.definitions && resolved.definitions[element])
          || (resolved.usePrototypeDefinitions && this.Inputmask.prototype.definitions[element]);

        if (maskdef && !escaped) {
          if (typeof maskdef.validator === 'string' && /\\p\{.*}/i.test(maskdef.validator)) {
            flag += 'u';
          }
          const definitionMatch: TestMatch = {
            fn: definitionValidator(maskdef.validator, flag),
            static: maskdef.static || false,
            optionality: maskdef.optional || false,
            // Remembers that it was the definition that made the position optional.
            defOptionality: maskdef.optional || false,
            newBlockMarker: prevMatch === undefined || maskdef.optional
              ? 'master'
              : prevMatch.def !== (maskdef.definitionSymbol || element),
            casing: maskdef.casing,
            def: maskdef.definitionSymbol || element,
            placeholder: maskdef.placeholder,
            nativeDef: element,
            generated: maskdef.generated,
          };
          mtoken.matches.splice(insertAt, 0, definitionMatch);
        } else {
          const staticMatch: TestMatch = {
            fn: /[a-z]/i.test(resolved.staticDefinitionSymbol || element)
              ? new RegExp(`[${resolved.staticDefinitionSymbol || element}]`, flag)
              : null,
            static: true,
            optionality: false,
            newBlockMarker: prevMatch === undefined
              ? 'master'
              : prevMatch.def !== element && prevMatch.static !== true,
            casing: null,
            def: resolved.staticDefinitionSymbol || element,
            placeholder: resolved.staticDefinitionSymbol !== undefined ? element : undefined,
            nativeDef: `${escaped ? "'" : ''}${element}`,
          };
          mtoken.matches.splice(insertAt, 0, staticMatch);
          escaped = false;
        }
      }
    };

    /**
     * A group only stays a group when a quantifier follows it. Any other is
     * plain mask text, and its markers become static characters.
     */
    const verifyGroupMarker = (maskToken: MaskNode | undefined): void => {
      if (maskToken && maskToken.matches) {
        const { matches } = maskToken;
        matches.forEach((token, ndx) => {
          const nextToken: MaskNode | undefined = matches[ndx + 1];
          if (
            (nextToken === undefined
              || nextToken.matches === undefined
              || nextToken.isQuantifier === false)
            && token
            && token.isGroup
          ) {
            const plainGroup = token;
            plainGroup.isGroup = false;
            if (!regexMask) {
              insertTestDefinition(plainGroup, resolved.groupmarker[0], 0);
              if (plainGroup.openGroup !== true) {
                insertTestDefinition(plainGroup, resolved.groupmarker[1]);
              }
            }
          }
          verifyGroupMarker(token);
        });
      }
    };

    /** Reads the current lexeme as mask content. It completes an alternation that was waiting for its right side. */
    const defaultCase = (): void => {
      if (openTokens.length > 0) {
        const currentOpeningToken = openTokens[openTokens.length - 1];
        insertTestDefinition(currentOpeningToken, lexeme);
        if (currentOpeningToken.isAlternator) {
          // `a|b`: the match just added was the last alternative.
          const alternator = openTokens.pop() as MaskToken;
          for (const alternative of alternator.matches) {
            // An alternative is not a group of its own.
            if (alternative.isGroup) alternative.isGroup = false;
          }
          if (openTokens.length > 0) {
            openTokens[openTokens.length - 1].matches.push(alternator);
          } else {
            rootToken.matches.push(alternator);
          }
        }
      } else {
        insertTestDefinition(rootToken, lexeme);
      }
    };

    const closeGroup = (): void => {
      const openingToken = openTokens.pop() as MaskToken;
      // A closing marker with nothing open throws here.
      openingToken.openGroup = false;
      if (openingToken !== undefined) {
        if (openTokens.length > 0) {
          const currentOpeningToken = openTokens[openTokens.length - 1];
          currentOpeningToken.matches.push(openingToken);
          if (currentOpeningToken.isAlternator) {
            // `(a)|(b)`: the group just closed was the last alternative.
            const alternator = openTokens.pop() as MaskToken;
            for (const alternative of alternator.matches) {
              // An alternative is not a group of its own. Test matches get both flags too.
              alternative.isGroup = false;
              alternative.alternatorGroup = false;
            }
            if (openTokens.length > 0) {
              openTokens[openTokens.length - 1].matches.push(alternator);
            } else {
              rootToken.matches.push(alternator);
            }
          }
        } else {
          rootToken.matches.push(openingToken);
        }
      } else {
        defaultCase();
      }
    };

    /** Takes the last match off `matches`. A quantifier comes off together with what it repeats. */
    const groupQuantifier = (matches: MaskNode[]): MaskNode => {
      const lastMatch = matches.pop() as MaskNode;
      if (lastMatch.isQuantifier) {
        return groupify([matches.pop() as MaskNode, lastMatch]);
      }
      return lastMatch;
    };

    /**
     * Swaps an opening marker for its closing one, and the other way around.
     * It is only ever handed test matches, never marker text, so it returns
     * what it was given.
     */
    const reverseStatic = (st: TestMatch | string | undefined): TestMatch | string | undefined => {
      const { optionalmarker, groupmarker } = resolved;
      if (st === optionalmarker[0]) return optionalmarker[1];
      if (st === optionalmarker[1]) return optionalmarker[0];
      if (st === groupmarker[0]) return groupmarker[1];
      if (st === groupmarker[1]) return groupmarker[0];
      return st;
    };

    /** Reverses the tree in place, for masks that fill from the right. */
    const reverseTokens = (maskToken: MaskToken): MaskToken => {
      maskToken.matches.reverse();
      const { matches } = maskToken;
      for (let index = 0; index < matches.length; index += 1) {
        const next: MaskNode | undefined = matches[index + 1];
        if (matches[index].isQuantifier && next && next.isGroup) {
          // Reversed, the quantifier comes before its group. It has to follow it.
          const qt = matches[index];
          matches.splice(index, 1);
          matches.splice(index + 1, 0, qt);
        }
        const entry = matches[index];
        if (entry.matches !== undefined) {
          matches[index] = reverseTokens(entry);
        } else {
          matches[index] = reverseStatic(entry) as TestMatch;
        }
      }

      return maskToken;
    };

    if (regexMask) {
      // Square brackets are character classes in a regex, not optional parts.
      resolved.optionalmarker[0] = undefined;
      resolved.optionalmarker[1] = undefined;
    }

    let match = tokenizer.exec(mask);
    while (match) {
      lexeme = match[0];

      if (regexMask) {
        switch (lexeme.charAt(0)) {
          case '?':
            lexeme = '{0,1}';
            break;
          case '+':
          case '*':
            lexeme = `{${lexeme}}`;
            break;
          case '|':
            // `a|b` at the top level has no group around it. Open one over what
            // was read so far; it is closed once the mask ends.
            if (openTokens.length === 0) {
              const altRegexGroup = groupify(rootToken.matches);
              altRegexGroup.openGroup = true;
              openTokens.push(altRegexGroup);
              rootToken.matches = [];
              closeRegexGroup = true;
            }
            break;
          // no default
        }
        switch (lexeme) {
          case '\\d':
            lexeme = '[0-9]';
            break;
          case '\\p':
            // A Unicode property escape is tokenized in three pieces: `\p`, `{`
            // and the rest. A mask that ends before them throws here.
            lexeme += (tokenizer.exec(mask) as RegExpExecArray)[0];
            lexeme += (tokenizer.exec(mask) as RegExpExecArray)[0];
            break;
          default:
            // `(?:`, `(?=` and `(?!` need nothing: their parenthesis opens a plain group below.
        }
      }

      if (escaped) {
        defaultCase();
      } else {
        switch (lexeme.charAt(0)) {
          case '$':
          case '^':
            // Anchors mean nothing to a mask. Outside a regex mask they are ordinary characters.
            if (!regexMask) {
              defaultCase();
            }
            break;
          case resolved.escapeChar:
            escaped = true;
            if (regexMask) defaultCase();
            break;
          case resolved.optionalmarker[1]:
          case resolved.groupmarker[1]:
            closeGroup();
            break;
          case resolved.optionalmarker[0]:
            openTokens.push(this.createMaskToken(false, true));
            break;
          case resolved.groupmarker[0]:
            openTokens.push(this.createMaskToken(true));
            break;
          case resolved.quantifiermarker[0]: {
            const quantifier = this.createMaskToken(false, false, true);

            // The `?` of a lazy quantifier goes as well.
            const mqj = lexeme.replace(/[{}?]/g, '').split('|');
            const mq = mqj[0].split(',');
            let mq0 = toCount(mq[0]);
            const mq1 = mq.length === 1 ? mq0 : toCount(mq[1]);
            const mqJit = toCount<string | undefined>(mqj[1]);
            if (mq0 === '*' || mq0 === '+') {
              mq0 = mq1 === '*' ? 0 : 1;
            }
            quantifier.quantifier = {
              min: mq0,
              max: mq1,
              jit: mqJit,
            };

            const matches = openTokens.length > 0
              ? openTokens[openTokens.length - 1].matches
              : rootToken.matches;
            // A quantifier with nothing before it throws here.
            let quantified = matches.pop() as MaskNode;
            if (!quantified.isGroup) {
              quantified = groupify([quantified]);
            }
            matches.push(quantified);
            matches.push(quantifier);
            break;
          }
          case resolved.alternatormarker: {
            let lastMatch: MaskNode;
            if (openTokens.length > 0) {
              const currentOpeningToken = openTokens[openTokens.length - 1];
              const subToken = currentOpeningToken.matches[currentOpeningToken.matches.length - 1];
              if (
                currentOpeningToken.openGroup
                && (subToken.matches === undefined
                  || (subToken.isGroup === false && subToken.isAlternator === false))
              ) {
                // Inside an open group, everything read so far is the first alternative.
                lastMatch = openTokens.pop() as MaskToken;
              } else {
                lastMatch = groupQuantifier(currentOpeningToken.matches);
              }
            } else {
              lastMatch = groupQuantifier(rootToken.matches);
            }

            if (lastMatch.isAlternator) {
              openTokens.push(lastMatch);
            } else {
              let alternator: MaskToken;
              if (lastMatch.alternatorGroup) {
                alternator = openTokens.pop() as MaskToken;
                lastMatch.alternatorGroup = false;
              } else {
                alternator = this.createMaskToken(false, false, false, true);
              }
              alternator.matches.push(lastMatch);
              openTokens.push(alternator);
              if (lastMatch.openGroup) {
                // The first alternative was the open group itself, so the next
                // one gets a group of its own to collect what follows.
                lastMatch.openGroup = false;
                const alternatorGroup = this.createMaskToken(true);
                alternatorGroup.alternatorGroup = true;
                openTokens.push(alternatorGroup);
              }
            }
            break;
          }
          default:
            defaultCase();
        }
      }

      match = tokenizer.exec(mask);
    }

    if (closeRegexGroup) closeGroup();

    while (openTokens.length > 0) {
      rootToken.matches.push(openTokens.pop() as MaskToken);
    }
    if (rootToken.matches.length > 0) {
      verifyGroupMarker(rootToken);
      maskTokens.push(rootToken);
    }

    if (resolved.numericInput || resolved.isRTL) {
      reverseTokens(maskTokens[0]);
    }

    return maskTokens;
  },

  /** @upstream masktoken.js default */
  createMaskToken(
    this: Engine,
    isGroup?: boolean,
    isOptional?: boolean,
    isQuantifier?: boolean,
    isAlternator?: boolean,
  ): MaskToken {
    return {
      matches: [],
      openGroup: isGroup || false,
      alternatorGroup: false,
      isGroup: isGroup || false,
      isOptional: isOptional || false,
      isQuantifier: isQuantifier || false,
      isAlternator: isAlternator || false,
      quantifier: {
        min: 1,
        max: 1,
      },
    };
  },
};

export type LexerMethods = typeof lexerMethods;
