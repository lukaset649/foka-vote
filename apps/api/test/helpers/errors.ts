import type { ErrorCode } from '@foka-vote/shared';
import { expect } from 'vitest';
import { AppError } from '../../src/errors/app-error.js';

export function expectAppError(action: () => unknown, statusCode: number, code: ErrorCode): void {
  let thrown: unknown;
  try {
    action();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(AppError);
  expect(thrown).toMatchObject({ statusCode, code });
}

export async function expectAppErrorAsync(
  action: Promise<unknown>,
  statusCode: number,
  code: ErrorCode,
): Promise<void> {
  const error: unknown = await action.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ statusCode, code });
}
