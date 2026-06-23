import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET with missing studentId returns 400', async () => {
  const req = new Request('http://localhost/api/student/schedule');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(400);
  expect(json.success).toBe(false);
});

test('GET returns student enrolled courses and schedules', async () => {
  const mockRows = [{ id: 'sec_1', name: 'Science', section_name: 'A', schedule: '{}' }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const req = new Request('http://localhost/api/student/schedule?studentId=stud_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockRows);
});
