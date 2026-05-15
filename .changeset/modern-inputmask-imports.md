---
"use-mask-input": patch
---

Import Inputmask from its ESM source modules instead of the default UMD entrypoint. This keeps the existing APIs and bundled dependency behavior while avoiding the legacy Inputmask build in published artifacts.

In a Next.js reproduction using `use-mask-input/antd`, the Inputmask client chunk dropped from 125.13 kB to 92.84 kB raw, 36.75 kB to 28.89 kB gzip, and 31.86 kB to 25.91 kB brotli. That is a final reduction of 32.29 kB raw, 7.86 kB gzip, and 5.96 kB brotli for the affected client chunk.

The modern build no longer includes the legacy UMD/polyfill patterns reported by Lighthouse, including `String.prototype.includes`, `Array.prototype.includes`, `Object.entries =`, `Cannot call a class as a function`, and `inputmask/dist/inputmask.js`.
