# Web application skeleton

## Structure

```
src/
├─ pages/public/     9 public screens (contest list, contest, access gate, submission form/preview/confirmation, gallery, vote card/confirmation, results)
├─ pages/admin/      5 admin screens (login, contest list/form, submissions, submission edit)
├─ components/       shared UI (Layout — header + <Outlet />)
├─ routes.tsx        react-router route table, wraps all routes in Layout
├─ App.tsx           renders <RouterProvider>
└─ main.tsx          React DOM bootstrap
```

## Commands

- `npm run dev` — `vite --host 0.0.0.0`
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build
- `npm run typecheck` — `tsc --noEmit`

## PWA

- Config: `VitePWA` in `vite.config.ts` (manifest, Workbox `generateSW`, `registerType: 'prompt'`).
- Registration and update banner: `src/components/UpdatePrompt.tsx`, mounted in `Layout`.
- Precache: app shell only. `/api/*` and `/media/*` are never cached and bypass the SPA fallback.
- Icons: generated from `public/logo.svg` via `npm run generate-pwa-assets` (config: `pwa-assets.config.ts`).
- The service worker is disabled in dev. Test with `npm run build` + `npm run preview`, then unregister it in DevTools (Application) before going back to the dev server on the same port.
- Production nginx must send the cache headers from `deploy/nginx.conf` (`no-cache` for `sw.js`, manifest and `index.html`).
