import React from 'react';
import { render, act } from '@testing-library/react';
import { DatabaseInitializer } from '../DatabaseInitializer';
import { expect, test, vi } from 'vitest';

test('calls /api/init on mount and handles success response', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, message: 'Database ready' }),
  });
  global.fetch = fetchMock;

  await act(async () => {
    render(<DatabaseInitializer />);
  });

  expect(fetchMock).toHaveBeenCalledWith('/api/init', {
    method: 'GET',
    cache: 'no-store',
  });
});

test('handles failure when fetch rejects or is not ok', async () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ success: false, error: 'Failed' }),
  });
  global.fetch = fetchMock;

  await act(async () => {
    render(<DatabaseInitializer />);
  });

  expect(fetchMock).toHaveBeenCalled();
  expect(warnSpy).toHaveBeenCalledWith('Database initialization returned non-200 status');

  warnSpy.mockRestore();
  errorSpy.mockRestore();
});
