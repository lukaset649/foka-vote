import type { NextFunction, Request, Response } from 'express';
import { notFound } from '../errors/app-error.js';

export function notFoundHandler(_request: Request, _response: Response, next: NextFunction): void {
  next(notFound());
}
