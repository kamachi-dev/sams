import { POST, GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';
import { sendAttendanceUpdateEmail } from '@/lib/email-notifications';

vi.mock('@/lib/createAndNotify', () => ({
  createNotificationWithPush: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/email-notifications', () => ({
  sendAttendanceUpdateEmail: vi.fn().mockResolvedValue(true),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.POSTGRES_URL = 'postgres://test';
});

test('GET returns API live message', async () => {
  const response = await GET();
  const json = await response.json();
  expect(json.message).toBe('Camera attendance API is live');
});

test('POST records attendance detections', async () => {
  const mockClient = {
    query: vi.fn().mockResolvedValue({
      rows: [{ id: 'rec_1', student_id: 'stud_1', course_id: 'c_1', confidence: 0.95, detected_at: '2026-06-23T12:00:00Z' }],
    }),
    release: vi.fn(),
  };

  vi.spyOn(db, 'connect').mockResolvedValue(mockClient as any);

  const reqBody = {
    student: 'stud_1',
    course: 'c_1',
    attendance: 1,
    confidence: 0.95,
    timestamp: '2026-06-23T12:00:00Z',
  };

  const req = new Request('http://localhost/api/camera/attendance', {
    method: 'POST',
    body: JSON.stringify(reqBody),
  });

  const response = await POST(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.message).toContain('Detections registered');
  expect(mockClient.query).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO camera_session_detections'),
    ['c_1', 'stud_1', 0.95, '2026-06-23T12:00:00Z']
  );
  expect(sendAttendanceUpdateEmail).not.toHaveBeenCalled();
});
