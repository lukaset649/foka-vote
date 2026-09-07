import type { TFunction } from 'i18next';
import { ApiError } from '../services/apiClient';

export function errorMessage(err: unknown, t: TFunction): string {
  if (err instanceof ApiError) {
    return t(`errors.${err.code}`, { defaultValue: t('errors.generic') });
  }
  return t('errors.generic');
}
