import type { AppType } from '@learninglab/api/app';
import { hc } from 'hono/client';

/**
 * End-to-end typed API client. Request/response types come straight from the
 * Hono routes in apps/api — change an endpoint there and TypeScript flags
 * every caller here.
 */
export const client = hc<AppType>('/');
export const api = client.api;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Turn a fetch Response into the success JSON (`T`) or throw an ApiError.
 * The response type is a union of every status the route can return
 * (e.g. 200 | 400 from validation), hence `json(): Promise<unknown>`.
 */
export async function unwrap<T>(res: { ok: boolean; status: number; json(): Promise<unknown> }): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  let code = 'HTTP_ERROR';
  let message = `Request failed with status ${res.status}`;
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    code = body.error?.code ?? code;
    message = body.error?.message ?? message;
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(res.status, code, message);
}
