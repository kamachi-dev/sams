import { GET, POST } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

vi.mock('@/lib/createAndNotify', () => ({
  createNotificationWithPush: vi.fn().mockResolvedValue(true),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns student appeals list', async () => {
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [
      { id: 1, record_id: 10, reason: 'Sick', status: 0, submitted_at: '2026-06-23T12:00:00Z', record_time: '2026-06-23T08:00:00Z', attendance: 2, course_name: 'Science', reviewer_name: null }
    ]
  } as any);

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data[0].reason).toBe('Sick');
  expect(json.data[0].recordedStatus).toBe('Late');
});

test('POST creates appeal for same-day late record', async () => {
  const nowStr = new Date().toISOString();
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({
      rows: [{ id: 10, student: 'user_123', course: 'c_1', attendance: 2, time: nowStr, section_id: 'sec_1', course_name: 'Science' }]
    } as any) // record check
    .mockResolvedValueOnce({ rows: [] } as any) // existing check
    .mockResolvedValueOnce({
      rows: [{ id: 5, record_id: 10, reason: 'Late bus', status: 0, submitted_at: nowStr }]
    } as any) // insert check
    .mockResolvedValueOnce({ rows: [{ teacher: 'teacher_1' }] } as any); // teacher check

  const req = new Request('http://localhost/api/student/appeals', {
    method: 'POST',
    body: JSON.stringify({ record_id: 10, student_reason: 'Late bus' }),
  });

  const response = await POST(req);
  const json = await response.json();

  expect(response.status).toBe(201);
  expect(json.success).toBe(true);
  expect(json.data.reason).toBe('Late bus');
  expect(json.data.status).toBe('pending');
});
