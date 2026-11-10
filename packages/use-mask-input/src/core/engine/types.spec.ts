import { describe, expectTypeOf, it } from 'vitest';

import { defaults } from './defaults';
import Inputmask from './index';

import type { Options } from '../../types/inputmask.types';
import type { InputmaskFactory } from './Inputmask';
import type {
  AliasDefinition,
  CaretPosition,
  CommandObject,
  Engine,
  EventHandler,
  FormatResult,
  LastRequiredPosition,
  MaskedElement,
  MaskEvent,
  MaskPattern,
  MaskTest,
  MaskToken,
  MatchValidator,
  ResolvedOptions,
  TestMatch,
  UserOptions,
  ValidationResult,
  ValidPosition,
} from './types';

// These run in the type checker: `tsc --noEmit` is what fails when one breaks.
// Calls that would need a live engine sit in functions that are never invoked,
// so only their types are looked at.
describe('engine types', () => {
  describe('options', () => {
    it('has a resolved counterpart for every public option', () => {
      expectTypeOf<Exclude<keyof Options, keyof ResolvedOptions>>().toEqualTypeOf<never>();
    });

    it('accepts the public options and the resolved ones as user options', () => {
      expectTypeOf<Options>().toExtend<UserOptions>();
      expectTypeOf<ResolvedOptions>().toExtend<UserOptions>();
      expectTypeOf<Partial<ResolvedOptions>>().toExtend<UserOptions>();
    });

    it('types the defaults as resolved options', () => {
      expectTypeOf(defaults).toEqualTypeOf<ResolvedOptions>();
    });

    it('lets an alias override any option and name the alias it builds on', () => {
      expectTypeOf<{ alias: 'numeric'; digits: 2; prefix: '$ ' }>().toExtend<AliasDefinition>();
      expectTypeOf<AliasDefinition['alias']>().toEqualTypeOf<ResolvedOptions['alias'] | undefined>();
    });

    it('types each callback with the this it is called on', () => {
      expectTypeOf<ThisParameterType<ResolvedOptions['oncomplete']>>().toEqualTypeOf<MaskedElement>();
      expectTypeOf<ThisParameterType<ResolvedOptions['onincomplete']>>().toEqualTypeOf<MaskedElement>();
      expectTypeOf<ThisParameterType<ResolvedOptions['oncleared']>>().toEqualTypeOf<MaskedElement>();
      expectTypeOf<ThisParameterType<ResolvedOptions['onKeyDown']>>().toEqualTypeOf<MaskedElement>();
      expectTypeOf<ThisParameterType<ResolvedOptions['onKeyValidation']>>().toEqualTypeOf<MaskedElement>();
      expectTypeOf<ThisParameterType<NonNullable<ResolvedOptions['onBeforeMask']>>>().toEqualTypeOf<Engine>();
      expectTypeOf<ThisParameterType<NonNullable<ResolvedOptions['onBeforePaste']>>>().toEqualTypeOf<Engine>();
      expectTypeOf<ThisParameterType<NonNullable<ResolvedOptions['onBeforeWrite']>>>().toEqualTypeOf<Engine>();
      expectTypeOf<ThisParameterType<NonNullable<ResolvedOptions['preValidation']>>>().toEqualTypeOf<Engine>();
      expectTypeOf<ThisParameterType<NonNullable<ResolvedOptions['postValidation']>>>().toEqualTypeOf<Engine>();
      expectTypeOf<ThisParameterType<NonNullable<ResolvedOptions['onUnMask']>>>()
        .toEqualTypeOf<Engine | ResolvedOptions>();
      expectTypeOf<ThisParameterType<NonNullable<ResolvedOptions['isComplete']>>>()
        .toEqualTypeOf<ResolvedOptions>();
    });
  });

  describe('masks and tests', () => {
    it('tells a token from a test match by its matches', () => {
      expectTypeOf((node: MaskToken | TestMatch) => {
        if (node.matches !== undefined) {
          expectTypeOf(node).toEqualTypeOf<MaskToken>();
        } else {
          expectTypeOf(node).toEqualTypeOf<TestMatch>();
        }
        if (node.isQuantifier) expectTypeOf(node).toEqualTypeOf<MaskToken>();
        if (node.isOptional) expectTypeOf(node).toEqualTypeOf<MaskToken>();
        if (node.isAlternator) expectTypeOf(node).toEqualTypeOf<MaskToken>();
      }).toBeFunction();
    });

    it('lets the lexer clear the group flags on either kind of node', () => {
      expectTypeOf((node: MaskToken | TestMatch) => {
        const target = node;
        target.isGroup = false;
        target.alternatorGroup = false;
      }).toBeFunction();
    });

    it('lets the lexer read match fields off an entry that may be a token', () => {
      expectTypeOf((token: MaskToken) => {
        const previous = token.matches[0];
        expectTypeOf(previous.def).toEqualTypeOf<string | undefined>();
        expectTypeOf(previous.static).toEqualTypeOf<boolean | undefined>();
      }).toBeFunction();
    });

    it('accepts a regular expression as the validator of a match', () => {
      expectTypeOf<RegExp>().toExtend<MatchValidator>();
      expectTypeOf<TestMatch['fn']>().toEqualTypeOf<MatchValidator | null>();
    });

    it('requires input on a valid position and not on a test', () => {
      expectTypeOf<ValidPosition['input']>().toEqualTypeOf<string>();
      expectTypeOf<MaskTest['input']>().toEqualTypeOf<string | undefined>();
      expectTypeOf<ValidPosition>().toExtend<MaskTest>();
    });

    it('models a validation result as rejected, accepted or accepted with commands', () => {
      expectTypeOf<ValidationResult>().toEqualTypeOf<boolean | CommandObject>();
      expectTypeOf((result: ValidationResult) => {
        if (result === false || result === true) return undefined;
        expectTypeOf(result).toEqualTypeOf<CommandObject>();
        return result.pos;
      }).returns.toEqualTypeOf<number | undefined>();
    });
  });

  describe('elements and events', () => {
    it('treats a masked element as an HTML element that may carry an engine', () => {
      expectTypeOf<MaskedElement>().toExtend<HTMLElement>();
      expectTypeOf<MaskedElement['inputmask']>().toEqualTypeOf<Engine | undefined>();
      expectTypeOf<Engine['el']>().toEqualTypeOf<MaskedElement | undefined>();
    });

    it('accepts every DOM event as a mask event', () => {
      expectTypeOf<Event>().toExtend<MaskEvent>();
      expectTypeOf<KeyboardEvent>().toExtend<MaskEvent>();
      expectTypeOf<InputEvent>().toExtend<MaskEvent>();
      expectTypeOf<ClipboardEvent>().toExtend<MaskEvent>();
      expectTypeOf<FocusEvent>().toExtend<MaskEvent>();
      expectTypeOf<CustomEvent>().toExtend<MaskEvent>();
    });

    it('lets a listener take a mask event where the DOM expects a listener', () => {
      expectTypeOf<(e: MaskEvent) => unknown>().toExtend<EventListener>();
      expectTypeOf<MaskEvent['key']>().toEqualTypeOf<string | undefined>();
      expectTypeOf<MaskEvent['data']>().toEqualTypeOf<string | null | undefined>();
    });

    it('binds each handler of the engine through the ruler as it is', () => {
      expectTypeOf((engine: Engine, el: MaskedElement) => {
        engine.eventRulerOn(el, 'keydown', engine.keyEvent);
        engine.eventRulerOn(el, 'input', engine.inputFallBackEvent);
        engine.eventRulerOn(el, 'paste', engine.pasteEvent);
        engine.eventRulerOn(el, 'cut', engine.cutEvent);
        engine.eventRulerOn(el, 'setvalue', engine.setValueEvent);
        engine.eventRulerOn(el, 'focus', engine.focusEvent);
        engine.eventRulerOn(el, 'blur', engine.blurEvent);
        engine.eventRulerOn(el, 'click', engine.clickEvent);
        engine.eventRulerOn(el, 'invalid', engine.invalidEvent);
        engine.eventRulerOn(el, 'mouseenter', engine.mouseenterEvent);
        engine.eventRulerOn(el, 'mouseleave', engine.mouseleaveEvent);
        engine.eventRulerOn(el, 'submit', engine.submitEvent);
        engine.eventRulerOn(el, 'reset', engine.resetEvent);
      }).toBeFunction();
    });

    it('binds a user callback once it is wrapped to run on the element', () => {
      expectTypeOf((engine: Engine, el: MaskedElement) => {
        const { oncomplete } = engine.opts;
        engine.eventRulerOn(el, 'complete', function complete(this: Engine, e: Event) {
          return oncomplete.call(el, e);
        });
      }).toBeFunction();
      expectTypeOf<EventHandler<KeyboardEvent>>().toEqualTypeOf<(this: Engine, e: KeyboardEvent) => unknown>();
    });
  });

  describe('engine', () => {
    it('answers caret with a position when reading and with nothing when writing', () => {
      expectTypeOf((engine: Engine, el: MaskedElement) => {
        expectTypeOf(engine.caret(el)).toEqualTypeOf<CaretPosition>();
        expectTypeOf(engine.caret(el, undefined, undefined, true)).toEqualTypeOf<CaretPosition>();
        expectTypeOf(engine.caret(el, 3)).toBeVoid();
        expectTypeOf(engine.caret(el, 1, 4, true)).toBeVoid();
        expectTypeOf(engine.caret(el, { begin: 1, end: 4 })).toBeVoid();
        expectTypeOf(engine.caret(el, [1, 4])).toBeVoid();
      }).toBeFunction();
    });

    it('answers determineLastRequiredPosition by what was asked for', () => {
      expectTypeOf((engine: Engine) => {
        expectTypeOf(engine.determineLastRequiredPosition()).toEqualTypeOf<number>();
        expectTypeOf(engine.determineLastRequiredPosition(true)).toEqualTypeOf<LastRequiredPosition>();
      }).toBeFunction();
    });

    it('answers getPlaceholder with a string unless a missing placeholder may come back', () => {
      expectTypeOf((engine: Engine, test: TestMatch) => {
        expectTypeOf(engine.getPlaceholder(0)).toEqualTypeOf<string>();
        expectTypeOf(engine.getPlaceholder(0, test)).toEqualTypeOf<string>();
        expectTypeOf(engine.getPlaceholder(0, test, true)).toEqualTypeOf<string | undefined>();
      }).toBeFunction();
    });

    it('keeps a position a number through translatePosition', () => {
      expectTypeOf((engine: Engine, maybe: number | undefined) => {
        expectTypeOf(engine.translatePosition(3)).toEqualTypeOf<number>();
        expectTypeOf(engine.translatePosition(maybe)).toEqualTypeOf<number | undefined>();
      }).toBeFunction();
    });

    it('types option by the name it is asked for', () => {
      expectTypeOf((engine: Engine, name: string) => {
        expectTypeOf(engine.option('placeholder')).toEqualTypeOf<ResolvedOptions['placeholder']>();
        expectTypeOf(engine.option('clearIncomplete')).toEqualTypeOf<boolean>();
        expectTypeOf(engine.option(name)).toEqualTypeOf<unknown>();
        expectTypeOf(engine.option({ placeholder: '#' })).toEqualTypeOf<Engine>();
        expectTypeOf(engine.option({ placeholder: '#' }, true)).toEqualTypeOf<Engine>();
      }).toBeFunction();
    });

    it('formats to a string, or to a value with metadata when asked', () => {
      expectTypeOf((engine: Engine) => {
        expectTypeOf(engine.format('1')).toEqualTypeOf<string>();
        expectTypeOf(engine.format('1', false)).toEqualTypeOf<string>();
        expectTypeOf(engine.format('1', true)).toEqualTypeOf<FormatResult>();
      }).toBeFunction();
      expectTypeOf<FormatResult['metadata']>().toEqualTypeOf<MaskPattern | null>();
    });

    it('has the public API of Inputmask', () => {
      expectTypeOf<Engine['mask']>().returns.toEqualTypeOf<Engine>();
      expectTypeOf<Engine['unmaskedvalue']>().returns.toEqualTypeOf<string | number>();
      expectTypeOf<Engine['remove']>().returns.toEqualTypeOf<MaskedElement | undefined>();
      expectTypeOf<Engine['getemptymask']>().returns.toEqualTypeOf<string>();
      expectTypeOf<Engine['hasMaskedValue']>().returns.toEqualTypeOf<boolean>();
      expectTypeOf<Engine['isComplete']>().returns.toEqualTypeOf<boolean | undefined>();
      expectTypeOf<Engine['getmetadata']>().returns.toEqualTypeOf<MaskPattern | null>();
      expectTypeOf<Engine['isValid']>().returns.toEqualTypeOf<boolean | undefined>();
      expectTypeOf<Engine['setValue']>().returns.toBeVoid();
      expectTypeOf<Engine['analyseMask']>().returns.toEqualTypeOf<MaskToken[]>();
    });

    it('reaches the factory from an engine', () => {
      expectTypeOf<Engine['Inputmask']>().toEqualTypeOf<InputmaskFactory>();
    });
  });

  describe('factory', () => {
    it('is typed as the factory', () => {
      expectTypeOf(Inputmask).toEqualTypeOf<InputmaskFactory>();
      expectTypeOf(Inputmask.prototype).toEqualTypeOf<Engine>();
    });

    it('creates an engine with or without new', () => {
      expectTypeOf(() => {
        expectTypeOf(Inputmask({ mask: '99' })).toEqualTypeOf<Engine>();
        expectTypeOf(new Inputmask('99')).toEqualTypeOf<Engine>();
        expectTypeOf(Inputmask('numeric', { digits: 2 })).toEqualTypeOf<Engine>();
        expectTypeOf(Inputmask(['99', '999'])).toEqualTypeOf<Engine>();
        expectTypeOf(Inputmask()).toEqualTypeOf<Engine>();
      }).toBeFunction();
    });

    it('takes the options the library builds today', () => {
      expectTypeOf((publicOptions: Options) => {
        expectTypeOf(Inputmask(publicOptions)).toEqualTypeOf<Engine>();
        expectTypeOf(Inputmask(publicOptions).mask(document.body)).toEqualTypeOf<Engine>();
        expectTypeOf(Inputmask.format('1', publicOptions)).toEqualTypeOf<string>();
        expectTypeOf(Inputmask.unmask('1', publicOptions)).toEqualTypeOf<string | number>();
        expectTypeOf(Inputmask.isValid('1', publicOptions)).toEqualTypeOf<boolean | undefined>();
      }).toBeFunction();
    });

    it('formats with metadata through the static too', () => {
      expectTypeOf(() => {
        expectTypeOf(Inputmask.format('1', { mask: '9' }, true)).toEqualTypeOf<FormatResult>();
        expectTypeOf(Inputmask.format('1')).toEqualTypeOf<string>();
      }).toBeFunction();
    });

    it('takes an element, a list or a selector in remove and setValue', () => {
      expectTypeOf(Inputmask.remove).toBeCallableWith('#id');
      expectTypeOf(Inputmask.remove).toBeCallableWith(document.createElement('input'));
      expectTypeOf(Inputmask.remove).toBeCallableWith(document.querySelectorAll<HTMLElement>('input'));
      expectTypeOf(Inputmask.setValue).toBeCallableWith([document.createElement('input')], 'value');
    });

    it('accepts an input, a textarea or any other element where the public API takes a target', () => {
      expectTypeOf<Engine['mask']>().toBeCallableWith(document.createElement('input'));
      expectTypeOf<Engine['mask']>().toBeCallableWith(document.createElement('textarea'));
      expectTypeOf<Engine['mask']>().toBeCallableWith(document.createElement('div'));
      expectTypeOf<Engine['mask']>().toBeCallableWith('#id');
    });
  });
});
