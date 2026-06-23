import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns active teachers count', async () => {
  const mockCount = { count: '15' };
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [mockCount] } as any);

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data.count).toBe('15');
});

test('GET handles database error', async () => {
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('DB error'));

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200); // Next.js returns 200 containing error status inside JSON body for this route pattern
  expect(json.success).toBe(false);
  expect(json.error).toBe('Teacher count data could not be retrieved');
});
