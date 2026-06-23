import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns student notifications list', async () => {
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [
      { id: '1', time: '2026-06-23T08:00:00Z', attendance: 2, confidence: 0.95, course_name: 'Science', prof_name: 'Mr. Smith' }
    ]
  } as any);

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data[0].type).toBe('late');
});
