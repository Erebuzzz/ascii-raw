# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

- **ascii-raw** (`artifacts/ascii-raw/`) — React + Vite web app at `/`. ASCII.RAW live camera-to-ASCII art scanner. Ported from Next.js (Vercel import). No backend required — fully client-side.
- **api-server** (`artifacts/api-server/`) — Express API server at `/api`. Scaffold only; not used by ascii-raw.
- **mockup-sandbox** (`artifacts/mockup-sandbox/`) — Design/mockup sandbox at `/__mockup`.

## App: ASCII.RAW // CAM_01

Live browser camera feed rendered as ASCII art in real-time using HTML5 Canvas.

### Key Features
- Real-time camera → ASCII rendering at 15fps
- Color modes: Monochrome, RGB Snapped, CMYK Snapped, True RGB
- Visual controls: Density, Texture (gamma), Brightness, Contrast, Bayer Dithering
- Typography controls: Kerning, Leading
- Custom character sets
- 4K PNG snapshot export via `html-to-image`
- WebM video recording via `MediaRecorder` + Canvas `captureStream`
- ASCII text export (clipboard copy + .txt download)
- Motion intensity meter
- Mirror toggle
- Keyboard shortcuts: Space (start), S (snapshot), R (record), Q (stop rec), C (copy), T (txt), D (dither toggle)
- Two pages: `/` (camera app) and `/docs` (documentation)

### Key Files
- `artifacts/ascii-raw/src/components/AsciiCamera.tsx` — main camera UI component
- `artifacts/ascii-raw/src/lib/ascii.ts` — ASCII rendering engine (LUT-based, Bayer dithering)
- `artifacts/ascii-raw/src/components/CustomTextOverlay.tsx` — text overlay for snapshots
- `artifacts/ascii-raw/src/components/Logo.tsx` — SVG logo
- `artifacts/ascii-raw/src/pages/DocsPage.tsx` — documentation page
- `artifacts/ascii-raw/src/index.css` — all styles (terminal dark theme, DotGothic16 font)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
