/**
 * Inputmask attaches its instance to the masked DOM element under the
 * `inputmask` property. The upstream `@types/inputmask` package only augments
 * the global `HTMLElement` from inside a module-scoped `declare global`, so the
 * augmentation is not picked up unless that module is imported by its bare name
 * (this project imports `inputmask/lib/inputmask.js` instead).
 *
 * Declaring it here, in an ambient script file included by tsconfig, makes the
 * property visible on the input elements we mask.
 */

interface InputmaskInstance {
  unmaskedvalue?: () => string;
}

interface HTMLInputElement {
  inputmask?: InputmaskInstance;
}

interface HTMLTextAreaElement {
  inputmask?: InputmaskInstance;
}
