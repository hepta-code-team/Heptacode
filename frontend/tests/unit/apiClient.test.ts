import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../src/lib/apiClient';

describe('apiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends JSON requests and parses JSON responses', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'ok' }),
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.post('/example', { value: 1 })).resolves.toEqual({ id: 'ok' });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/example', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 1 }),
    });
  });

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn(),
    } as unknown as Response));

    await expect(apiClient.get('/empty')).resolves.toBeUndefined();
  });

  it('uses nested, direct and fallback error messages', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Nested error' } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Direct message' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.get('/nested')).rejects.toThrow('Nested error');
    await expect(apiClient.get('/direct')).rejects.toThrow('Direct message');
    await expect(apiClient.get('/invalid-json')).rejects.toThrow('API request failed with status 500');
  });
});

