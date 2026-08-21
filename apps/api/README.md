# API — application skeleton


## Structure

```
src/
├─ modules/<domain>/     routes.ts, controller.ts, service.ts — one domain, one folder
├─ routes.ts             aggregator, mounts each module under /api/<domain>
├─ middleware/           request-id, request-logger, not-found, error-handler
├─ errors/               error-code.ts, app-error.ts
├─ config/               env.ts — only place that reads process.env
├─ lib/                  logger.ts
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
