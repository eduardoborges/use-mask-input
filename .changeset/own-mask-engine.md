---
'use-mask-input': major
---

Replace the bundled Inputmask with the library's own mask engine. The package now has no runtime dependencies.

The engine is a TypeScript port of Inputmask 5.0.10-beta.61 and keeps its behaviour, quirks included. Over 1000 scenarios recorded from Inputmask replay against it in jsdom and in Chromium, and 32,000 random cases from a differential fuzzer gave the same result on both engines. Masks, aliases, options, callbacks and the public API are unchanged.

What can break:

- Importing the package no longer sets `window.Inputmask`. Code that reached the bundled copy through that global, for example to call `Inputmask.extendAliases`, has to pass those options to the mask instead.
- `el.inputmask` is now an instance of the new engine. It has the same methods (`unmaskedvalue`, `isComplete`, `remove`, `setValue`, `option` and the rest), but it is a different object.

The core chunk goes from 93.9 kB to 90.4 kB minified (29.4 kB to 29.1 kB gzip). Inputmask's MIT notice ships in `src/core/engine/LICENSE`.
