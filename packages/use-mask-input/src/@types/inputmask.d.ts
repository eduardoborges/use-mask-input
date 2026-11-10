/**
 * The mask engine attaches itself to the masked element as its `inputmask`
 * property. Declaring it here, in an ambient script file the tsconfig
 * includes, makes the property visible on the input elements this library
 * masks.
 */

interface InputmaskInstance {
  unmaskedvalue?: () => string;
  /** True once every required mask position is filled; `undefined` for `repeat: '*'`. */
  isComplete?: () => boolean | undefined;
  /** Resolved configuration, after alias defaults are merged with user options. */
  opts?: Record<string, unknown>;
  /** Detaches the mask from its element. Used by the Vue directive on unmount. */
  remove?: () => void;
  /** Pushes a value through the engine's own validation and formatting. */
  setValue?: (value: string) => void;
}

interface HTMLInputElement {
  inputmask?: InputmaskInstance;
}

interface HTMLTextAreaElement {
  inputmask?: InputmaskInstance;
}
