/**
 * Resolves which test matches apply at a position and renders the mask
 * template from them.
 */
import { extend } from '../extend';
import { looseEquals } from '../looseEquals';

import type {
  CommandObject,
  Engine,
  Locator,
  MaskedElement,
  MaskTest,
  MaskToken,
  MatchValidator,
  ResolvedOptions,
  TestMatch,
} from '../types';

/** An entry of a token's `matches`: a nested token, or the test match of one position. */
type TokenNode = MaskToken | TestMatch;

/** What walking a token answers: `true` once it found a test for the requested position. */
type Resolution = true | undefined;

/** Spells out the ranges of a character class: `a-d` becomes `abcd`. */
function expand(pattern: string): string {
  const expanded: string[] = [];
  let start = -1;
  for (let i = 0, l = pattern.length; i < l; i += 1) {
    if (pattern.charAt(i) === '-') {
      const end = pattern.charCodeAt(i + 1);
      start += 1;
      while (start < end) {
        expanded.push(String.fromCharCode(start));
        start += 1;
      }
    } else {
      start = pattern.charCodeAt(i);
      expanded.push(pattern.charAt(i));
    }
  }
  return expanded.join('');
}

/** The `loopNdx` of a child: its own index in front of its parent's. */
function prependIndex(index: number | string | undefined, loopNdx: Locator): Locator {
  return ([index] as Locator).concat(loopNdx);
}

/** Whether `latestMatch` is the first position `tokenGroup` can produce. */
function isFirstMatch(latestMatch: TestMatch, tokenGroup: TokenNode): boolean {
  const groupMatches = tokenGroup.matches as TokenNode[];
  let firstMatch = groupMatches.indexOf(latestMatch) === 0;
  if (!firstMatch) {
    groupMatches.every((match, ndx) => {
      if (match.isQuantifier === true) {
        firstMatch = isFirstMatch(latestMatch, groupMatches[ndx - 1]);
      } else if (Object.hasOwn(match, 'matches')) {
        firstMatch = isFirstMatch(latestMatch, match);
      }
      return !firstMatch;
    });
  }
  return firstMatch;
}

/** Whether `match` sits anywhere inside `tokenGroup`. */
function isMatchOf(tokenGroup: TokenNode, match: TestMatch): boolean {
  const groupMatches = tokenGroup.matches as TokenNode[];
  let isMatch = groupMatches.indexOf(match) !== -1;
  if (!isMatch) {
    groupMatches.forEach((mtch) => {
      if (mtch.matches !== undefined && !isMatch) {
        isMatch = isMatchOf(mtch, match);
      }
    });
  }
  return isMatch;
}

function calculateMatchesLength(matches: TokenNode[]): number {
  let matchesLength = 0;
  for (const match of matches) {
    if (match.isQuantifier && !Number.isNaN(Number(match.quantifier.max))) {
      // An open end (`*`, `+`) is not a number and counts as one position.
      matchesLength += match.quantifier.max as number;
    } else {
      matchesLength += 1;
    }
  }
  return matchesLength;
}

/** Whether the alternatives of an alternation differ in length. */
function isUnmatchedAlternation(alternateToken: MaskToken): boolean {
  const [firstAlternative] = alternateToken.matches;
  const matchesLength = firstAlternative.matches
    ? calculateMatchesLength(firstAlternative.matches)
    : 1;
  let matchesNewLength: number | undefined;
  for (const alternative of alternateToken.matches) {
    matchesNewLength = alternative.matches ? calculateMatchesLength(alternative.matches) : 1;
    if (matchesLength !== matchesNewLength) break;
  }
  return matchesLength !== matchesNewLength;
}

/** @upstream validation-tests.js getPlaceholder */
function getPlaceholder(this: Engine, pos: number, test?: TestMatch, returnPL?: false): string;
function getPlaceholder(
  this: Engine,
  pos: number,
  test: TestMatch | undefined,
  returnPL: true,
): string | undefined;
function getPlaceholder(
  this: Engine,
  pos: number,
  test?: TestMatch,
  returnPL?: boolean,
): string | undefined {
  const { opts, maskset } = this;
  const match = test || this.getTest(pos).match;

  if (match.placeholder !== undefined || returnPL === true) {
    if (match.placeholder !== '' && match.static === true && match.generated !== true) {
      // static and not dynamically generated ~ does not occur in regex mask ~ numeric alias def is not a valid entry
      const lvp = this.getLastValidPosition(pos);
      const nextPos = this.seekNext(lvp);
      if (returnPL ? pos <= nextPos : pos < nextPos) {
        return opts.staticDefinitionSymbol && match.static ? match.nativeDef : match.def;
      }
    }
    return typeof match.placeholder === 'function' ? match.placeholder(opts) : match.placeholder;
  }

  if (match.static === true) {
    if (pos > -1 && maskset.validPositions[pos] === undefined) {
      const tests = this.getTests(pos);
      const staticAlternations: MaskTest[] = [];
      let prevTest: MaskTest | undefined;
      if (
        typeof opts.placeholder === 'string'
        && tests.length > 1 + (tests[tests.length - 1].match.def === '' ? 1 : 0)
      ) {
        for (const candidate of tests) {
          if (
            candidate.match.def !== ''
            && candidate.match.optionality !== true
            && candidate.match.optionalQuantifier !== true
            && (candidate.match.static === true
              || prevTest === undefined
              || (candidate.match.fn as MatchValidator).test(
                prevTest.match.def,
                maskset,
                pos,
                true,
                opts,
              ) !== false)
          ) {
            staticAlternations.push(candidate);
            if (candidate.match.static === true) prevTest = candidate;
            if (staticAlternations.length > 1) {
              if (/[0-9a-bA-Z]/.test(staticAlternations[0].match.def)) {
                return opts.placeholder.charAt(pos % opts.placeholder.length);
              }
            }
          }
        }
      }
    }
    return match.def;
  }

  return typeof opts.placeholder === 'object'
    ? match.def
    : opts.placeholder.charAt(pos % opts.placeholder.length);
}

export const testsMethods = {
  /** @upstream validation-tests.js getLocator */
  getLocator(this: Engine, tst: MaskTest, align: number): string {
    // need to align the locators to be correct
    let locator = (
      tst.alternation != null
        ? tst.mloc[`${this.getDecisionTaker(tst)}:${tst.alternation}`] || tst.locator
        : tst.locator
    ).join('');
    if (locator !== '') {
      [locator] = locator.split(':'); // strip off alternation marker
      while (locator.length < align) locator += '0';
    }
    return locator;
  },

  /** @upstream validation-tests.js getDecisionTaker */
  getDecisionTaker(this: Engine, tst: MaskTest): string {
    let decisionTaker = tst.locator[tst.alternation as number];
    if (typeof decisionTaker === 'string' && decisionTaker.length > 0) {
      // no decision taken ~ take smallest as decider
      [decisionTaker] = decisionTaker.split(',').sort((a, b) => Number(a) - Number(b));
    }
    return decisionTaker !== undefined ? decisionTaker.toString() : '';
  },

  getPlaceholder,

  /** @upstream validation-tests.js getMaskTemplate */
  getMaskTemplate(
    this: Engine,
    baseOnInput: boolean,
    minimalPos?: number,
    includeMode?: boolean,
    noJit?: boolean,
    clearOptionalTail?: boolean,
  ): string[] {
    // includeMode true => input, undefined => placeholder, false => mask
    const { opts, maskset } = this;
    const { greedy } = opts;
    if (clearOptionalTail && opts.greedy) {
      opts.greedy = false;
      this.maskset.tests = {};
    }
    const minimal = minimalPos || 0;
    // An entry is `undefined` where a test has no input, or no `nativeDef`.
    const maskTemplate: (string | undefined)[] = [];
    let ndxIntlzr: Locator | undefined;
    let pos = 0;
    let test: TestMatch;
    let jitRenderStatic = false;
    do {
      const validPosition = maskset.validPositions[pos];
      if (baseOnInput === true && validPosition) {
        const testPos = clearOptionalTail
          && validPosition.match.optionality
          && maskset.validPositions[pos + 1] === undefined
          && (validPosition.generatedInput === true
            || (looseEquals(validPosition.input, opts.skipOptionalPartCharacter) && pos > 0))
          ? (this.determineTestTemplate(pos, this.getTests(pos, ndxIntlzr, pos - 1)) as MaskTest)
          : validPosition;
        test = testPos.match;
        ndxIntlzr = testPos.locator.slice();
        if (includeMode === true) {
          maskTemplate.push(testPos.input);
        } else if (includeMode === false) {
          maskTemplate.push(test.nativeDef);
        } else {
          maskTemplate.push(this.getPlaceholder(pos, test));
        }
      } else {
        const testPos = this.getTestTemplate(pos, ndxIntlzr, pos - 1);
        test = testPos.match;
        ndxIntlzr = testPos.locator.slice();
        let jitMasking: boolean | number | undefined;
        if (noJit === true) {
          jitMasking = false;
        } else if (opts.jitMasking !== false) {
          jitMasking = opts.jitMasking;
        } else {
          jitMasking = test.jit;
        }
        // check for groupSeparator is a hack for the numerics as we don't want the render of the groupSeparator beforehand
        jitRenderStatic = Boolean(jitRenderStatic || maskset.validPositions[pos - 1])
          && test.static
          && test.def !== opts.groupSeparator
          && test.fn === null;

        if (
          jitRenderStatic
          || jitMasking === false
          || jitMasking === undefined
          || (typeof jitMasking === 'number' && Number.isFinite(jitMasking) && jitMasking > pos)
        ) {
          maskTemplate.push(
            includeMode === false
              ? test.nativeDef
              : this.getPlaceholder(maskTemplate.length, test),
          );
        } else {
          jitRenderStatic = false;
        }
      }

      pos += 1;
    } while (test.static !== true || test.def !== '' || minimal > pos);
    if (maskTemplate[maskTemplate.length - 1] === '') {
      maskTemplate.pop(); // drop the last one which is empty
    }
    if (
      includeMode !== false // do not alter the masklength when just retrieving the maskdefinition
      || maskset.maskLength === undefined
    ) {
      // just make sure the maskLength gets initialized in all cases (needed for isValid)
      maskset.maskLength = pos - 1;
    }

    opts.greedy = greedy;
    return maskTemplate as string[];
  },

  /** @upstream validation-tests.js getTestTemplate */
  getTestTemplate(this: Engine, pos: number, ndxIntlzr?: Locator, tstPs?: number): MaskTest {
    const { maskset } = this;

    return (
      maskset.validPositions[pos]
      || (this.determineTestTemplate(
        pos,
        this.getTests(pos, ndxIntlzr ? ndxIntlzr.slice() : ndxIntlzr, tstPs),
      ) as MaskTest)
    );
  },

  /** @upstream validation-tests.js determineTestTemplate */
  determineTestTemplate(this: Engine, pos: number, tests: MaskTest[]): MaskTest | undefined {
    const { opts } = this;
    // `optionality` is a depth, or `true` on an optional definition. The
    // subtractions below count `true` as 1, as JavaScript does.
    const optionalityLevel = this.determineOptionalityLevel(pos, tests) as number;

    const previousPos = pos > 0 ? pos - 1 : 0;
    const longestLocator = Math.max(
      ...tests.map((tst) => (tst.locator === undefined ? 0 : tst.locator.length)),
    );
    const prevTest = this.getTest(previousPos);
    const prevLocator = this.getLocator(prevTest, longestLocator);

    let lenghtOffset = 0;
    let closest: number | undefined;
    let bestMatch: MaskTest | undefined;

    if (opts.greedy && tests.length > 1 && tests[tests.length - 1].match.def === '') {
      lenghtOffset = 1;
    }
    for (let ndx = 0; ndx < tests.length - lenghtOffset; ndx += 1) {
      // find best matching
      const tst = tests[ndx];
      const tstLocator = this.getLocator(tst, longestLocator);
      const distance = Number(tstLocator) - Number(prevLocator); // find the closest match to the previous one

      if (
        tst.unMatchedAlternationStopped !== true
        || tests.filter((candidate) => candidate.unMatchedAlternationStopped !== true).length <= 1
      ) {
        // only skip when there are choices outside the alternation
        if (
          closest === undefined
          || (tstLocator !== '' && distance < closest)
          || (bestMatch
            && !opts.greedy
            && bestMatch.match.optionality
            && (bestMatch.match.optionality as number) - optionalityLevel > 0
            && bestMatch.match.newBlockMarker === 'master'
            && (!tst.match.optionality
              || (tst.match.optionality as number) - optionalityLevel < 1
              || !tst.match.newBlockMarker))
          || (bestMatch
            && !opts.greedy
            && bestMatch.match.optionalQuantifier
            && !tst.match.optionalQuantifier)
        ) {
          closest = distance;
          bestMatch = tst;
        }
      }
    }
    return bestMatch;
  },

  /** @upstream validation-tests.js determineOptionalityLevel */
  determineOptionalityLevel(this: Engine, pos: number, tests: MaskTest[]): number | boolean {
    let optionalityLevel: number | boolean = 0;
    let differentOptionalLevels = false;
    tests.forEach((test) => {
      if (test.match.optionality) {
        if (optionalityLevel !== 0 && optionalityLevel !== test.match.optionality) {
          differentOptionalLevels = true;
        }
        // `true` compares as 1 here.
        if (
          optionalityLevel === 0
          || (optionalityLevel as number) > (test.match.optionality as number)
        ) {
          optionalityLevel = test.match.optionality;
        }
      }
    });
    if (
      optionalityLevel
      && (looseEquals(pos, 0) || tests.length === 1 || !differentOptionalLevels)
    ) {
      optionalityLevel = 0;
    }
    return optionalityLevel;
  },

  /** @upstream validation-tests.js getTest */
  getTest(this: Engine, pos: number, tests?: MaskTest[]): MaskTest {
    const { maskset } = this;

    const validPosition = maskset.validPositions[pos];
    if (validPosition) {
      return validPosition;
    }
    return (tests || this.getTests(pos))[0];
  },

  /** @upstream validation-tests.js isSubsetOf */
  isSubsetOf(this: Engine, source: MaskTest, target: MaskTest, opts: ResolvedOptions): boolean {
    if (source.match.def === target.match.nativeDef) return true;

    if (
      (opts.regex || (source.match.fn instanceof RegExp && target.match.fn instanceof RegExp))
      && source.match.static !== true
      && target.match.static !== true
    ) {
      // is regex a subset
      // With `opts.regex` set both validators are taken for regular expressions.
      const targetFn = target.match.fn as RegExp;
      const sourceFn = source.match.fn as RegExp;
      if (targetFn.source === '.') return true;
      return (
        expand(targetFn.source.replace(/[[\]/]/g, '')).indexOf(
          expand(sourceFn.source.replace(/[[\]/]/g, '')),
        ) !== -1
      );
    }
    return false;
  },

  /** @upstream validation-tests.js getTests */
  getTests(this: Engine, pos: number, ndxIntlzr?: Locator, tstPs?: number): MaskTest[] {
    const { maskset, opts, el } = this;
    const maskTokens = maskset.maskToken;
    // `undefined` when an initialiser comes without `tstPs`. Every comparison
    // with it is then false, so no token matches the position.
    let testPos = (ndxIntlzr ? tstPs : 0) as number;
    let rootNdxInitializer: Locator = ndxIntlzr ? ndxIntlzr.slice() : [0];
    let matches: MaskTest[] = [];
    let insertStop = false;
    let latestMatch: TestMatch | undefined;
    let cacheDependency: string | undefined = ndxIntlzr ? ndxIntlzr.join('') : '';
    let unMatchedAlternation = false;

    const mergeLocators = (position: number, tests: MaskTest | MaskTest[]): Locator => {
      let locator: Locator = [];
      const candidates = Array.isArray(tests) ? tests : [tests];

      if (candidates.length > 0) {
        if (
          candidates[0].alternation === undefined
          || opts.keepStatic === true
          || (Number.isFinite(parseInt(String(opts.keepStatic), 10))
            && position >= (opts.keepStatic as number))
        ) {
          locator = (
            this.determineTestTemplate(position, candidates.slice()) as MaskTest
          ).locator.slice();
          if (locator.length === 0) locator = candidates[0].locator.slice();
        } else {
          candidates.forEach((mtch) => {
            Object.values(mtch.mloc).forEach((mloc) => {
              mloc.forEach((loc, locNdx) => {
                const mergedPos = locator[locNdx];
                if (
                  loc.toString().includes(':')
                  || (mergedPos && mergedPos.toString().includes(':'))
                ) {
                  return;
                }
                if (mergedPos === undefined) {
                  locator[locNdx] = loc;
                } else if (!mergedPos.toString().includes(String(loc))) {
                  locator[locNdx] = `${mergedPos},${loc}`;
                }
              });
            });
          });
        }
      }
      return locator;
    };

    const resolveNdxInitializer = (
      position: number,
      alternateNdx: number,
      targetAlternation?: number,
    ): Locator | undefined => {
      let bestMatch: MaskTest | undefined;
      let distance: number | undefined;
      let locator: string | undefined;
      let newAlternateMloc: string | undefined;
      let alternateMloc = `${alternateNdx}:${targetAlternation}`;

      const validPosition = maskset.validPositions[position];
      const cachedTests = maskset.tests[position];
      if (cachedTests || validPosition) {
        const candidates = validPosition ? [validPosition] : (cachedTests as MaskTest[]);
        for (const lmnt of candidates) {
          if (lmnt.mloc[alternateMloc]) {
            bestMatch = lmnt;
            break;
          }

          // check if an entry in mloc match the alternateNdx on targetAlternation
          const mlocMatches = Object.values(lmnt.mloc).filter(
            (m) => looseEquals(m[targetAlternation as number], alternateNdx),
          );
          // for each mlocMatch check the calculated distance
          for (const mlocMatch of mlocMatches) {
            let mlocMatchL = mlocMatch.join('').split(':')[0]; // strip off alternation marker
            locator = locator || mlocMatchL;
            while (mlocMatchL.length < locator.length) mlocMatchL += '0';

            const mlocDistance = Number(mlocMatchL);
            if (bestMatch === undefined || mlocDistance < (distance as number)) {
              distance = mlocDistance;
              bestMatch = lmnt;

              // key from mlocMatch
              newAlternateMloc = (
                Object.entries(lmnt.mloc).find(
                  (entry) => entry[1].toString() === mlocMatch.toString(),
                ) as [string, Locator]
              )[0];
            }
          }
        }
      }
      if (bestMatch) {
        if (targetAlternation === undefined) {
          alternateMloc = `${alternateNdx}:${bestMatch.alternation}`;
        }
        const bestMatchAltIndex = `${bestMatch.locator[bestMatch.alternation as number]}:${bestMatch.alternation}`;
        const slocator = bestMatch.mloc[newAlternateMloc || alternateMloc]
          || bestMatch.mloc[bestMatchAltIndex]
          || bestMatch.locator;
        if (slocator[slocator.length - 1].toString().indexOf(':') !== -1) {
          // The marker comes off the list the test itself holds.
          slocator.pop();
        }

        const sliceStart = parseInt(String(bestMatch.alternation), 10) + 1;

        return slocator.slice(sliceStart);
      }
      return targetAlternation !== undefined
        ? resolveNdxInitializer(position, alternateNdx)
        : undefined;
    };

    const staticCanMatchDefinition = (
      source: MaskTest,
      target: MaskTest,
    ): boolean | CommandObject => (
      source.match.static === true && target.match.static !== true
        ? (target.match.fn as MatchValidator).test(
          source.match.def,
          maskset,
          pos,
          false,
          opts,
          false,
        )
        : false
    );

    // mergelocators for retrieving the correct locator match when merging
    const setMergeLocators = (targetMatch: MaskTest, altMatch?: MaskTest): boolean => {
      const target = targetMatch;

      const mergeLoc = (altNdx: number): boolean => {
        target.mloc = target.mloc || {};
        let locNdx = target.locator[altNdx];
        if (locNdx === undefined) {
          target.alternation = undefined;
          return false;
        }
        if (altMatch === undefined) {
          if (typeof locNdx === 'string') [locNdx] = locNdx.split(',');
          locNdx = `${locNdx}:${altNdx}`;
          if (target.mloc[locNdx] === undefined) {
            target.mloc[locNdx] = target.locator.slice();
            target.mloc[locNdx].push(`:${altNdx}`); // add alternation index
          }
        } else {
          // The offset is not reset between keys.
          let offset = 0;
          for (const ndx in altMatch.mloc) {
            if (target.mloc[ndx] === undefined) {
              target.mloc[ndx] = altMatch.mloc[ndx];
            } else {
              while (target.mloc[`${ndx}${offset}`] !== undefined) offset += 1;
              target.mloc[`${ndx}${offset}`] = altMatch.mloc[ndx];
            }
          }

          target.locator = mergeLocators(testPos, [target, altMatch]);
        }
        if ((target.alternation as number) > altNdx) {
          // if the alternation index is higher than the current one resolve it to the alternation
          target.alternation = altNdx;
        }
        return true;
      };

      // `alternation` can be missing on either test. A comparison with it is
      // then false, and the code below relies on that.
      let alternationNdx = target.alternation as number;
      if (altMatch === undefined) return mergeLoc(alternationNdx);

      let shouldMerge = alternationNdx <= (altMatch.alternation as number)
        && target.locator[alternationNdx]
          .toString()
          .indexOf(String(altMatch.locator[alternationNdx])) === -1;
      if (!shouldMerge && alternationNdx > (altMatch.alternation as number)) {
        for (let i = 0; i < alternationNdx; i += 1) {
          if (target.locator[i] !== altMatch.locator[i]) {
            alternationNdx = i;
            shouldMerge = true;
            break;
          }
        }
      }

      if (shouldMerge) {
        return mergeLoc(alternationNdx);
      }
      return false;
    };

    const resolveTestFromToken = (
      maskToken: MaskToken,
      tokenNdxInitializer: Locator,
      tokenLoopNdx: Locator,
      tokenQuantifierRecurse?: TokenNode,
    ): Resolution => {
      // ndxInitializer contains a set of indexes to speedup searches in the mtokens
      // It starts as the caller's list, so every level takes its index off the
      // same one. The alternator handler puts a list of its own here, and only
      // this level and the ones it calls see that list.
      let ndxInitializer = tokenNdxInitializer;

      const handleMatch = (
        match: TokenNode,
        loopNdx: Locator,
        quantifierRecurse?: TokenNode,
      ): Resolution => {
        const handleGroup = (): Resolution => {
          const matched = handleMatch(
            maskToken.matches[maskToken.matches.indexOf(match) + 1],
            loopNdx,
            quantifierRecurse,
          );
          if (matched) return true;
          return undefined;
        };

        const handleOptional = (optionalToken: MaskToken): Resolution => {
          const mtchsNdx = matches.length;
          const matched = resolveTestFromToken(
            optionalToken,
            ndxInitializer,
            loopNdx,
            quantifierRecurse,
          );
          if (matches.length > 0) {
            // check on matches.length instead of match to handle quantifier in a recursive call
            // mark optionality in matches
            matches.forEach((mtch, ndx) => {
              if (ndx >= mtchsNdx) {
                const test = mtch.match;
                test.optionality = test.optionality ? (test.optionality as number) + 1 : 1;
              }
            });
            latestMatch = matches[matches.length - 1].match;

            if (quantifierRecurse === undefined && isFirstMatch(latestMatch, optionalToken)) {
              // prevent loop see #698
              insertStop = true; // insert a stop
              testPos = pos; // match the position after the group
            } else {
              return matched; // make the loop continue when it is deliberately by a quantifier
            }
          }
          return undefined;
        };

        const handleAlternator = (alternateToken: MaskToken): Resolution => {
          this.hasAlternator = true;
          const malternateMatches: MaskTest[] = [];
          const currentMatches = matches.slice();
          const loopNdxCnt = loopNdx.length;
          const altIndex = ndxInitializer.length > 0 ? ndxInitializer.shift() : -1;
          let matched: boolean | undefined;
          if (altIndex === -1 || typeof altIndex === 'string') {
            const currentPos = testPos;
            const ndxInitializerClone = ndxInitializer.slice();
            let altIndexArr: string[] = [];
            if (typeof altIndex === 'string') {
              altIndexArr = altIndex.split(',');
            } else {
              for (let amndx = 0; amndx < alternateToken.matches.length; amndx += 1) {
                altIndexArr.push(amndx.toString());
              }
            }

            const excludes = maskset.excludes[pos];
            if (excludes !== undefined) {
              const altIndexArrClone = altIndexArr.slice();
              for (const exclude of excludes) {
                const excludeSet = exclude.toString().split(':');
                if (looseEquals(loopNdx.length, excludeSet[1])) {
                  // An alternative that is not in the list takes the last entry with it.
                  altIndexArr.splice(altIndexArr.indexOf(excludeSet[0]), 1);
                }
              }
              if (altIndexArr.length === 0) {
                // fully alternated => reset
                delete maskset.excludes[pos];
                altIndexArr = altIndexArrClone;
              }
            }
            if (
              opts.keepStatic === true
              || (Number.isFinite(parseInt(String(opts.keepStatic), 10))
                && currentPos >= (opts.keepStatic as number))
            ) {
              altIndexArr = altIndexArr.slice(0, 1);
            }
            for (const altIndexEntry of altIndexArr) {
              const amndx = parseInt(altIndexEntry, 10);
              matches = [];
              // set the correct ndxInitializer
              ndxInitializer = typeof altIndex === 'string'
                ? resolveNdxInitializer(testPos, amndx, loopNdxCnt) || ndxInitializerClone.slice()
                : ndxInitializerClone.slice();
              const tokenMatch = alternateToken.matches[amndx];
              if (
                !(tokenMatch
                  && handleMatch(tokenMatch, prependIndex(amndx, loopNdx), quantifierRecurse))
              ) {
                unMatchedAlternation = isUnmatchedAlternation(alternateToken);
                if (
                  tokenMatch
                  && tokenMatch.matches
                  && tokenMatch.matches.length
                    > (alternateToken.matches[0].matches as TokenNode[]).length
                ) {
                  break;
                }
              }

              const maltMatches = matches.slice();
              testPos = currentPos;
              matches = [];

              // fuzzy merge matches
              for (const altMatch of maltMatches) {
                let dropMatch = false;
                altMatch.alternation = altMatch.alternation || loopNdxCnt;
                setMergeLocators(altMatch);
                for (const altMatch2 of malternateMatches) {
                  if (
                    typeof altIndex !== 'string'
                    || (altMatch.alternation !== undefined
                      && altIndex.indexOf(
                        altMatch.locator[altMatch.alternation].toString(),
                      ) !== -1)
                  ) {
                    if (altMatch.match.nativeDef === altMatch2.match.nativeDef) {
                      dropMatch = true;
                      setMergeLocators(altMatch2, altMatch);
                      break;
                    } else if (this.isSubsetOf(altMatch, altMatch2, opts)) {
                      if (setMergeLocators(altMatch, altMatch2)) {
                        dropMatch = true;
                        malternateMatches.splice(malternateMatches.indexOf(altMatch2), 0, altMatch);
                      }
                      break;
                    } else if (this.isSubsetOf(altMatch2, altMatch, opts)) {
                      setMergeLocators(altMatch2, altMatch);
                      break;
                    } else if (staticCanMatchDefinition(altMatch, altMatch2)) {
                      if (setMergeLocators(altMatch, altMatch2)) {
                        // insert match above general match
                        dropMatch = true;
                        malternateMatches.splice(malternateMatches.indexOf(altMatch2), 0, altMatch);
                      }
                      break;
                    } else if (staticCanMatchDefinition(altMatch2, altMatch)) {
                      setMergeLocators(altMatch2, altMatch);
                      // hackery to solve a mask like ([0]9)|(2a) ~ note the static 0 is optional ~ see unittest ivaninDarpatov
                      // this needs a better solution, but his will do for now
                      // Without an element this read throws.
                      if (
                        altMatch2.match.optionality
                        && ((el as MaskedElement).inputmask as Engine).userOptions.keepStatic
                          === undefined
                      ) {
                        opts.keepStatic = currentPos;
                      }
                      break;
                    }
                  }
                }
                if (!dropMatch) {
                  malternateMatches.push(altMatch);
                }
              }
            }

            matches = currentMatches.concat(malternateMatches);

            testPos = pos;
            // insert a stopelemnt when there is an alternate - needed for non-greedy option
            insertStop = matches.length > 0 && unMatchedAlternation;
            matched = malternateMatches.length > 0 && !unMatchedAlternation; // set correct match state

            if (unMatchedAlternation && insertStop && !matched) {
              // mark matches with unMatchedAlternationStopped
              matches.forEach((mtch) => {
                const stopped = mtch;
                stopped.unMatchedAlternationStopped = true;
              });
            }

            // cloneback
            ndxInitializer = ndxInitializerClone.slice();
          } else {
            matched = handleMatch(
              alternateToken.matches[altIndex as number] || maskToken.matches[altIndex as number],
              prependIndex(altIndex, loopNdx),
              quantifierRecurse,
            );
          }
          if (matched) {
            return true;
          }
          return undefined;
        };

        const handleQuantifier = (qt: MaskToken): Resolution => {
          let breakloop = false;
          // The index is used as it comes off the initialiser. On an undecided
          // alternation that is a string such as '0,1': the comparisons then
          // follow the string rules of JavaScript, and the increment turns it
          // into NaN, which ends the loop.
          for (
            let qndx = (ndxInitializer.length > 0 ? ndxInitializer.shift() : 0) as number;
            qndx < (Number.isNaN(Number(qt.quantifier.max))
              ? qndx + 1
              : (qt.quantifier.max as number));
            qndx = Number(qndx) + 1
          ) {
            // The second half of the loop condition: `handleMatch` moves `testPos`.
            if (!(testPos <= pos)) break;
            const tokenGroup = maskToken.matches[maskToken.matches.indexOf(qt) - 1];
            // set the tokenGroup as quantifierRecurse marker
            const matched = handleMatch(tokenGroup, prependIndex(qndx, loopNdx), tokenGroup);
            if (matched) {
              const groupMatches = tokenGroup.matches as TokenNode[];
              matches.forEach((mtch) => {
                if (isMatchOf(tokenGroup, mtch.match)) latestMatch = mtch.match;
                else latestMatch = matches[matches.length - 1].match;

                // Optionality of nested quantifiers is not tracked: only this level counts.
                latestMatch.optionalQuantifier = qndx >= (qt.quantifier.min as number);
                // qndx + 1 as the index starts from 0
                latestMatch.jit = (qndx + 1) * (groupMatches.indexOf(latestMatch) + 1)
                  > (qt.quantifier.jit as number);
                if (latestMatch.optionalQuantifier && isFirstMatch(latestMatch, tokenGroup)) {
                  insertStop = true;
                  testPos = pos; // match the position after the group
                  if (
                    opts.greedy
                    && maskset.validPositions[pos - 1] == null
                    && qndx > (qt.quantifier.min as number)
                    && ['*', '+'].indexOf(qt.quantifier.max as string) !== -1
                  ) {
                    matches.pop();
                    cacheDependency = undefined;
                  }
                  breakloop = true; // stop quantifierloop && search for next possible match
                }
                if (!breakloop && latestMatch.jit) {
                  // always set jitOffset, isvalid checks when to apply
                  maskset.jitOffset[pos] = groupMatches.length - groupMatches.indexOf(latestMatch);
                }
              });
              if (breakloop) break; // search for next possible match
              return true;
            }
          }
          return undefined;
        };

        if (testPos > pos + opts._maxTestPos) {
          throw new Error(
            `Inputmask: There is probably an error in your mask definition or in the code. Create an issue on github with an example of the mask you are using. ${maskset.mask}`,
          );
        }
        if (testPos === pos && match.matches === undefined) {
          matches.push({
            match,
            locator: loopNdx.reverse(),
            cd: cacheDependency,
            mloc: {},
          });
          const nativeDef = match.nativeDef as string;
          if (
            match.optionality
            && quantifierRecurse === undefined
            && ((opts.definitions
              && opts.definitions[nativeDef]
              && opts.definitions[nativeDef].optional)
              || (this.Inputmask.prototype.definitions[nativeDef]
                && this.Inputmask.prototype.definitions[nativeDef].optional))
          ) {
            // prevent loop see #698
            insertStop = true; // insert a stop
            testPos = pos; // match the position after the group
          } else {
            return true;
          }
        } else if (match.matches !== undefined) {
          if (match.isGroup && quantifierRecurse !== match) {
            // when a group pass along to the quantifier
            return handleGroup();
          }
          if (match.isOptional) {
            return handleOptional(match);
          }
          if (match.isAlternator) {
            return handleAlternator(match);
          }
          if (
            match.isQuantifier
            && quantifierRecurse !== maskToken.matches[maskToken.matches.indexOf(match) - 1]
          ) {
            return handleQuantifier(match);
          }
          const matched = resolveTestFromToken(match, ndxInitializer, loopNdx, quantifierRecurse);
          if (matched) return true;
        } else {
          testPos += 1;
        }
        return undefined;
      };

      // the offset is set in the quantifierloop when git masking is used
      // An index that is `undefined` or an undecided alternation such as '0,1'
      // fails the comparison, and the loop does not run.
      for (
        let tndx = (ndxInitializer.length > 0 ? ndxInitializer.shift() : 0) as number;
        tndx < maskToken.matches.length;
        tndx += 1
      ) {
        if (maskToken.matches[tndx].isQuantifier !== true) {
          const matched = handleMatch(
            maskToken.matches[tndx],
            prependIndex(tndx, tokenLoopNdx),
            tokenQuantifierRecurse,
          );
          if (matched && testPos === pos) {
            return matched;
          }
          if (testPos > pos) {
            break;
          }
        }
      }
      return undefined;
    };

    if (pos > -1) {
      if (ndxIntlzr === undefined) {
        // determine index initializer
        let previousPos = pos - 1;
        let previousTests = maskset.validPositions[previousPos] || maskset.tests[previousPos];
        while (previousTests === undefined && previousPos > -1) {
          previousPos -= 1;
          previousTests = maskset.validPositions[previousPos] || maskset.tests[previousPos];
        }
        if (previousTests !== undefined && previousPos > -1) {
          rootNdxInitializer = mergeLocators(previousPos, previousTests);
          cacheDependency = rootNdxInitializer.join('');
          testPos = previousPos;
        }
      }
      const cachedTests = maskset.tests[pos];
      if (cachedTests && cachedTests[0].cd === cacheDependency) {
        // cacheDependency is set on all tests, just check on the first
        return cachedTests;
      }
      for (
        let mtndx = rootNdxInitializer.shift() as number;
        mtndx < maskTokens.length;
        mtndx += 1
      ) {
        const matched = resolveTestFromToken(maskTokens[mtndx], rootNdxInitializer, [mtndx]);
        if ((matched && testPos === pos) || testPos > pos) {
          break;
        }
      }
    }
    if (matches.length === 0 || insertStop) {
      matches.push({
        match: {
          fn: null,
          static: true,
          optionality: false,
          casing: null,
          def: '',
          placeholder: '',
        },
        // mark when there are unmatched alternations  ex: mask: "(a|aa)"
        // this will result in the least distance to select the correct test result in determineTestTemplate
        locator:
          unMatchedAlternation
          && matches.filter((tst) => tst.unMatchedAlternationStopped !== true).length === 0
            ? [0]
            : [],
        mloc: {},
        cd: cacheDependency,
      });
    }
    let result: MaskTest[];
    if (ndxIntlzr !== undefined && maskset.tests[pos]) {
      // prioritize full tests for caching
      result = extend(true, [], matches);
    } else {
      result = extend(true, [], matches); // set a clone to prevent overwriting some props
      maskset.tests[pos] = result;
    }

    // cleanup optionality marking
    matches.forEach((t) => {
      const test = t.match;
      test.optionality = test.defOptionality || false;
    });

    return result;
  },
};

export type TestsMethods = typeof testsMethods;
