# FOKA Vote
## Start lokalny z Dockerem

```bash
docker compose up --build
```

Po starcie:

- web: http://localhost:5173
- api: http://localhost:3000/api/health
- baza: localhost:5432

## Struktura

- `apps/web` - React + Vite
- `apps/api` - Express + TypeScript + Prisma
- `packages/shared` - współdzielone typy
