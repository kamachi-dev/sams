import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET with view=daily returns student attendance trends', async () => {
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [{ id: 'stud_data_1' }] } as any) // student data check
    .mockResolvedValue({
      rows: [{ present: '5', late: '1', absent: '0' }]
    } as any); // daily counts (called 7 times)

  const req = new Request('http://localhost/api/student/attendance/trends?view=daily');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toHaveLength(7);
});
