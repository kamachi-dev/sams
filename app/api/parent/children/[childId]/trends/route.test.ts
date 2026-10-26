import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';
import { NextRequest } from 'next/server';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET with view=daily returns child attendance trends', async () => {
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [{ id: 'stud_1' }] } as any) // childCheck
    .mockResolvedValueOnce({ rows: [{ id: 'stud_data_1' }] } as any) // student data check
    .mockResolvedValue({
      rows: [{ present: '5', late: '1', absent: '0' }]
    } as any); // daily counts (called 7 times)

  const req = new NextRequest('http://localhost/api/parent/children/stud_1/trends?view=daily');
  const params = Promise.resolve({ childId: 'stud_1' });

  const response = await GET(req, { params });
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toHaveLength(7);
  expect(json.data[0].present).toBe(5);
});

test('GET returns 404 when child is not owned by the parent', async () => {
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] } as any);

  const req = new NextRequest('http://localhost/api/parent/children/stud_1/trends?view=daily');
  const params = Promise.resolve({ childId: 'stud_1' });

  const response = await GET(req, { params });
  const json = await response.json();

  expect(response.status).toBe(404);
  expect(json.success).toBe(false);
});
