import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns student info', async () => {
  const mockRows = [{ username: 'Jane', email: 'jane@example.com', pfp: null, grade_level: 'Grade 10', section: 'A' }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data.username).toBe('Jane');
});
