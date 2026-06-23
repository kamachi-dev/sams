import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';
import { currentUser } from '@clerk/nextjs/server';

vi.mock('@clerk/nextjs/server', () => {
  return {
    currentUser: vi.fn(),
  };
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(currentUser).mockResolvedValue({ id: 'teacher_123' } as any);
});

test('GET returns 401 if teacher is not authenticated', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce(null);

  const req = new Request('http://localhost/api/teacher/attendance/today');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(401);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Not authenticated');
});

test('GET returns today attendance without course filter', async () => {
  // 1. totalResult count query
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ total_students: '100' }],
  } as any);

  // 2. today attendance query
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ present_count: '80', late_count: '10', absent_count: '5' }],
  } as any);

  const req = new Request('http://localhost/api/teacher/attendance/today');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toEqual({
    present: 80,
    late: 10,
    absent: 5,
    total: 100,
    attendanceRate: 80.0, // (80 / 100) * 100
  });
});

test('GET returns today attendance with course filter', async () => {
  // 1. totalResult count query
  const totalSpy = vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ total_students: '40' }],
  } as any);

  // 2. today attendance query
  const attendanceSpy = vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ present_count: '35', late_count: '2', absent_count: '1' }],
  } as any);

  const req = new Request('http://localhost/api/teacher/attendance/today?course=sec_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toEqual({
    present: 35,
    late: 2,
    absent: 1,
    total: 40,
    attendanceRate: 87.5,
  });

  // Verify parameters
  expect(totalSpy).toHaveBeenCalledWith(expect.any(String), ['teacher_123', 'sec_1']);
  expect(attendanceSpy).toHaveBeenCalledWith(expect.any(String), [expect.any(String), 'teacher_123', 'sec_1']);
});

test('GET returns 500 on database failure', async () => {
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('Database error'));

  const req = new Request('http://localhost/api/teacher/attendance/today');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(500);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Database error');
});
