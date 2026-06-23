import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';
import { NextRequest } from 'next/server';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns summary attendance count for child', async () => {
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [{ id: 'stud_1' }] } as any) // childCheck
    .mockResolvedValueOnce({
      rows: [
        { present_count: '15', late_count: '2', absent_count: '1', total_records: '18' }
      ]
    } as any)
    .mockResolvedValueOnce({
      rows: [{ count: '0' }]
    } as any); // yesterdayCheck

  const req = new NextRequest('http://localhost/api/parent/children/stud_1/summary');
  const params = Promise.resolve({ childId: 'stud_1' });

  const response = await GET(req, { params });
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data.present).toBe(15);
  expect(json.data.percentage).toBe(94.4);
  expect(json.data.absentYesterday).toBe(false);
});
