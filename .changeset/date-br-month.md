---
'use-mask-input': patch
---

Fix the `date-br` alias reading the middle part of the date as minutes, which let `15/45/2024` pass as a complete date. The alias now uses `dd/MM/yyyy`, so the month can't go past 12, and dates like 31/04/2024 or 29/02/2023 are no longer valid. Typing a single month digit above 1 fills in the leading zero. Year prefill is off, so a two-digit year still counts as incomplete.
