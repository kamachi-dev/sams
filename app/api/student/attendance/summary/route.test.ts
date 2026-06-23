import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns student attendance summary', async () => {
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({
      rows: [{ present_days: '10', late_days: '1', absent_days: '0', total_days: '11' }]
    } as any)
    .mockResolvedValueOnce({
      rows: [{ total_courses: '5' }]
    } as any);

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data.presentDays).toBe(10);
  expect(json.data.attendanceRate).toBe(90.91);
  expect(json.data.totalCourses).toBe(5);
});
