export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  const body = (await res.json()) as { data: T };
  return body.data;
}
