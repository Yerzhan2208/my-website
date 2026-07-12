# AGENTS.md

## Overview

React 19 + Vite 8 SPA — personal portfolio site with a hub of client-side productivity apps (to-do, calendar, pomodoro, notes, PDF tools, etc.). No backend; all state persists to localStorage.

## Commands

```bash
npm run dev       # Vite dev server (HMR)
npm run build     # Production build to dist/
npm run preview   # Serve production build locally
```

No test, lint, typecheck, or formatter configured. No CI.

## Tech Stack

- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (not the old PostCSS config). Custom theme vars are in `src/index.css` under `@theme {}`.
- **react-router-dom v7** for client routing.
- **lucide-react** for icons.
- **pdf-lib** + **pdfjs-dist** for client-side PDF operations.
- **react-markdown** for markdown rendering.

## Architecture

```
src/
  main.jsx            # Entry — BrowserRouter + PinnedAppsProvider
  App.jsx             # Route definitions
  layout/
    AppShell.jsx      # Sidebar + <Outlet> wrapper for all routes
    Sidebar.jsx       # Navigation sidebar with pinned apps
  components/
    HomePage.jsx      # Portfolio landing page
    AppsHub.jsx       # App grid with pin/unpin controls
  apps/
    registry.js       # Central registry — add new apps here
    *.jsx             # One component per app
  context/
    PinnedAppsContext.jsx   # Pin state persisted to localStorage
  hooks/
    useLocalStorage.js      # Generic localStorage hook
```

## Adding a New App

1. Create `src/apps/YourApp.jsx` (single component, self-contained).
2. Import it in `src/apps/registry.js` and add an entry with `id`, `name`, `description`, `icon` (lucide component), `color`, `component`, and `path`.
3. The route is auto-generated from the registry — no need to touch `App.jsx`.

## Conventions

- **Dark-only theme.** No light mode. Background is `zinc-950`.
- All app state is stored in **localStorage** via `useLocalStorage` or `PinnedAppsContext`. Do not introduce server calls or backend dependencies.
- Use the `.card` and `.glass` CSS utility classes for consistent card styling (defined in `src/index.css`).
- Use the `.stagger-children` class + `.animate-fade-in` for entrance animations (also in `src/index.css`).
- Accent color is purple (`--color-accent: #6d5dfc`). Access via `var(--color-accent)` in styles or Tailwind's arbitrary value syntax.
- Each app is a single `.jsx` file — keep them self-contained with their own state. Share only cross-app state (like pinned status) through context.
