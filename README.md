# ChoppingList.store

Mobile-first PWA that turns a shopping-list photo into a categorized, aisle-ordered checklist.

## Stack

- React + TypeScript + Vite
- Zustand state store
- Web Worker OCR (Tesseract.js)
- Deterministic parse/categorize/order pipeline
- Optional OpenAI Magic Mode (BYO key or Worker proxy)
- PWA support via `vite-plugin-pwa`

## Quick Start

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run test:e2e
```

## Product Spec

See `docs/ChoppingList_Product_Spec.md`.

## Screenshots (iPhone)

<p>
  <img src="docs/images/marketing/01-home-recent-lists.png" alt="Home with recent lists" width="240" />
  <img src="docs/images/marketing/02-list-checklist.png" alt="Checklist view" width="240" />
  <img src="docs/images/marketing/03-list-show-picture.png" alt="Original picture sheet" width="240" />
  <img src="docs/images/marketing/04-review-edit.png" alt="Edit list screen" width="240" />
</p>

## Architecture Notes

- Default mode is static-only deployment: all OCR/parsing runs client-side.
- Session and preferences persist to localStorage (`cl:lastSession`, `cl:prefs`).
- Optional proxy endpoint exists in `worker/src/index.ts` for secure server-side OpenAI key handling.

## Cloudflare Deployment

Static deploy:

```bash
npm run build
npx wrangler pages deploy dist --project-name=choppinglist
```

Optional Worker proxy:

```bash
cd worker
npx wrangler deploy
```

## GitHub Pages Deployment

This repo can also deploy to GitHub Pages via Actions.

1. Push to `main` (or run the `Deploy GitHub Pages` workflow manually).
2. In your GitHub repo settings, set Pages source to `GitHub Actions`.
3. Site URL will be:
   `https://<your-username>.github.io/<repo-name>/`

Notes:
- The workflow file is `.github/workflows/github-pages.yml`.
- It auto-resolves `VITE_BASE_PATH`:
  - `/<repo-name>/` for project pages
  - `/` for `<owner>.github.io` repos or when `CNAME` exists
  - optional override via repo variable `PAGES_BASE_PATH`
- SPA fallback is enabled by copying `dist/index.html` to `dist/404.html`.
