import { isAxiosError } from 'axios';

export function getApiErrorMessage(err: unknown, fallback = 'Error inesperado'): string {
  if (!isAxiosError(err)) {
    return fallback;
  }
  const data = err.response?.data as { message?: string | string[] } | undefined;
  const msg = data?.message;
  if (Array.isArray(msg)) {
    return msg.join('. ');
  }
  if (typeof msg === 'string') {
    return msg;
  }
  return fallback;
}
