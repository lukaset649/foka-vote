# Web application

## Structure

```
src/
├─ pages/public/     14 public screens (contests, contest, access gate, submission form/preview/confirmation,
│                    contest gallery, vote card/confirmation, results, album list/album/gate/add photos)
├─ pages/admin/      8 admin screens (login, contest list/form, submissions, submission edit,
│                    album list/form, album photos)
├─ components/       shared UI (Layout, AdminNav, RequireAdmin, cards, RulesModal) plus `ui/` primitives
├─ services/         one module per API domain, every request goes through `apiClient`
├─ lib/              helpers and hooks (cn, errorMessage, useOnlineStatus, useInstallPrompt)
├─ i18n/             i18next config and the `pl` and `en` translation files
├─ routes.tsx        react-router route table, wraps all routes in Layout
├─ App.tsx           renders <RouterProvider>
└─ main.tsx          React DOM bootstrap
```

## Routes

Public:

| Path                                                               | Screen                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `/`                                                                | contest list                                               |
| `/contest/:slug`                                                   | contest page with the phase card                           |
| `/contest/:slug/gate`                                              | contest access code, returns to `?redirect=`               |
| `/contest/:slug/submit`, `/submit/preview`, `/submit/confirmation` | submission flow                                            |
| `/contest/:slug/gallery`                                           | contest gallery, `?from=gallery` returns to the album list |
| `/contest/:slug/vote`, `/vote/confirmation`                        | voting                                                     |
| `/contest/:slug/results`                                           | results                                                    |
| `/gallery`                                                         | album list, contest and standalone albums                  |
| `/gallery/:slug`                                                   | standalone album with a lightbox                           |
| `/gallery/:slug/gate`                                              | album access code, returns to `?redirect=`                 |
| `/gallery/:slug/add-photos`                                        | photo upload form, checks upload access on entry           |

Admin:

| Path                                                     | Screen          |
| -------------------------------------------------------- | --------------- |
| `/admin`, `/admin/login`                                 | login           |
| `/admin/contests`                                        | contest list    |
| `/admin/contests/new`, `/admin/contests/:id`             | contest form    |
| `/admin/contests/:id/submissions`                        | submissions     |
| `/admin/contests/:id/submissions/:submissionId`          | submission edit |
| `/admin/gallery`                                         | album list      |
| `/admin/gallery/albums/new`, `/admin/gallery/albums/:id` | album form      |
| `/admin/gallery/albums/:id/photos`                       | album photos    |

Everything past the login sits behind `RequireAdmin`. `AdminNav`, the panel's own section bar, is a layout route around the two list screens only; detail screens carry their own back link.

## Commands

- `npm run dev`: `vite --host 0.0.0.0`
- `npm run build`: production build to `dist/`
- `npm run preview`: preview the production build
- `npm run typecheck`: `tsc --noEmit`

## PWA

- Config: `VitePWA` in `vite.config.ts` (manifest, Workbox `generateSW`, `registerType: 'prompt'`).
- Registration and update banner: `src/components/UpdatePrompt.tsx`, mounted in `Layout`; checks for a new version every hour.
- Precache: app shell. `/api/*` and `/media/*` bypass the SPA fallback.
- Runtime caching (same-origin only, so production; responses with status 200 only):
  - `media-thumbs` / `media-previews`: `CacheFirst` for `/media/*-thumb.webp` (500 entries) and `/media/*-preview.webp` (150 entries), 30 days. Originals are not cached.
  - `api-v1`: `NetworkFirst` without timeout for public GETs (`/api/contests`, `/api/contests/:slug`, `.../submissions`, `.../results`, `/api/gallery/albums`, `/api/gallery/albums/:slug`), 60 entries, 7 days. Used only when the network fails; `OfflineBanner` warns the data may be stale. Everything else under `/api` (votes, admin) is never cached.
  - Bump `API_CACHE_NAME` in `vite.config.ts` when a public API response shape changes.
- Icons: generated from `public/logo.svg` via `npm run generate-pwa-assets` (config: `pwa-assets.config.ts`).
- The service worker is disabled in dev. Test it same-origin like production: `VITE_API_URL= npm run build` + `npm run preview` (port 4173, proxies `/api` and `/media` to `localhost:3000`). Unregister it in DevTools (Application) when done.
- Production nginx must send the cache headers from `deploy/nginx.conf` (`no-cache` for `sw.js`, manifest and `index.html`).
