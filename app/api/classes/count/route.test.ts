import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns total course counts', async () => {
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [{ count: '15' }] } as any);

  const response = await GET();
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data.count).toBe('15');
});
