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

  const req = new Request('http://localhost/api/teacher/attendance/summary');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(401);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Not authenticated');
});

test('GET returns attendance summary without course filter', async () => {
  const mockRow = {
    present_count: '150',
    late_count: '25',
    explicit_absent_count: '10',
  };

  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [mockRow] } as any);

  const req = new Request('http://localhost/api/teacher/attendance/summary');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toEqual({
    present: 150,
    late: 25,
    absent: 10,
    total: 185,
    attendanceRate: 81.08, // (150 / 185) * 100
  });
});

test('GET returns attendance summary with course filter', async () => {
  const mockRow = {
    present_count: '40',
    late_count: '5',
    explicit_absent_count: '5',
  };

  const querySpy = vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [mockRow] } as any);

  const req = new Request('http://localhost/api/teacher/attendance/summary?course=sec_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toEqual({
    present: 40,
    late: 5,
    absent: 5,
    total: 50,
    attendanceRate: 80.0,
  });

  // Verify it queried with course filter
  expect(querySpy).toHaveBeenCalledWith(
    expect.stringContaining('s.id = $2'),
    ['teacher_123', 'sec_1']
  );
});

test('GET returns 500 on database failure', async () => {
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('Database error'));

  const req = new Request('http://localhost/api/teacher/attendance/summary');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(500);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Database error');
});
