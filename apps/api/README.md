# API: application skeleton

## Structure

```
prisma/
├─ schema.prisma         data model (Contest, Submission, Artwork, VoteCard, VoteItem, Alias)
└─ migrations/           applied SQL migrations
src/
├─ modules/<domain>/     routes.ts, controller.ts, service.ts: one domain, one folder
├─ routes.ts             aggregator, mounts each module under /api/<domain>
├─ middleware/           request-id, request-logger, not-found, error-handler
├─ errors/               app-error.ts: AppError + factory helpers, ErrorCode/ErrorResponseBody come from @foka-vote/shared
├─ config/               env.ts: only place that reads process.env
├─ lib/                  logger.ts, prisma.ts: shared PrismaClient singleton
├─ types/                express.d.ts: extends Request with requestId
├─ app.ts                createApp(): Express factory, no listen()
└─ index.ts              server bootstrap, graceful shutdown
```

## Endpoints

Public:

| Method | Path                                                 | Notes                                                   |
| ------ | ---------------------------------------------------- | ------------------------------------------------------- |
| GET    | `/api/health`                                        | liveness plus a live database check                     |
| GET    | `/api/contests`                                      | all contests                                            |
| GET    | `/api/contests/:slug`                                | open, no code needed                                    |
| POST   | `/api/contests/:slug/access`                         | verifies the contest code, sets a signed cookie         |
| GET    | `/api/contests/:slug/submissions`                    | open; `403` until the submission phase ends             |
| POST   | `/api/contests/:slug/submissions`                    | multipart; needs the contest code                       |
| POST   | `/api/contests/:slug/submissions/alias-reservations` | needs the contest code                                  |
| GET    | `/api/contests/:slug/votes/me`                       | needs the contest code                                  |
| POST   | `/api/contests/:slug/votes`                          | needs the contest code                                  |
| GET    | `/api/contests/:slug/results`                        | open                                                    |
| GET    | `/api/gallery/albums`                                | contest and standalone albums in one list               |
| GET    | `/api/gallery/albums/:slug`                          | returns `hasAccessCode` and `canUpload`, never the code |
| POST   | `/api/gallery/albums/:slug/access`                   | verifies the album code, sets a signed cookie           |
| POST   | `/api/gallery/albums/:slug/photos`                   | multipart; needs the album code when the album has one  |

Admin (`/api/admin`, everything past `/login` and `/logout` requires the session cookie):

| Method             | Path                                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| POST               | `/login`, `/logout`                                                          |
| GET                | `/me`                                                                        |
| GET, POST          | `/contests`                                                                  |
| GET, PATCH, DELETE | `/contests/:id`                                                              |
| GET                | `/contests/:contestId/submissions`                                           |
| GET, PATCH, DELETE | `/contests/:contestId/submissions/:submissionId`                             |
| PATCH              | `/contests/:contestId/submissions/:submissionId/artworks/order`              |
| POST               | `/contests/:contestId/submissions/:submissionId/artworks/:artworkId/replace` |
| PATCH, DELETE      | `/contests/:contestId/submissions/:submissionId/artworks/:artworkId`         |
| GET                | `/contests/:contestId/vote-cards`                                            |
| POST               | `/contests/:contestId/vote-cards/:cardId/void`, `/unvoid`                    |
| GET, POST          | `/gallery/albums`                                                            |
| GET, PATCH, DELETE | `/gallery/albums/:id`                                                        |
| PATCH              | `/gallery/albums/:id/visibility`                                             |
| GET                | `/gallery/albums/:id/photos`                                                 |
| PATCH, DELETE      | `/gallery/albums/:id/photos/:photoId`                                        |
| PATCH              | `/gallery/contests/:contestId/visibility`                                    |

Deleting a contest, an album, a submission or a photo also removes the stored image files.

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

- `npm run dev`: `tsx watch src/index.ts`
- `npm run build`: compiles to `dist/`
- `npm run start`: `node dist/index.js`
- `npm run typecheck`: `tsc --noEmit`
- `npm run lint`: ESLint over `src/`
- `npm run prisma:generate`: regenerate the Prisma Client after a schema change
- `npm run prisma:migrate`: create and apply a migration (`prisma migrate dev`)

## Database

- Requires `DATABASE_URL` (PostgreSQL connection string), see `.env.example` at the repo root.
- `docker-compose.yml` provides a local `db` service (`docker compose up -d db`).
- `GET /api/health` reports `database: 'ok' | 'error'` based on a live connectivity check.
- A destructive migration cannot be created non-interactively: write the SQL by hand under `prisma/migrations/<timestamp>_<name>/migration.sql` and apply it with `prisma migrate deploy`.
