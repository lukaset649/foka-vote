# FOKA Vote

Internal tool for a photography club's contests: anonymous submissions, weighted 3/2/1 voting, public results. Easy access without accounts or login.

## Local start with Docker

```bash
docker compose up --build
```

After startup:

- web: http://localhost:5173
- api: http://localhost:3000/api/health
- database: localhost:5432

## Local start without Docker

```bash
npm install
docker compose up -d db   # or point DATABASE_URL at your own Postgres
npm run dev:api           # terminal 1
npm run dev:web           # terminal 2
```

## Commands

- `npm run dev:api` / `npm run dev:web` — start a single app in dev mode
- `npm run build` — build all workspaces (`shared` → `api` → `web`)
- `npm run typecheck` — typecheck all workspaces
- `npm run lint` / `npm run lint:fix` — ESLint over the whole repo
- `npm run format` / `npm run format:check` — Prettier over the whole repo

## Structure

npm workspaces monorepo:

- `apps/web` - React + Vite ([details](apps/web/README.md))
- `apps/api` - Express + TypeScript + Prisma ([details](apps/api/README.md))
- `packages/shared` - types shared between `web` and `api`

## Environment variables

Copy `.env.example` to `.env` and adjust as needed. `.env` is git-ignored.

| Variable       | Required | Default                 | Meaning                                 |
| -------------- | -------- | ----------------------- | --------------------------------------- |
| `NODE_ENV`     | no       | `development`           | `development` \| `production` \| `test` |
| `PORT`         | no       | `3000`                  | API listen port                         |
| `HOST`         | no       | `127.0.0.1`             | API listen host                         |
| `WEB_ORIGIN`   | no       | `http://localhost:5173` | Allowed CORS origin for the web app     |
| `LOG_LEVEL`    | no       | `info`                  | `debug` \| `info` \| `warn` \| `error`  |
| `DATABASE_URL` | **yes**  | —                       | PostgreSQL connection string            |
| `VITE_API_URL` | no       | `http://localhost:3000` | API base URL used by the web app        |
