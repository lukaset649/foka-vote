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
