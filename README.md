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
