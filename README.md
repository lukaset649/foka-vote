# FOKA Vote

## Local start with Docker

```bash
docker compose up --build
```

After startup:

- web: http://localhost:5173
- api: http://localhost:3000/api/health
- database: localhost:5432

## Structure

- `apps/web` - React + Vite
- `apps/api` - Express + TypeScript + Prisma
- `packages/shared` - shared types

## Environment variables

Copy `.env.example` to `.env` and adjust as needed. `.env` is git-ignored.

| Variable       | Required | Default                                                             | Meaning                          |
| -------------- | -------- | -------------------------------------------------------------------- | --------------------------------- |
| `NODE_ENV`     | no       | `development`                                                        | `development` \| `production` \| `test` |
| `PORT`         | no       | `3000`                                                                | API listen port                   |
| `HOST`         | no       | `127.0.0.1`                                                           | API listen host                   |
| `WEB_ORIGIN`   | no       | `http://localhost:5173`                                               | Allowed CORS origin for the web app |
| `LOG_LEVEL`    | no       | `info`                                                                | `debug` \| `info` \| `warn` \| `error` |
| `DATABASE_URL` | **yes**  | —                                                                      | PostgreSQL connection string      |
| `VITE_API_URL` | no       | `http://localhost:3000`                                               | API base URL used by the web app  |
