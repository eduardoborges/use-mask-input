---
"use-mask-input": patch
---

fix: sync DOM value after react-hook-form `reset()` in `useHookFormMask`

`reset()` in react-hook-form clears its internal field registry before re-rendering. On the subsequent render it returns a new ref callback that, when called, syncs the DOM to the reset value. Because `useHookFormMask` caches a stable ref, React never calls that new callback — leaving masked inputs stale after `reset()`.

Fixed by using a `useLayoutEffect` queue that replays the latest RHF ref callback against the stored element after each render. RHF's own guard makes this a no-op on normal re-renders; it only does real work after `reset()` clears the registry.
