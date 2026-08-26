import type { Mask, Options } from '../types/mask';

export type { Mask, Options } from '../types/mask';

/** Object form of the directive binding, for when options are needed. */
export interface VueMaskConfig {
  mask: Mask;
  options?: Options;
}

/**
 * Everything `v-mask-input` accepts. A bare mask covers the common case;
 * the object form adds options.
 */
export type VueMaskBinding = Mask | VueMaskConfig;

/**
 * What Vue hands a `:ref` callback: a DOM element for a native tag, or the
 * component's public instance for a component. `$el` is typed loosely because
 * a fragment-root component exposes a text anchor node there, not an element.
 */
export type MaskRefTarget = Element | { $el?: unknown } | null;

export interface UseMaskInputReturn {
  /** Bind with `:ref="maskRef"`. */
  maskRef: (target: MaskRefTarget) => void;
  /**
   * Current unmasked value. Call this from event handlers and imperative code.
   *
   * NOT reactive: `{{ unmaskedValue() }}` in a template renders once and never
   * updates, because reading the DOM registers no reactive dependency. For a
   * value the template should track, bind `v-model` with `autoUnmask: true`.
   */
  unmaskedValue: () => string;
  /** Whether every required position of the mask is filled. Not reactive, same as `unmaskedValue`. */
  isComplete: () => boolean;
}
