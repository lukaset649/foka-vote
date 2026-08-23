# API — application skeleton


## Structure

```
prisma/
├─ schema.prisma         data model (Contest, Submission, Artwork, VoteCard, VoteItem, Alias)
└─ migrations/           applied SQL migrations
src/
├─ modules/<domain>/     routes.ts, controller.ts, service.ts — one domain, one folder
├─ routes.ts             aggregator, mounts each module under /api/<domain>
├─ middleware/           request-id, request-logger, not-found, error-handler
├─ errors/               app-error.ts — AppError + factory helpers, ErrorCode/ErrorResponseBody come from @foka-vote/shared
├─ config/               env.ts — only place that reads process.env
├─ lib/                  logger.ts, prisma.ts — shared PrismaClient singleton
├─ types/                express.d.ts — extends Request with requestId
├─ app.ts                createApp() — Express factory, no listen()
└─ index.ts              server bootstrap, graceful shutdown
```

## Error response contract

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": null,
    "requestId": "…"
  }
}
```

## Commands

- `npm run dev` — `tsx watch src/index.ts`
- `npm run build` — compiles to `dist/`
- `npm run start` — `node dist/index.js`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint over `src/`
- `npm run prisma:generate` — regenerate the Prisma Client after a schema change
- `npm run prisma:migrate` — create and apply a migration (`prisma migrate dev`)

## Database

- Requires `DATABASE_URL` (PostgreSQL connection string) — see `.env.example` at the repo root.
- `docker-compose.yml` provides a local `db` service (`docker compose up -d db`).
- `GET /api/health` reports `database: 'ok' | 'error'` based on a live connectivity check.
