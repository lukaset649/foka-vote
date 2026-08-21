import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'X-Request-Id';

export function requestId(request: Request, response: Response, next: NextFunction): void {
  const incoming = request.header(REQUEST_ID_HEADER);
  const id = incoming && incoming.length > 0 ? incoming : randomUUID();

  request.requestId = id;
  response.setHeader(REQUEST_ID_HEADER, id);

  next();
}
