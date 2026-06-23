import { GET, POST } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns active school year', async () => {
  const mockRows = [{ active_school_year: '1' }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const response = await GET();
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockRows);
});

test('POST updates active school year', async () => {
  const mockRows = [{ active_school_year: '1' }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const formData = new FormData();
  formData.append('id', '1');

  const req = new Request('http://localhost/api/archive/active', {
    method: 'POST',
    body: formData,
  });

  const response = await POST(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockRows);
});
