const TOKEN_KEY = 'arkon_token';

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8000/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    setToken(null);
    onUnauthorized?.();
    throw new ApiError(401, 'Sesión expirada. Inicie sesión nuevamente.');
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(', ');
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return request<T>(path, { ...options, headers });
}

/** Multipart uploads: do not set Content-Type so the browser adds the boundary. */
export async function apiFetchFormData<T>(path: string, formData: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', body: formData });
}

export function documentoFileUrl(id: string): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}/documentos/${id}/file`;
}

function parseContentDispositionFilename(header: string | null): string | undefined {
  if (!header) return undefined;
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1];
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Authenticated fetch returning a binary body (CSV, PDF, etc.). */
export async function apiFetchBlob(
  path: string,
  options: RequestInit = {},
): Promise<{ blob: Blob; filename?: string }> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    setToken(null);
    onUnauthorized?.();
    throw new ApiError(401, 'Sesión expirada. Inicie sesión nuevamente.');
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(', ');
    } catch {
      /* binary error body */
    }
    throw new ApiError(res.status, message);
  }

  const blob = await res.blob();
  return {
    blob,
    filename: parseContentDispositionFilename(res.headers.get('Content-Disposition')),
  };
}
