import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiFetch,
  getToken,
  setToken,
  setUnauthorizedHandler,
} from './api-client';

describe('api-client 401 handling', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(() => {});
  });

  it('clears token, invokes unauthorized handler, and throws ApiError on 401', async () => {
    setToken('expired-token');
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 401, statusText: 'Unauthorized' }),
    );

    await expect(apiFetch('/auth/me')).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ApiError &&
        err.status === 401 &&
        err.message.includes('Sesion expirada'),
    );

    expect(getToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
  });
});
