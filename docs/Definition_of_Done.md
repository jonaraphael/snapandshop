# snapand.shop Definition of Done

1. User can complete flow from landing to checklist on mobile.
2. App accepts camera capture and gallery upload.
3. OCR extraction runs in worker and returns editable items.
4. Parse pipeline handles bullets, checkboxes, numbered lines, and comma-split lines.
5. Quantities and notes are extracted when present.
6. Deduplication merges repeated items.
7. Categorization and section ordering follow canonical adjacency order.
8. Checklist supports check/uncheck and persistence after refresh.
9. Text-size slider changes app scale and persists.
10. Section completion triggers celebration (or reduced-motion fallback).
11. Magic Mode runs with strict JSON schema and can replace OCR output.
12. Privacy disclosure appears when Magic Mode is offered.
13. Unit test suite covers parsing, categorization, ordering, dedupe.
14. E2E test suite covers typed flow and text-size persistence.
15. Static build succeeds and can be deployed to Cloudflare Pages.
