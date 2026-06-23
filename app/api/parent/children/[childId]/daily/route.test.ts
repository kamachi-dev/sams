import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';
import { NextRequest } from 'next/server';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns daily attendance records for child', async () => {
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [{ id: 'stud_1' }] } as any) // childCheck
    .mockResolvedValueOnce({
      rows: [
        { id: 'rec_1', time: '2026-06-23T08:00:00Z', attendance: 1, confidence: 0.98, course_name: 'Science', prof_name: 'Mr. Smith' }
      ]
    } as any);

  const req = new NextRequest('http://localhost/api/parent/children/stud_1/daily');
  const params = Promise.resolve({ childId: 'stud_1' });

  const response = await GET(req, { params });
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data[0].status).toBe('Present');
  expect(json.data[0].course).toBe('Science');
});
