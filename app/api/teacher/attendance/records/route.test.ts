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
});

test('GET returns 401 if teacher is not authenticated', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce(null);

  const req = new Request('http://localhost/api/teacher/attendance/records?course=sec_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(401);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Not authenticated');
});

test('GET returns 400 if course parameter is missing', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);

  const req = new Request('http://localhost/api/teacher/attendance/records');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(400);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Course parameter is required');
});

test('GET returns formatted attendance records for single date', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);

  const mockRows = [
    {
      id: 'stud_1',
      username: 'Alice Smith',
      email: 'alice@example.com',
      course_name: 'Science 10',
      attendance: 1, // Present
      created_at: '2026-06-23T08:15:00Z',
      confidence: 0.923,
    },
    {
      id: 'stud_2',
      username: 'Bob Jones',
      email: 'bob@example.com',
      course_name: 'Science 10',
      attendance: 2, // Late
      created_at: '2026-06-23T08:35:00Z',
      confidence: 0.85,
    },
    {
      id: 'stud_3',
      username: 'Charlie Brown',
      email: 'charlie@example.com',
      course_name: 'Science 10',
      attendance: 0, // Absent
      created_at: '2026-06-23T09:00:00Z',
      confidence: 0,
    },
    {
      id: 'stud_4',
      username: 'David Miller',
      email: 'david@example.com',
      course_name: 'Science 10',
      attendance: null, // No Record
      created_at: null,
      confidence: null,
    },
  ];

  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const req = new Request('http://localhost/api/teacher/attendance/records?course=sec_1&date=2026-06-23');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toHaveLength(4);

  expect(json.data[0]).toEqual(expect.objectContaining({
    id: 'stud_1',
    name: 'Alice Smith',
    status: 'Present',
    confidence: '92%',
  }));

  expect(json.data[1]).toEqual(expect.objectContaining({
    id: 'stud_2',
    name: 'Bob Jones',
    status: 'Late',
    confidence: '85%',
  }));

  expect(json.data[2]).toEqual(expect.objectContaining({
    id: 'stud_3',
    name: 'Charlie Brown',
    status: 'Absent',
    confidence: 'No Detection',
    time: '-',
  }));

  expect(json.data[3]).toEqual(expect.objectContaining({
    id: 'stud_4',
    name: 'David Miller',
    status: 'No Record',
    confidence: 'No Detection',
    time: '-',
  }));
});

test('GET returns formatted attendance records for date range', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);

  const mockRows = [
    {
      id: 'stud_1',
      username: 'Alice Smith',
      email: 'alice@example.com',
      course_name: 'Science 10',
      attendance: 1,
      created_at: '2026-06-23T08:15:00Z',
      confidence: 0.95,
    },
  ];

  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const req = new Request('http://localhost/api/teacher/attendance/records?course=sec_1&startDate=2026-06-20&endDate=2026-06-23');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toHaveLength(1);
  expect(json.data[0].name).toBe('Alice Smith');
});

test('GET returns 500 on database failure', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('Database error'));

  const req = new Request('http://localhost/api/teacher/attendance/records?course=sec_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(500);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Database error');
});
