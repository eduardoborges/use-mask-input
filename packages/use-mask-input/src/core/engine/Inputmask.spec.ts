import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import { defaults } from './defaults';
import { definitions } from './definitions';
import { extend } from './extend';
import Inputmask from './Inputmask';
import { apiMethods } from './methods/api';
import { eventHandlerMethods } from './methods/eventHandlers';
import { eventRulerMethods } from './methods/eventRuler';
import { inputHandlingMethods } from './methods/inputHandling';
import { lexerMethods } from './methods/lexer';
import { maskBindingMethods } from './methods/mask';
import { positioningMethods } from './methods/positioning';
import { testsMethods } from './methods/tests';
import { validationMethods } from './methods/validation';

import type {
  AliasDefinition, Engine, MaskedElement, ResolvedOptions, UserOptions,
} from './types';

const METHOD_GROUPS: Record<string, Record<string, unknown>> = {
  api: apiMethods,
  lexer: lexerMethods,
  tests: testsMethods,
  positioning: positioningMethods,
  validation: validationMethods,
  inputHandling: inputHandlingMethods,
  eventHandlers: eventHandlerMethods,
  eventRuler: eventRulerMethods,
  mask: maskBindingMethods,
};

const PUBLIC_METHODS = [
  'mask', 'option', 'unmaskedvalue', 'remove', 'getemptymask', 'hasMaskedValue', 'isComplete',
  'getmetadata', 'isValid', 'format', 'setValue', 'analyseMask',
];

function createInput(html = '<input>'): MaskedElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);

  return host.firstElementChild as HTMLElement as MaskedElement;
}

/** Registers aliases for one test and removes them again. */
function withAliases(aliases: Record<string, AliasDefinition>): () => void {
  Inputmask.extendAliases(aliases);

  return () => {
    Object.keys(aliases).forEach((name) => {
      delete Inputmask.prototype.aliases[name];
    });
  };
}

/** Runs the attribute import the way `mask` does: on copies of the engine's options. */
function importInto(
  element: MaskedElement,
  options: UserOptions = {},
): { opts: ResolvedOptions; userOptions: UserOptions; count: number } {
  const engine = Inputmask(options);
  const opts = extend(true, {}, engine.opts);
  const userOptions = extend(true, {}, engine.userOptions);
  const count = engine.importAttributeOptions(element, opts, userOptions, engine.dataAttribute);

  return { opts, userOptions, count };
}

/** An element whose engine is a stand-in that only records `remove` calls. */
function maskedInput(html = '<input>'): { element: MaskedElement; remove: ReturnType<typeof vi.fn> } {
  const element = createInput(html);
  const remove = vi.fn();
  element.inputmask = { remove } as unknown as Engine;

  return { element, remove };
}

/** `format` is overloaded, and a spy is typed after its last signature only. */
function spyOnFormat(): ReturnType<typeof vi.fn> {
  return vi.spyOn(Inputmask.prototype, 'format') as unknown as ReturnType<typeof vi.fn>;
}

describe('Inputmask factory', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('creating an engine', () => {
    it('works without new', () => {
      const engine = Inputmask({ mask: '99-99' });

      expect(engine).toBeInstanceOf(Inputmask);
      expect(Object.getPrototypeOf(engine)).toBe(Inputmask.prototype);
      expect(engine.opts.mask).toBe('99-99');
    });

    it('works with new', () => {
      const engine = new Inputmask({ mask: '99-99' });

      expect(engine).toBeInstanceOf(Inputmask);
      expect(Object.getPrototypeOf(engine)).toBe(Inputmask.prototype);
      expect(engine.opts.mask).toBe('99-99');
    });

    it('gives every call its own engine and its own options', () => {
      const first = Inputmask({ mask: '99' });
      const second = Inputmask({ mask: '99' });

      expect(first).not.toBe(second);
      expect(first.opts).not.toBe(second.opts);
      expect(first.opts.supportsInputType).not.toBe(second.opts.supportsInputType);
      expect(first.opts.supportsInputType).not.toBe(defaults.supportsInputType);
    });

    it('starts with a clean state', () => {
      const engine = Inputmask({ mask: '9' });

      expect(engine.el).toBeUndefined();
      expect(engine.maskset).toBeUndefined();
      expect(engine.refreshValue).toBe(false);
      expect(engine.undoValue).toBeUndefined();
      expect(engine.skipInputEvent).toBe(false);
      expect(engine.validationEvent).toBe(false);
      expect(engine.ignorable).toBe(false);
      expect(engine.maxLength).toBeUndefined();
      expect(engine.mouseEnter).toBe(false);
      expect(engine.clicked).toBe(0);
      expect(engine.originalPlaceholder).toBeUndefined();
      expect(engine.isComposing).toBe(false);
      expect(engine.lastInputEvent).toBeNull();
      expect(engine.hasAlternator).toBe(false);
    });

    it('keeps its state on the engine, not on the prototype', () => {
      const engine = Inputmask({ mask: '9' });

      expect(Object.keys(engine).toSorted()).toEqual([
        'clicked', 'el', 'hasAlternator', 'ignorable', 'isComposing', 'lastInputEvent', 'maskset',
        'mouseEnter', 'noMasksCache', 'opts', 'originalPlaceholder', 'refreshValue',
        'skipInputEvent', 'undoValue', 'userOptions', 'validationEvent',
      ]);
    });

    it('merges the options over the defaults', () => {
      const engine = Inputmask({ mask: '99', placeholder: '#', clearIncomplete: true });

      expect(engine.opts).toMatchObject({
        mask: '99', placeholder: '#', clearIncomplete: true, greedy: false, insertMode: true,
      });
      expect(Object.keys(engine.opts)).toEqual(
        Object.keys(defaults).filter((key) => key !== 'staticDefinitionSymbol'),
      );
    });

    it('skips undefined options and lets null override a default', () => {
      const engine = Inputmask({ mask: '99', placeholder: undefined, onBeforePaste: null });

      expect(engine.opts.placeholder).toBe('_');
      expect(engine.opts.onBeforePaste).toBeNull();
    });

    it('keeps the options object it was given as userOptions', () => {
      const options: UserOptions = { mask: '99' };

      expect(Inputmask(options).userOptions).toBe(options);
      expect(Inputmask('99', options).userOptions).toBe(options);
    });

    it('uses an empty object as userOptions when none is given', () => {
      expect(Inputmask().userOptions).toEqual({});
      expect(Inputmask('99').userOptions).toEqual({ alias: '99' });
      expect(Inputmask('99', null).userOptions).toEqual({ alias: '99' });
    });

    it('falls back to no mask at all when called with nothing', () => {
      const engine = Inputmask();

      expect(engine.opts.alias).toBeNull();
      expect(engine.opts.mask).toBeNull();
    });

    it('takes a first argument that is no alias as the mask', () => {
      const engine = Inputmask('99-99');

      expect(engine.opts.alias).toBe('99-99');
      expect(engine.opts.mask).toBe('99-99');
    });

    it('takes an array as first argument as a list of masks', () => {
      const masks = ['99', '999'];
      const engine = Inputmask(masks);

      expect(engine.opts.mask).toEqual(['99', '999']);
      expect(engine.opts.mask).not.toBe(masks);
    });

    it('writes the alias onto the options object it was given', () => {
      const options: UserOptions = { placeholder: '#' };
      Inputmask('99', options);

      expect(options).toEqual({ placeholder: '#', alias: '99' });
    });

    it('lets the alias argument win over an alias in the options', () => {
      const restore = withAliases({ first: { mask: '1' }, second: { mask: '2' } });
      const engine = Inputmask('first', { alias: 'second' });
      restore();

      expect(engine.opts.alias).toBe('first');
      expect(engine.opts.mask).toBe('1');
    });

    it('ignores the second argument when the first is an options object', () => {
      const engine = Inputmask({ mask: '11' }, { mask: '22', placeholder: '#' });

      expect(engine.opts.mask).toBe('11');
      expect(engine.opts.placeholder).toBe('_');
    });

    it('keeps an explicit mask when the alias is unknown', () => {
      const engine = Inputmask('unknown', { mask: '9' });

      expect(engine.opts.mask).toBe('9');
      expect(engine.opts.alias).toBe('unknown');
    });

    it('turns the mask cache off when the options bring definitions', () => {
      expect(Inputmask({ mask: '9' }).noMasksCache).toBe(false);
      expect(Inputmask({ mask: 'x', definitions: { x: { validator: '[0-9]' } } }).noMasksCache).toBe(true);
    });

    it('skips option handling for an internal engine', () => {
      const engine = Inputmask(undefined, undefined, true);

      expect(engine.opts).toBeUndefined();
      expect(engine.userOptions).toBeUndefined();
      expect(engine.noMasksCache).toBeUndefined();
      expect(Object.keys(engine)).not.toContain('opts');
      expect(engine.clicked).toBe(0);
    });

    it('has the name and arity of the Inputmask constructor', () => {
      expect(Inputmask.name).toBe('Inputmask');
      expect(Inputmask.length).toBe(3);
    });
  });

  describe('prototype', () => {
    it('exposes the registries', () => {
      expect(Inputmask.prototype.defaults).toBe(defaults);
      expect(Inputmask.prototype.definitions).toBe(definitions);
      expect(Inputmask.prototype.aliases).toEqual({});
      expect(Inputmask.prototype.masksCache).toEqual({});
      expect(Inputmask.prototype.i18n).toEqual({});
      expect(Inputmask.prototype.dataAttribute).toBe('data-inputmask');
    });

    it('shares the registries between engines', () => {
      const first = Inputmask({ mask: '9' });
      const second = Inputmask({ mask: '9' });

      expect(first.defaults).toBe(second.defaults);
      expect(first.definitions).toBe(Inputmask.prototype.definitions);
      expect(first.aliases).toBe(Inputmask.prototype.aliases);
      expect(first.masksCache).toBe(Inputmask.prototype.masksCache);
      expect(first.i18n).toBe(Inputmask.prototype.i18n);
      expect(first.dataAttribute).toBe('data-inputmask');
    });

    it('lets one engine override dataAttribute without touching the others', () => {
      const engine = Inputmask({ mask: '9' });
      engine.dataAttribute = '';

      expect(engine.dataAttribute).toBe('');
      expect(Inputmask({ mask: '9' }).dataAttribute).toBe('data-inputmask');
    });

    it('gives every engine a way back to the factory', () => {
      const engine = Inputmask({ mask: '9' });

      expect(engine.Inputmask).toBe(Inputmask);
      expect(Inputmask.prototype.Inputmask).toBe(Inputmask);
      expect(engine.Inputmask.prototype.masksCache).toBe(Inputmask.prototype.masksCache);
      expect(Object.keys(Inputmask.prototype)).not.toContain('Inputmask');
    });

    describe('isRTL', () => {
      it('is false for a plain mask', () => {
        expect(Inputmask({ mask: '99' }).isRTL).toBe(false);
      });

      it('is true for numeric input', () => {
        expect(Inputmask({ mask: '99', numericInput: true }).isRTL).toBe(true);
      });

      it('is true once the options say so', () => {
        const engine = Inputmask({ mask: '99' });
        engine.opts.isRTL = true;

        expect(engine.isRTL).toBe(true);
      });

      it('is a getter on the prototype, so it follows the options', () => {
        const descriptor = Object.getOwnPropertyDescriptor(Inputmask.prototype, 'isRTL');
        const engine = Inputmask({ mask: '99' });

        expect(typeof descriptor?.get).toBe('function');
        expect(descriptor?.set).toBeUndefined();
        expect(Object.keys(engine)).not.toContain('isRTL');

        engine.opts.numericInput = true;
        expect(engine.isRTL).toBe(true);
      });
    });
  });

  describe('method groups', () => {
    it.each(Object.entries(METHOD_GROUPS))('puts every method of the %s group on the prototype', (_name, group) => {
      const prototype = Inputmask.prototype as unknown as Record<string, unknown>;

      expect(Object.keys(group).length).toBeGreaterThan(0);
      Object.entries(group).forEach(([method, implementation]) => {
        expect(typeof implementation, method).toBe('function');
        expect(prototype[method], method).toBe(implementation);
      });
    });

    it('defines no method in two groups', () => {
      const owners: Record<string, string[]> = {};
      Object.entries(METHOD_GROUPS).forEach(([groupName, group]) => {
        Object.keys(group).forEach((method) => {
          owners[method] = [...(owners[method] || []), groupName];
        });
      });
      const duplicated = Object.entries(owners).filter(([, groups]) => groups.length > 1);

      expect(duplicated).toEqual([]);
    });

    it('keeps the methods off the engines themselves', () => {
      const engine = Inputmask({ mask: '9' });
      const methods = Object.values(METHOD_GROUPS).flatMap((group) => Object.keys(group));

      expect(Object.keys(engine).filter((key) => methods.includes(key))).toEqual([]);
      expect(engine.getTests).toBe(Inputmask.prototype.getTests);
    });

    it('has the whole public API', () => {
      const prototype = Inputmask.prototype as unknown as Record<string, unknown>;

      PUBLIC_METHODS.forEach((method) => {
        expect(typeof prototype[method], method).toBe('function');
      });
    });

    it('keeps the public names for the public methods', () => {
      const publicGroup: Record<string, unknown> = { ...apiMethods, analyseMask: lexerMethods.analyseMask };
      const prototype = Inputmask.prototype as unknown as Record<string, unknown>;

      PUBLIC_METHODS.forEach((method) => {
        expect(prototype[method], method).toBe(publicGroup[method]);
      });
    });

    it('has the internal functions whose names the public API took', () => {
      expect(Inputmask.prototype.bindMask).toBe(maskBindingMethods.bindMask);
      expect(Inputmask.prototype.isValidPosition).toBe(validationMethods.isValidPosition);
      expect(Inputmask.prototype.isBufferComplete).toBe(validationMethods.isBufferComplete);
      expect(Inputmask.prototype.unmaskedValueOf).toBe(inputHandlingMethods.unmaskedValueOf);
      expect(Inputmask.prototype.createMaskToken).toBe(lexerMethods.createMaskToken);
      expect(Inputmask.prototype.eventRulerOn).toBe(eventRulerMethods.eventRulerOn);
      expect(Inputmask.prototype.eventRulerOff).toBe(eventRulerMethods.eventRulerOff);
    });

    it('has resolveAlias and importAttributeOptions', () => {
      expect(typeof Inputmask.prototype.resolveAlias).toBe('function');
      expect(typeof Inputmask.prototype.importAttributeOptions).toBe('function');
    });
  });

  describe('resolveAlias', () => {
    let restore: () => void;

    beforeEach(() => {
      restore = withAliases({
        base: { mask: '99-99', placeholder: '#', greedy: true },
        child: { alias: 'base', placeholder: '*', clearIncomplete: true },
        grandchild: { alias: 'child', greedy: false },
        withDefinitions: { mask: 'x', definitions: { x: { validator: '[0-9]' } } },
      });
    });

    afterEach(() => restore());

    it('merges the alias into the options and reports it was found', () => {
      const engine = Inputmask();
      const opts = extend(true, {}, defaults);

      expect(engine.resolveAlias('base', undefined, opts)).toBe(true);
      expect(opts).toMatchObject({ mask: '99-99', placeholder: '#', greedy: true });
    });

    it('applies the alias an alias builds on first', () => {
      const engine = Inputmask('grandchild');

      expect(engine.opts).toMatchObject({
        mask: '99-99', placeholder: '*', clearIncomplete: true, greedy: false,
      });
    });

    it('keeps the name of the alias the user asked for', () => {
      expect(Inputmask('grandchild').opts.alias).toBe('grandchild');

      // Without user options to reapply, the name of the parent alias stays.
      const opts = extend(true, {}, defaults);
      Inputmask().resolveAlias('grandchild', undefined, opts);
      expect(opts.alias).toBe('child');
    });

    it('reapplies the user options over the alias', () => {
      const engine = Inputmask('child', { placeholder: '_', mask: '9' });

      expect(engine.opts).toMatchObject({ alias: 'child', mask: '9', placeholder: '_', clearIncomplete: true });
    });

    it('does not reapply the user options for the parent alias', () => {
      // The child wins over the parent. The user options are applied once, after the child.
      const engine = Inputmask('child', { greedy: false });

      expect(engine.opts.greedy).toBe(false);
      expect(engine.opts.placeholder).toBe('*');
    });

    it('copies the alias, so engines do not share its nested objects', () => {
      const engine = Inputmask('withDefinitions');

      expect(engine.opts.definitions).toEqual({ x: { validator: '[0-9]' } });
      expect(engine.opts.definitions).not.toBe(Inputmask.prototype.aliases.withDefinitions.definitions);
    });

    it('takes an unknown alias as the mask and reports it was not found', () => {
      const engine = Inputmask();
      const opts = extend(true, {}, defaults);

      expect(engine.resolveAlias('999', undefined, opts)).toBe(false);
      expect(opts.mask).toBe('999');
    });

    it('leaves a mask that is already set alone', () => {
      const engine = Inputmask();
      const opts = extend(true, {}, defaults, { mask: 'aa' });

      expect(engine.resolveAlias('999', undefined, opts)).toBe(false);
      expect(opts.mask).toBe('aa');
    });

    it('finds names every object inherits, as Inputmask does', () => {
      // `aliases` is a plain object, so `constructor` and `toString` resolve to
      // functions and count as found. Nothing is merged and no mask is set.
      const engine = Inputmask('constructor');

      expect(engine.opts.alias).toBe('constructor');
      expect(engine.opts.mask).toBeNull();
    });
  });

  describe('importAttributeOptions', () => {
    it('reports how many options the user ends up with', () => {
      expect(importInto(createInput()).count).toBe(0);
      expect(importInto(createInput(), { mask: '99' }).count).toBe(1);
      expect(importInto(createInput('<input data-inputmask-mask="99">')).count).toBe(1);
      expect(importInto(createInput('<input data-inputmask-mask="99">'), { placeholder: '#' }).count).toBe(2);
    });

    it('reads one option per data-inputmask-* attribute', () => {
      const element = createInput(
        '<input data-inputmask-mask="99-99" data-inputmask-placeholder="x" data-inputmask-clearincomplete="true" data-inputmask-greedy="false">',
      );
      const { opts, userOptions } = importInto(element);

      expect(userOptions).toEqual({ mask: '99-99', placeholder: 'x', clearIncomplete: true, greedy: false });
      expect(opts).toMatchObject({ mask: '99-99', placeholder: 'x', clearIncomplete: true, greedy: false });
    });

    it('reads several options from the data-inputmask attribute', () => {
      const element = createInput("<input data-inputmask=\"'mask': '99/99', 'placeholder': '#', 'repeat': 3, 'greedy': true\">");
      const { opts } = importInto(element);

      expect(opts).toMatchObject({ mask: '99/99', placeholder: '#', repeat: 3, greedy: true });
    });

    it('matches the keys of data-inputmask whatever their case', () => {
      const element = createInput("<input data-inputmask=\"'MASK': '99', 'ClearIncomplete': true\">");
      const { opts, userOptions } = importInto(element);

      expect(userOptions).toEqual({ mask: '99', clearIncomplete: true });
      expect(opts).toMatchObject({ mask: '99', clearIncomplete: true });
    });

    it('prefers data-inputmask over a data-inputmask-* attribute', () => {
      const element = createInput("<input data-inputmask=\"'placeholder': 'j'\" data-inputmask-placeholder=\"a\">");

      expect(importInto(element, { mask: '99' }).opts.placeholder).toBe('j');
    });

    it('ignores the attribute of an option too when data-inputmask sets that option to null', () => {
      const element = createInput("<input data-inputmask=\"'placeholder': null\" data-inputmask-placeholder=\"a\">");

      expect(importInto(element, { mask: '99' }).opts.placeholder).toBe('_');
    });

    it('lets an attribute win over the option passed in code', () => {
      const element = createInput('<input data-inputmask-placeholder="x">');

      expect(importInto(element, { mask: '99', placeholder: 'y' }).opts.placeholder).toBe('x');
    });

    it('imports only options that exist, so the alias is resolved first', () => {
      const restore = withAliases({ custom: { mask: '99', extraOption: 'default' } as AliasDefinition });
      const withAlias = createInput('<input data-inputmask-alias="custom" data-inputmask-extraoption="imported">');
      const withoutAlias = createInput('<input data-inputmask-mask="99" data-inputmask-extraoption="imported">');

      const resolved = importInto(withAlias).opts as unknown as Record<string, unknown>;
      const plain = importInto(withoutAlias).opts as unknown as Record<string, unknown>;
      restore();

      expect(resolved.extraOption).toBe('imported');
      expect(plain.extraOption).toBeUndefined();
    });

    it('lets the alias attribute replace the alias passed in code', () => {
      const restore = withAliases({ fromCode: { mask: '11' }, fromAttribute: { mask: '22' } });
      const element = createInput('<input data-inputmask-alias="fromAttribute">');
      const { opts } = importInto(element, { alias: 'fromCode' });
      restore();

      expect(opts.alias).toBe('fromAttribute');
      expect(opts.mask).toBe('22');
    });

    it('unescapes doubled backslashes in a mask attribute', () => {
      const element = createInput('<input data-inputmask-mask="9\\\\9">');

      expect(importInto(element).opts.mask).toBe('9\\9');
    });

    it('resolves a callback attribute to the global function of that name', () => {
      const handler = vi.fn();
      vi.stubGlobal('maskCompleteHandler', handler);
      const element = createInput('<input data-inputmask-oncomplete="maskCompleteHandler">');
      const { opts } = importInto(element, { mask: '99' });
      vi.unstubAllGlobals();

      expect(opts.oncomplete).toBe(handler);
    });

    it('keeps the default callback when the named global does not exist', () => {
      const element = createInput('<input data-inputmask-oncomplete="noSuchHandler">');
      const { opts, userOptions, count } = importInto(element, { mask: '99' });

      expect(opts.oncomplete).toBe(defaults.oncomplete);
      expect('oncomplete' in userOptions).toBe(true);
      expect(count).toBe(2);
    });

    it('reads nothing from attributes when importDataAttributes is off', () => {
      const element = createInput("<input data-inputmask-mask=\"99-99\" data-inputmask=\"'placeholder': '#'\">");
      const { opts, userOptions } = importInto(element, { mask: '9', importDataAttributes: false });

      expect(opts.mask).toBe('9');
      expect(opts.placeholder).toBe('_');
      expect(userOptions).toEqual({ mask: '9', importDataAttributes: false });
    });

    it('uses the attribute prefix it is given', () => {
      const element = createInput('<input mask="99" data-inputmask-mask="11">');
      const engine = Inputmask({});
      const opts = extend(true, {}, engine.opts);
      engine.importAttributeOptions(element, opts, {}, '');

      expect(opts.mask).toBe('99');
    });

    it('throws on a data-inputmask attribute that is not valid JSON', () => {
      const element = createInput('<input data-inputmask="mask: 99">');

      expect(() => importInto(element)).toThrow(SyntaxError);
    });

    it('right-aligns the element for rightAlign', () => {
      const element = createInput();
      importInto(element, { mask: '99', rightAlign: true });

      expect(element.style.textAlign).toBe('right');
      expect(element.getAttribute('dir')).toBeNull();
    });

    it('turns dir="rtl" into an RTL mask on a left-to-right element', () => {
      const element = createInput('<input dir="rtl">');
      const { opts } = importInto(element, { mask: '99' });

      expect(opts.isRTL).toBe(true);
      expect(element.style.textAlign).toBe('right');
      expect(element.hasAttribute('dir')).toBe(false);
      expect(element.dir).toBe('');
    });

    it('marks numeric input as RTL and drops the dir attribute', () => {
      const element = createInput('<input dir="ltr">');
      const { opts } = importInto(element, { mask: '99', numericInput: true });

      expect(opts.isRTL).toBe(true);
      expect(element.hasAttribute('dir')).toBe(false);
      expect(element.style.textAlign).toBe('');
    });

    it('leaves a plain element alone', () => {
      const element = createInput();
      const { opts } = importInto(element, { mask: '99' });

      expect(opts.isRTL).toBeUndefined();
      expect(element.style.textAlign).toBe('');
      expect(element.hasAttribute('dir')).toBe(false);
    });

    it('works on a textarea', () => {
      const element = createInput('<textarea data-inputmask-mask="aa"></textarea>');

      expect(importInto(element).opts.mask).toBe('aa');
    });
  });

  describe('statics', () => {
    it('has every static of Inputmask', () => {
      [
        'extendDefaults', 'extendDefinitions', 'extendAliases',
        'format', 'unmask', 'isValid', 'remove', 'setValue',
      ].forEach((name) => {
        expect(typeof (Inputmask as unknown as Record<string, unknown>)[name], name).toBe('function');
      });
    });

    it('does not put itself on the window', () => {
      expect('Inputmask' in window).toBe(false);
    });

    describe('extendDefaults', () => {
      it('merges into the defaults new engines start from', () => {
        const original = defaults.placeholder;
        Inputmask.extendDefaults({ placeholder: '#' });
        const placeholder = Inputmask({ mask: '99' }).opts.placeholder;
        Inputmask.extendDefaults({ placeholder: original as string });

        expect(placeholder).toBe('#');
        expect(Inputmask({ mask: '99' }).opts.placeholder).toBe('_');
      });
    });

    describe('extendDefinitions', () => {
      afterEach(() => {
        delete Inputmask.prototype.definitions.Z;
      });

      it('adds a symbol to the shared definitions', () => {
        Inputmask.extendDefinitions({ Z: { validator: '[zZ]', casing: 'upper' } });

        expect(definitions.Z).toEqual({ validator: '[zZ]', casing: 'upper' });
      });

      it('merges into a symbol that already exists', () => {
        Inputmask.extendDefinitions({ Z: { validator: '[zZ]' } });
        Inputmask.extendDefinitions({ Z: { casing: 'lower' } });

        expect(definitions.Z).toEqual({ validator: '[zZ]', casing: 'lower' });
      });

      it('copies the definition, so later changes to the argument do not leak in', () => {
        const definition = { validator: '[zZ]' };
        Inputmask.extendDefinitions({ Z: definition });
        definition.validator = '[changed]';

        expect(definitions.Z.validator).toBe('[zZ]');
      });
    });

    describe('extendAliases', () => {
      it('registers an alias every engine can use', () => {
        const restore = withAliases({ zip: { mask: '99999-999' } });
        const engine = Inputmask('zip');
        restore();

        expect(engine.opts.mask).toBe('99999-999');
        expect(engine.opts.alias).toBe('zip');
      });

      it('merges into an alias that already exists', () => {
        const restore = withAliases({ zip: { mask: '99999-999', placeholder: '_' } });
        Inputmask.extendAliases({ zip: { placeholder: '#' } });
        const alias = { ...Inputmask.prototype.aliases.zip };
        restore();

        expect(alias).toEqual({ mask: '99999-999', placeholder: '#' });
      });
    });

    describe('format, unmask and isValid', () => {
      it('formats through a throwaway engine built from the options', () => {
        const format = spyOnFormat().mockReturnValue('12-34');

        expect(Inputmask.format('1234', { mask: '99-99' })).toBe('12-34');
        expect(format).toHaveBeenCalledTimes(1);
        expect(format.mock.calls[0]).toEqual(['1234']);
        expect((format.mock.contexts[0] as Engine).opts.mask).toBe('99-99');
        expect((format.mock.contexts[0] as Engine).el).toBeUndefined();
      });

      it('asks for the metadata when told to', () => {
        const result = { value: '12-34', metadata: null };
        const format = spyOnFormat().mockReturnValue(result);

        expect(Inputmask.format('1234', { mask: '99-99' }, true)).toBe(result);
        expect(format.mock.calls[0]).toEqual(['1234', true]);
      });

      it('unmasks through a throwaway engine built from the options', () => {
        const unmask = vi.spyOn(Inputmask.prototype, 'unmaskedvalue').mockReturnValue('1234');

        expect(Inputmask.unmask('12-34', { mask: '99-99' })).toBe('1234');
        expect(unmask.mock.calls[0]).toEqual(['12-34']);
        expect((unmask.mock.contexts[0] as Engine).opts.mask).toBe('99-99');
      });

      it('validates through a throwaway engine built from the options', () => {
        const isValid = vi.spyOn(Inputmask.prototype, 'isValid').mockReturnValue(true);

        expect(Inputmask.isValid('12-34', { mask: '99-99' })).toBe(true);
        expect(isValid.mock.calls[0]).toEqual(['12-34']);
        expect((isValid.mock.contexts[0] as Engine).opts.mask).toBe('99-99');
      });

      it('works without options', () => {
        const format = spyOnFormat().mockReturnValue('x');

        expect(Inputmask.format('x')).toBe('x');
        expect((format.mock.contexts[0] as Engine).opts.mask).toBeNull();
      });
    });

    describe('remove', () => {
      it('removes the mask of one element', () => {
        const { element, remove } = maskedInput();
        Inputmask.remove(element);

        expect(remove).toHaveBeenCalledTimes(1);
      });

      it('removes the mask of every element in a list', () => {
        const first = maskedInput();
        const second = maskedInput();
        Inputmask.remove([first.element, second.element]);

        expect(first.remove).toHaveBeenCalledTimes(1);
        expect(second.remove).toHaveBeenCalledTimes(1);
      });

      it('skips elements that have no mask', () => {
        const masked = maskedInput();

        expect(() => Inputmask.remove([createInput(), masked.element])).not.toThrow();
        expect(masked.remove).toHaveBeenCalledTimes(1);
      });

      it('takes a string as an id first', () => {
        const byId = maskedInput('<input id="target">');
        const byTag = maskedInput('<target></target>');
        Inputmask.remove('target');

        expect(byId.remove).toHaveBeenCalledTimes(1);
        expect(byTag.remove).not.toHaveBeenCalled();
      });

      it('takes a string that is no id as a selector', () => {
        const first = maskedInput('<input class="masked">');
        const second = maskedInput('<input class="masked">');
        const other = maskedInput('<input class="other">');
        Inputmask.remove('.masked');

        expect(first.remove).toHaveBeenCalledTimes(1);
        expect(second.remove).toHaveBeenCalledTimes(1);
        expect(other.remove).not.toHaveBeenCalled();
      });

      it('takes a NodeList', () => {
        const first = maskedInput('<input class="masked">');
        Inputmask.remove(document.querySelectorAll<HTMLElement>('.masked'));

        expect(first.remove).toHaveBeenCalledTimes(1);
      });
    });

    describe('setValue', () => {
      it('goes through the mask of an element that has one', () => {
        const element = createInput();
        const setValue = vi.fn();
        element.inputmask = { setValue } as unknown as Engine;

        Inputmask.setValue(element, '1234');

        expect(setValue).toHaveBeenCalledWith('1234');
      });

      it('fires setvalue on an element that has no mask', () => {
        const element = createInput();
        const events: CustomEvent[] = [];
        element.addEventListener('setvalue', (e) => events.push(e as CustomEvent));

        Inputmask.setValue(element, '1234');

        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(CustomEvent);
        expect(events[0].detail).toEqual(['1234']);
        expect(events[0].bubbles).toBe(true);
      });

      it('handles every element of a list or selector', () => {
        const first = createInput('<input class="field">');
        const second = createInput('<input class="field">');
        const firstSet = vi.fn();
        const secondSet = vi.fn();
        first.inputmask = { setValue: firstSet } as unknown as Engine;
        second.inputmask = { setValue: secondSet } as unknown as Engine;

        Inputmask.setValue('.field', 'a');
        Inputmask.setValue([first, second], 'b');

        expect(firstSet.mock.calls).toEqual([['a'], ['b']]);
        expect(secondSet.mock.calls).toEqual([['a'], ['b']]);
      });

      it('throws for a list that has no forEach, as Inputmask does', () => {
        const host = document.createElement('div');
        host.innerHTML = '<input><input>';

        expect(() => Inputmask.setValue(host.children as unknown as ArrayLike<HTMLElement>, 'x')).toThrow(TypeError);
      });
    });
  });
});
