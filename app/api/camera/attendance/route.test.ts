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

test('POST records attendance and triggers notifications', async () => {
  const mockClient = {
    query: vi.fn().mockResolvedValue({
      rows: [{ id: 'rec_1', student: 'stud_1', course: 'c_1', attendance: 1, time: '2026-06-23T12:00:00Z' }],
    }),
    release: vi.fn(),
  };

  vi.spyOn(db, 'connect').mockResolvedValue(mockClient as any);
  vi.spyOn(db, 'query').mockImplementation((sql) => {
    if (sql.includes('SELECT c.name')) {
      return Promise.resolve({ rows: [{ course_name: 'Science', teacher: 't_1', student_name: 'Alice Cruz', teacher_name: 'Mr. Smith', classroom: 'Room 101', schedule: { tuesday: { start: '08:00', end: '09:00' } } }] });
    }
    return Promise.resolve({ rows: [] });
  });

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
  expect(sendAttendanceUpdateEmail).toHaveBeenCalledWith(expect.objectContaining({
    studentName: 'Alice Cruz',
    courseName: 'Science',
    teacherName: 'Mr. Smith',
    roomId: 'Room 101',
    classTime: '08:00 – 09:00',
  }));
});
