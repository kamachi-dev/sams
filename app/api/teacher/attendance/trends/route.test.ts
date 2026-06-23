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

  const req = new Request('http://localhost/api/teacher/attendance/trends');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(401);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Not authenticated');
});

test('GET returns daily attendance trends', async () => {
  // getAttendanceCounts is called 7 times (for 7 days)
  const mockRow = { present: '10', late: '2', absent: '1' };
  vi.spyOn(db, 'query').mockResolvedValue({ rows: [mockRow] } as any);

  const req = new Request('http://localhost/api/teacher/attendance/trends?view=daily');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toHaveLength(7);
  expect(json.data[0]).toEqual({
    day: expect.any(String),
    date: expect.any(String),
    present: 10,
    late: 2,
    absent: 1,
  });
});

test('GET returns weekly attendance trends', async () => {
  // getAttendanceCounts is called 4 times (for 4 weeks)
  const mockRow = { present: '40', late: '5', absent: '2' };
  vi.spyOn(db, 'query').mockResolvedValue({ rows: [mockRow] } as any);

  const req = new Request('http://localhost/api/teacher/attendance/trends?view=weekly');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toHaveLength(4);
  expect(json.data[0]).toEqual({
    week: 'Week 1',
    dateRange: expect.any(String),
    present: 40,
    late: 5,
    absent: 2,
  });
});

test('GET returns monthly attendance trends', async () => {
  // getAttendanceCounts is called 6 times (for 6 months)
  const mockRow = { present: '150', late: '15', absent: '8' };
  vi.spyOn(db, 'query').mockResolvedValue({ rows: [mockRow] } as any);

  const req = new Request('http://localhost/api/teacher/attendance/trends?view=monthly');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toHaveLength(6);
  expect(json.data[0]).toEqual({
    month: expect.any(String),
    fullMonth: expect.any(String),
    present: 150,
    late: 15,
    absent: 8,
    total: 173,
    attendanceRate: 86.7, // (150/173)*100 rounded to 1 decimal place
  });
});

test('GET returns quarterly attendance trends', async () => {
  // getAttendanceCounts is called 4 times (for 4 quarters)
  const mockRow = { present: '300', late: '20', absent: '10' };
  vi.spyOn(db, 'query').mockResolvedValue({ rows: [mockRow] } as any);

  const req = new Request('http://localhost/api/teacher/attendance/trends?view=quarterly');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toHaveLength(4);
  expect(json.data[0]).toEqual({
    name: 'Q1',
    label: 'Quarter 1 (1st Sem)',
    semester: '1st Semester',
    dateRange: expect.any(String),
    present: 300,
    late: 20,
    absent: 10,
  });
});

test('GET returns 400 on invalid view parameter', async () => {
  const req = new Request('http://localhost/api/teacher/attendance/trends?view=yearly');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(400);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Invalid view parameter');
});

test('GET returns 500 on database failure', async () => {
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('DB failure'));

  const req = new Request('http://localhost/api/teacher/attendance/trends?view=daily');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(500);
  expect(json.success).toBe(false);
  expect(json.error).toBe('DB failure');
});
