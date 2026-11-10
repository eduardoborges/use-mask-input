export interface Environment {
  /** True on a touch device. The test is rough: a laptop with a touch screen passes it too. */
  mobile: boolean;
  iphone: boolean;
}

interface NavigatorUAData {
  mobile?: boolean;
}

interface NavigatorWithUAData extends Navigator {
  userAgentData?: NavigatorUAData;
}

let detected: Environment | undefined;

/**
 * The global `window`, or `undefined` where there is no DOM to work with
 * (server rendering, workers).
 */
export function domWindow(): (Window & typeof globalThis) | undefined {
  const canUseDOM = typeof window !== 'undefined'
    && Boolean(window.document)
    && Boolean(window.document.createElement);

  return canUseDOM ? window : undefined;
}

/**
 * The focused element of the document or shadow root `element` lives in:
 * `element.getRootNode().activeElement`. It is `undefined` for an element that
 * is attached to neither, because its root is then a plain node.
 */
export function activeElementOf(element: Node): Element | null | undefined {
  const root: Node & Partial<DocumentOrShadowRoot> = element.getRootNode();

  return root.activeElement;
}

/**
 * What the engine needs to know about the device. It is read on the first
 * call and kept from then on. Nothing is read at import, so a server can load
 * the module.
 */
export function environment(): Environment {
  if (detected === undefined) {
    const view = domWindow();
    const nav: NavigatorWithUAData | undefined = view?.navigator;
    const userAgent = (nav && nav.userAgent) || '';

    detected = {
      mobile: Boolean(
        (nav && nav.userAgentData && nav.userAgentData.mobile)
        || (nav && nav.maxTouchPoints)
        || (view !== undefined && 'ontouchstart' in view),
      ),
      iphone: /iphone/i.test(userAgent),
    };
  }

  return detected;
}
