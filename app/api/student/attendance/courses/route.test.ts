import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns student courses attendance list', async () => {
  const mockRows = [
    { course_id: 'c_1', course_name: 'Science', section_name: 'A', present: '10', late: '1', absent: '0', total_records: '11' }
  ];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data[0].course).toBe('Science');
  expect(json.data[0].percentage).toBe(90.9);
});
