import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns student daily attendance', async () => {
  const mockRows = [
    { id: 'rec_1', time: '2026-06-23T08:00:00Z', attendance: 1, confidence: 0.98, course_name: 'Science', prof_name: 'Mr. Smith' }
  ];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data[0].status).toBe('Present');
});
