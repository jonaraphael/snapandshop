# snapand.shop Product Spec and Build Contract

## 1. Product Intent

Snap&Shop is a mobile-first web app at snapand.shop that turns a photographed shopping list into an aisle-ordered checklist in seconds.

### Core Promise
- User gives a photo or gallery image.
- App extracts items.
- App normalizes and deduplicates items.
- App categorizes items into grocery sections.
- App renders sections ordered by likely store adjacency.
- User checks off items quickly with one hand.

## 2. Primary User Flow

1. Landing (`/`):
- Primary actions: `Take a photo`, `Choose a photo`.
- Secondary actions: `Type it instead`, `Text size`, `Privacy`.

2. Capture (`/capture`):
- Image preview.
- Rotate.
- Optional auto-crop.
- Continue to processing.

3. Processing (`/processing`):
- Step progress UI:
  - Preparing image
  - Reading text
  - Organizing aisles
- Never leaves user blocked; if fail, user can return and type.

4. Review (`/review`):
- Editable extracted item rows.
- Add/delete.
- Low-confidence path: `Re-run (Magic Mode)`.
- Build checklist.

5. List (`/list`):
- Ordered section cards.
- Checkable rows with large targets.
- `Aa` text-size control.
- Section completion micro celebration.

## 3. Functional Requirements

- FR-1: Mobile capture and gallery upload supported.
- FR-2: Local OCR default path.
- FR-3: OCR confidence score is deterministic.
- FR-4: OCR lines parse bullets, checkboxes, numbers, comma-separated lists.
- FR-5: Quantity and notes extraction supported.
- FR-6: Name normalization includes OCR typo corrections and singularization.
- FR-7: Duplicate normalized items merge quantity and notes.
- FR-8: Category assignment uses exact dictionary, token rules, and fuzzy fallback.
- FR-9: Category sections ordered by adjacency.
- FR-10: Text size setting persists to local storage.
- FR-11: Checklist state persists to local storage.
- FR-12: Privacy default is on-device processing.
- FR-13: Magic Mode explicitly discloses external image processing path.

## 4. Non-Functional Requirements

- NFR-1: First render should remain lightweight (lazy OCR path).
- NFR-2: Processing UI updates immediately on OCR progress.
- NFR-3: No single failure blocks completion.
- NFR-4: `prefers-reduced-motion` disables confetti and motion-heavy effects.
- NFR-5: Inputs and checkboxes use 44px+ touch targets.

## 5. Architecture

## 5.1 Frontend
- Stack:
  - React + TypeScript + Vite
  - Zustand for app/session/prefs state
  - Vite PWA plugin
- Routing:
  - `Landing`, `Capture`, `Processing`, `Review`, `List`

## 5.2 OCR Pipeline (default, no backend)
- Image load.
- EXIF orientation normalization.
- Downscale for OCR budget.
- Preprocess grayscale + threshold.
- OCR in dedicated worker.
- Parse/normalize/dedupe/categorize/order in main thread.

## 5.3 Optional Magic Mode
- Trigger:
  - OCR confidence < 0.55
  - User manually triggers
  - Sparse extraction suspiciousness
- Contract:
  - OpenAI Responses API
  - Strict JSON schema output
- Modes:
  - BYO API key (client direct)
  - Worker proxy (`/api/vision-parse`)

## 5.4 Deployment
- Cheapest default:
  - Static deploy to Cloudflare Pages
  - Zero required backend infra
- Optional Worker proxy:
  - Cloudflare Worker with `OPENAI_API_KEY` secret

## 6. Data Model

### Category IDs (ordered)
`produce`, `bakery`, `deli`, `meat_seafood`, `dairy_eggs`, `frozen`, `pantry`, `snacks`, `beverages`, `household`, `personal_care`, `pet`, `other`

### ShoppingItem
- `id`
- `rawText`
- `canonicalName`
- `normalizedName`
- `quantity`
- `notes`
- `categoryId`
- `subcategoryId`
- `orderHint`
- `checked`
- `confidence`
- `source` (`ocr`, `magic`, `manual`)
- `categoryOverridden`

### Session
- `id`
- timestamps
- image hash + thumbnail only
- OCR data and confidence
- current item list

### Preferences
- font scale
- reduced motion
- high contrast
- magic mode defaults
- BYO API key (optional)

## 7. Categorization Engine

Order of operations:
1. Exact dictionary from `vocab.json`
2. Token rules for broad classes
3. Fuzzy synonym matching
4. Unknown -> `other`

Confidence:
- 1.0 exact
- 0.8 fuzzy
- 0.6 token-rule
- 0.3 unknown

## 8. OCR Confidence Formula

Input: OCR metadata (`wordCount`, `meanConfidence`, `lineCount`, `garbageLineRatio`)

Scoring:
- +0.3 if `wordCount >= 8`
- +0.2 if `meanConfidence >= 0.70`
- +0.2 if `lineCount >= 5`
- -0.3 if `garbageLineRatio > 0.40`
- clamp to [0, 1]

## 9. UI/UX Requirements

- One-handed interaction priority.
- Section cards visually distinct and readable.
- Large typography support with persistent slider.
- Completion delight:
  - Section `Done!`
  - confetti burst (unless reduced motion)
  - optional haptic vibrate

## 10. Security and Privacy

- Default processing on-device.
- No account required.
- If Magic Mode runs, inform user image leaves device.
- Worker proxy stores API key in environment secret only.

## 11. Testing

Unit:
- parsing rules
- quantity extraction
- dedupe merge
- categorization exact/rule/fuzzy
- ordering section and item sort

Golden fixtures:
- `testdata/golden-fixtures.json` with 20 scenarios

E2E:
- typed item flow to checklist
- text-size persistence
- section completion visual completion state

## 12. Definition of Done

- App can be used start-to-finish from mobile browser with no login.
- User can complete list entirely after OCR or manual correction.
- Section order matches canonical adjacency ordering.
- Text size persists across reload.
- Section completion celebration fires when section becomes complete.
- Unit tests pass.
- Build succeeds in static mode.
