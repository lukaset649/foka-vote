import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'X-Request-Id';
const MAX_REQUEST_ID_LENGTH = 128;
const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]+$/;

function isValidRequestId(value: string): boolean {
  return value.length <= MAX_REQUEST_ID_LENGTH && SAFE_REQUEST_ID.test(value);
}

export function requestId(request: Request, response: Response, next: NextFunction): void {
  const incoming = request.header(REQUEST_ID_HEADER);
  const id = incoming && isValidRequestId(incoming) ? incoming : randomUUID();

  request.requestId = id;
  response.setHeader(REQUEST_ID_HEADER, id);

  next();
}
