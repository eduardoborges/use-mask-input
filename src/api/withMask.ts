import isServer from '../utils/isServer';
import { mask } from './mask';
import { Input, PatternOptions } from '../types';

export function withMask(maskString: string, options?: PatternOptions) {
  return (input: Input) => {
    //
    if (isServer()) return;
    if (mask === null) return;
    if (input === null) return;

    const unbind = mask(maskString, options).bind(input);

    // detect input unmount
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          if (unbind) unbind();
          observer.disconnect();
        }
      });
    });

    return input;
  };
}
