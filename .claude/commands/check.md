---
description: Run test, lint, and type-check for the published library
---

Run the full check suite for `packages/use-mask-input` and report failures concisely:

```
pnpm --filter=use-mask-input test && pnpm --filter=use-mask-input lint && pnpm --filter=use-mask-input type-check
```

If anything fails, show the failing output and fix it. Don't run the demo apps.
