/* eslint-disable import-x/no-extraneous-dependencies, import/no-unassigned-import */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Inputmask exposes this ESM file but not its subpath types in app builds.
import Inputmask from 'inputmask/lib/inputmask.js';

import 'inputmask/lib/extensions/inputmask.extensions.js';
import 'inputmask/lib/extensions/inputmask.date.extensions.js';
import 'inputmask/lib/extensions/inputmask.numeric.extensions.js';

export default Inputmask;
