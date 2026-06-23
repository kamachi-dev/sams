import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';
import { NextRequest } from 'next/server';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns course attendance for child if owned by parent', async () => {
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [{ id: 'stud_1' }] } as any) // childCheck
    .mockResolvedValueOnce({
      rows: [
        { course_name: 'Math', present_count: '10', late_count: '1', absent_count: '0', total_records: '11' }
      ]
    } as any);

  const req = new NextRequest('http://localhost/api/parent/children/stud_1/courses');
  const params = Promise.resolve({ childId: 'stud_1' });

  const response = await GET(req, { params });
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data[0].course).toBe('Math');
  expect(json.data[0].percentage).toBe(100);
});
