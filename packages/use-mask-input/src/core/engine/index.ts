/*! Mask engine ported from Inputmask, (c) 2010 - 2018 Robin Herbots, MIT license. See ./LICENSE. */
import Inputmask from './Inputmask';
import { registerAliases } from './aliases';

export type { InputmaskFactory, InputmaskStatics } from './Inputmask';
export type * from './types';

// The only side effect of importing the engine: the built-in aliases land on
// the prototype registries. Nothing here touches the DOM.
registerAliases(Inputmask);

export default Inputmask;
