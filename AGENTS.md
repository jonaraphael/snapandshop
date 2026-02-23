# Repository Guidelines

## Project Structure & Module Organization
The app is a React + TypeScript PWA.

- `src/app`: app shell, routes, shared types, and Zustand store.
- `src/screens`: top-level pages (`Landing`, `Processing`, `List`, `Review`, `Capture`).
- `src/components`: reusable UI pieces (cards, rows, top bar, sheets, controls).
- `src/lib`: core logic grouped by domain (`parse`, `categorize`, `order`, `ocr`, `image`, `debug`).
- `src/workers/ocr.worker.ts`: OCR worker entrypoint.
- `src/test`: unit/integration tests; `src/test/e2e` contains Playwright tests.
- `public`: PWA/static assets; `docs/images/marketing`: README screenshots.
- `worker/src`: optional Cloudflare Worker proxy.

## Build, Test, and Development Commands
- `npm run dev`: start local Vite dev server.
- `npm run build`: TypeScript build + production bundle to `dist/`.
- `npm run preview`: preview the production build locally.
- `npm run test`: run Vitest once.
- `npm run test:watch`: run Vitest in watch mode.
- `npm run test:e2e`: run Playwright mobile-flow tests (auto-starts preview server).
- `npm run capture:marketing`: regenerate marketing screenshots.

## Coding Style & Naming Conventions
- TypeScript is strict (`strict`, `noUnusedLocals`, `noUnusedParameters` are enabled).
- Follow existing style: 2-space indentation, semicolons, and double quotes.
- Use `PascalCase` for React components/files; `camelCase` for functions/variables; `UPPER_SNAKE_CASE` for constants.
- Keep parsing, categorization, and ordering logic in `src/lib`, not in UI components.
- No dedicated lint/format config is committed; keep diffs focused and style-consistent.

## Testing Guidelines
- Frameworks: Vitest (`jsdom`) + Testing Library; Playwright for e2e.
- Test files: `src/test/**/*.test.ts` and `src/test/**/*.test.tsx`.
- Add or update tests when changing parsing, ordering, OCR/Magic Mode mapping, or list state behavior.
- Before opening a PR, run at least: `npm run test` and `npm run build`.
- No hard coverage threshold is enforced; maintain or improve coverage around changed logic.

## Commit & Pull Request Guidelines
- Current history uses short plain messages (for example: `pages again`, `clean up`, `name`).
- Prefer clearer imperative commit messages with scope (example: `fix: preserve model canonical item names`).
- Keep commits focused on one logical change.
- PRs should include:
  - What changed and why.
  - Test/build evidence (commands run).
  - Screenshots for UI changes (especially mobile list flow).
  - Linked issue/task when applicable.

## Security & Configuration Tips
- Never commit secrets. `.env` and `.env.local` are gitignored.
- Treat API keys as sensitive; do not log them in debug output.
- For GitHub Pages, preserve base-path handling in `.github/workflows/github-pages.yml`.
