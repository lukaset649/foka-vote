import type { ErrorResponseBody } from '@foka-vote/shared';
import type { Response } from 'supertest';

export function errorCode(response: Response): string {
  return (response.body as ErrorResponseBody).error.code;
}
