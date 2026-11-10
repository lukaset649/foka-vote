import { NetworkError } from '../services/apiClient';

export type LoadError = 'network' | 'failed';

export function loadErrorFrom(err: unknown): LoadError {
  return err instanceof NetworkError ? 'network' : 'failed';
}
