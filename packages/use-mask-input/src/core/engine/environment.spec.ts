import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import type * as EnvironmentModule from './environment';

interface FakeNavigator {
  userAgent?: string;
  maxTouchPoints?: number;
  userAgentData?: { mobile?: boolean };
}

const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/142.0 Safari/537.36';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

/** Loads a fresh copy of the module, so each test reads the environment for the first time. */
async function loadEnvironment(): Promise<typeof EnvironmentModule> {
  vi.resetModules();
  return import('./environment');
}

function stubNavigator(navigator: FakeNavigator): void {
  vi.stubGlobal('navigator', navigator);
}

function removeTouchSupport(): void {
  delete (window as unknown as Record<string, unknown>).ontouchstart;
}

describe('environment', () => {
  // jsdom defines `ontouchstart` on the window, so it looks like a touch device.
  let touchDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    touchDescriptor = Object.getOwnPropertyDescriptor(window, 'ontouchstart');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (touchDescriptor) Object.defineProperty(window, 'ontouchstart', touchDescriptor);
  });

  it('reports a touch device under jsdom, which defines ontouchstart', async () => {
    const { environment } = await loadEnvironment();

    expect('ontouchstart' in window).toBe(true);
    expect(environment()).toEqual({ mobile: true, iphone: false });
  });

  it('reports a desktop when nothing points to touch', async () => {
    removeTouchSupport();
    stubNavigator({ userAgent: DESKTOP_UA, maxTouchPoints: 0 });
    const { environment } = await loadEnvironment();

    expect(environment()).toEqual({ mobile: false, iphone: false });
  });

  it('trusts userAgentData.mobile', async () => {
    removeTouchSupport();
    stubNavigator({ userAgent: DESKTOP_UA, maxTouchPoints: 0, userAgentData: { mobile: true } });
    const { environment } = await loadEnvironment();

    expect(environment().mobile).toBe(true);
  });

  it('falls back to maxTouchPoints when userAgentData says it is not mobile', async () => {
    removeTouchSupport();
    stubNavigator({ userAgent: DESKTOP_UA, maxTouchPoints: 5, userAgentData: { mobile: false } });
    const { environment } = await loadEnvironment();

    expect(environment().mobile).toBe(true);
  });

  it('falls back to ontouchstart when the navigator reports no touch points', async () => {
    stubNavigator({ userAgent: DESKTOP_UA, maxTouchPoints: 0 });
    const { environment } = await loadEnvironment();

    expect(environment().mobile).toBe(true);
  });

  it('always answers with booleans', async () => {
    removeTouchSupport();
    stubNavigator({ userAgent: DESKTOP_UA, maxTouchPoints: 5 });
    const { environment } = await loadEnvironment();

    expect(environment().mobile).toBe(true);
    expect(typeof environment().iphone).toBe('boolean');
  });

  it('detects an iPhone from the user agent, whatever its case', async () => {
    stubNavigator({ userAgent: IPHONE_UA, maxTouchPoints: 5 });
    expect((await loadEnvironment()).environment().iphone).toBe(true);

    stubNavigator({ userAgent: IPHONE_UA.toUpperCase(), maxTouchPoints: 5 });
    expect((await loadEnvironment()).environment().iphone).toBe(true);

    stubNavigator({ userAgent: DESKTOP_UA });
    expect((await loadEnvironment()).environment().iphone).toBe(false);
  });

  it('copes with a navigator that has no user agent', async () => {
    removeTouchSupport();
    stubNavigator({});
    const { environment } = await loadEnvironment();

    expect(environment()).toEqual({ mobile: false, iphone: false });
  });

  it('reads the environment once and keeps the answer', async () => {
    stubNavigator({ userAgent: IPHONE_UA, maxTouchPoints: 5 });
    const { environment } = await loadEnvironment();
    const first = environment();

    stubNavigator({ userAgent: DESKTOP_UA, maxTouchPoints: 0 });
    removeTouchSupport();

    expect(environment()).toBe(first);
    expect(environment()).toEqual({ mobile: true, iphone: true });
  });

  it('does not read anything until it is asked', async () => {
    const navigator = {
      get userAgent(): string { throw new Error('read at import'); },
    };
    vi.stubGlobal('navigator', navigator);

    await expect(loadEnvironment()).resolves.toBeDefined();
  });
});

describe('domWindow', () => {
  it('returns the window when there is a DOM', async () => {
    const { domWindow } = await loadEnvironment();

    expect(domWindow()).toBe(window);
  });

  it('is evaluated on every call, not cached', async () => {
    const { domWindow } = await loadEnvironment();
    expect(domWindow()).toBe(window);

    vi.stubGlobal('window', undefined);
    try {
      expect(domWindow()).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }

    expect(domWindow()).toBe(window);
  });

  it('returns undefined for a window without a document', async () => {
    const { domWindow } = await loadEnvironment();

    vi.stubGlobal('window', { navigator: {} });
    try {
      expect(domWindow()).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('activeElementOf', () => {
  let input: HTMLInputElement;
  let other: HTMLInputElement;

  beforeEach(() => {
    input = document.createElement('input');
    other = document.createElement('input');
    document.body.append(input, other);
  });

  afterEach(() => {
    input.remove();
    other.remove();
  });

  it('is the element itself while it has focus', async () => {
    const { activeElementOf } = await loadEnvironment();
    input.focus();

    expect(activeElementOf(input)).toBe(input);
  });

  it('is the element that has focus instead, when another one does', async () => {
    const { activeElementOf } = await loadEnvironment();
    other.focus();

    expect(activeElementOf(input)).toBe(other);
    expect(activeElementOf(input)).toBe(document.activeElement);
  });

  it('is the body when nothing has focus', async () => {
    const { activeElementOf } = await loadEnvironment();
    input.focus();
    input.blur();

    expect(activeElementOf(input)).toBe(document.body);
  });

  it('looks inside the shadow root the element lives in', async () => {
    const { activeElementOf } = await loadEnvironment();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('input');
    shadow.appendChild(inner);
    inner.focus();

    expect(activeElementOf(inner)).toBe(inner);
    expect(activeElementOf(inner)).toBe(shadow.activeElement);
    host.remove();
  });

  it('is undefined for an element that is not attached', async () => {
    const { activeElementOf } = await loadEnvironment();
    const detached = document.createElement('input');

    expect(activeElementOf(detached)).toBeUndefined();
  });
});
