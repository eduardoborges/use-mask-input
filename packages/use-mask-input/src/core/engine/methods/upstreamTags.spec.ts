import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import Inputmask from '../Inputmask';

import { apiMethods } from './api';
import { eventHandlerMethods } from './eventHandlers';
import { eventRulerMethods } from './eventRuler';
import { inputHandlingMethods } from './inputHandling';
import { lexerMethods } from './lexer';
import { maskBindingMethods } from './mask';
import { positioningMethods } from './positioning';
import { testsMethods } from './tests';
import { validationMethods } from './validation';

/** Files of Inputmask the engine methods come from. */
const UPSTREAM_FILES = [
  'inputmask.js', 'mask-lexer.js', 'masktoken.js', 'validation-tests.js', 'positioning.js',
  'validation.js', 'inputHandling.js', 'eventhandlers.js', 'eventruler.js', 'mask.js',
];

const GROUPS: [file: string, methods: string[]][] = [
  ['./api.ts', Object.keys(apiMethods)],
  ['./eventHandlers.ts', Object.keys(eventHandlerMethods)],
  ['./eventRuler.ts', Object.keys(eventRulerMethods)],
  ['./inputHandling.ts', Object.keys(inputHandlingMethods)],
  ['./lexer.ts', Object.keys(lexerMethods)],
  ['./mask.ts', Object.keys(maskBindingMethods)],
  ['./positioning.ts', Object.keys(positioningMethods)],
  ['./tests.ts', Object.keys(testsMethods)],
  ['./validation.ts', Object.keys(validationMethods)],
  ['../Inputmask.ts', ['resolveAlias', 'importAttributeOptions']],
];

/** The `@upstream` tag right above the declaration of `method`, if there is one. */
function upstreamTagOf(source: string, method: string): { file: string; name: string } | undefined {
  const declaration = new RegExp(
    `/\\*\\* @upstream (\\S+) (\\S+) \\*/\\n\\s*(?:async )?(?:function )?${method}[(<]`,
  );
  const match = declaration.exec(source);

  return match ? { file: match[1], name: match[2] } : undefined;
}

// The tag is how a method is traced back to the Inputmask function it comes from.
describe('@upstream tags', () => {
  describe.each(GROUPS)('%s', (file, methods) => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');

    it.each(methods)('%s names the function it comes from', (method) => {
      const tag = upstreamTagOf(source, method);

      expect(tag, `${method} has no @upstream tag right above it`).toBeDefined();
      expect(UPSTREAM_FILES).toContain(tag?.file);
      expect(tag?.name).toMatch(/^[A-Za-z_][\w.]*$/);
    });

    it('tags nothing but its methods', () => {
      const tagged = source.match(/\/\*\* @upstream /g) || [];

      expect(tagged).toHaveLength(methods.length);
    });
  });

  it('covers every method on the prototype', () => {
    const audited = new Set(GROUPS.flatMap(([, methods]) => methods));
    const onPrototype = Object.keys(Inputmask.prototype)
      .filter((key) => typeof Object.getOwnPropertyDescriptor(Inputmask.prototype, key)?.value === 'function');

    expect(onPrototype.filter((method) => !audited.has(method))).toEqual([]);
    expect(onPrototype.length).toBe(audited.size);
  });
});
