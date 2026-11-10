// @vitest-environment node
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

describe('engine on a server', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('runs where there is no DOM at all', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    expect(typeof HTMLElement).toBe('undefined');
  });

  it('imports without throwing', async () => {
    await expect(import('./index')).resolves.toBeDefined();
  });

  it.each([
    './Inputmask', './types', './defaults', './definitions', './keys', './escapeRegex', './extend',
    './environment', './events', './aliases', './aliases/base', './aliases/numeric',
    './aliases/datetime', './methods/api', './methods/lexer', './methods/tests',
    './methods/positioning', './methods/validation', './methods/inputHandling',
    './methods/eventHandlers', './methods/eventRuler', './methods/mask',
  ])('imports %s on its own without throwing', async (path) => {
    await expect(import(/* @vite-ignore */ path)).resolves.toBeDefined();
  });

  it('exports a factory with the registries filled in', async () => {
    const { default: Inputmask } = await import('./index');

    expect(typeof Inputmask).toBe('function');
    expect(typeof Inputmask.prototype.aliases).toBe('object');
    expect(typeof Inputmask.prototype.definitions).toBe('object');
    expect(Inputmask.prototype.defaults.placeholder).toBe('_');
    expect(Object.keys(Inputmask.prototype.definitions)).toEqual(expect.arrayContaining(['9', 'a', '*']));
  });

  it('creates an engine and resolves its options', async () => {
    const { default: Inputmask } = await import('./index');
    Inputmask.extendAliases({ serverSample: { mask: '99-99', placeholder: '#' } });

    const engine = Inputmask('serverSample', { clearIncomplete: true });

    expect(engine).toBeInstanceOf(Inputmask);
    expect(engine.opts).toMatchObject({ mask: '99-99', placeholder: '#', clearIncomplete: true });
    expect(engine.el).toBeUndefined();
    expect(engine.isRTL).toBe(false);
  });

  it('reports no touch device and no iPhone', async () => {
    const { environment, domWindow } = await import('./environment');

    expect(domWindow()).toBeUndefined();
    expect(environment()).toEqual({ mobile: false, iphone: false });
  });

  it('builds the events the engine replays keys with from the global Event', async () => {
    const { createEvent } = await import('./events');
    const event: Event & { key?: string } = createEvent('_checkval');
    event.key = '1';

    expect(event).toBeInstanceOf(Event);
    expect(event.constructor).toBe(Event);
    expect(event.type).toBe('_checkval');
    expect(event.key).toBe('1');
    expect(() => event.preventDefault()).not.toThrow();
  });

  it('ignores event calls that have no element to work on', async () => {
    const { on, off, trigger } = await import('./events');

    expect(() => {
      on(undefined, 'click', () => {});
      off(undefined, '.inputmask');
      trigger(undefined, 'change');
      trigger(null, 'setvalue', ['value']);
    }).not.toThrow();
  });
});
