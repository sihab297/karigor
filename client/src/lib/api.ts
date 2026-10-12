import { getToken } from './token-storage';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function api<T>(path: string, { method = 'GET', body }: RequestOptions = {}) {
  const token = getToken();
  // files go as FormData; the browser sets the content type itself
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined && !isForm && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    const devHint = import.meta.env.DEV
      ? ` (Dev: the API at ${API_URL} is not answering. Run npm run dev from the karigor folder and wait for "Karigor API running".)`
      : '';
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `Can't reach Karigor right now. Check your internet and try again.${devHint}`,
    );
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = json.error ?? {};
    throw new ApiError(
      res.status,
      error.code ?? 'SERVER_ERROR',
      error.message ?? 'Something went wrong. Please try again.',
      Array.isArray(error.details) ? error.details : [],
    );
  }
  return json.data as T;
}
