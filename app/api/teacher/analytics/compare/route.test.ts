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

  const req = new Request('http://localhost/api/teacher/analytics/compare?student=stud_1&course=c_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(401);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Not authenticated');
});

test('GET returns 400 if student or course parameter is missing', async () => {
  const req = new Request('http://localhost/api/teacher/analytics/compare?course=c_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(400);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Both student and course parameters are required');
});

test('GET returns comparative analytics successfully', async () => {
  // Mock DB results:
  // 1. studentResult
  const studentRow = {
    student_id: 'stud_1',
    student_name: 'Alice',
    course_name: 'Science 10',
    total_records: '10',
    present_count: '8',
    late_count: '1',
    absent_count: '1',
  };
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [studentRow] } as any);

  // 2. classResult
  const classRow = {
    total_records: '100',
    present_count: '70',
    late_count: '15',
    absent_count: '15',
    total_students: '10',
  };
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [classRow] } as any);

  // 3. monthlyStudentResult
  const monthlyStudentRows = [
    { month: 'Jun', month_num: 6, total: '5', present: '4', late: '1', absent: '0' },
  ];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: monthlyStudentRows } as any);

  // 4. monthlyClassResult
  const monthlyClassRows = [
    { month: 'Jun', month_num: 6, total: '50', present: '35', late: '10', absent: '5' },
  ];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: monthlyClassRows } as any);

  const req = new Request('http://localhost/api/teacher/analytics/compare?student=stud_1&course=c_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);

  const data = json.data;
  expect(data.student).toEqual({
    id: 'stud_1',
    name: 'Alice',
    courseName: 'Science 10',
    totalRecords: 10,
    present: 8,
    late: 1,
    absent: 1,
    attendanceRate: 80.0, // (8 / 10) * 100
  });

  expect(data.class).toEqual({
    totalStudents: 10,
    totalRecords: 100,
    present: 70,
    late: 15,
    absent: 15,
    attendanceRate: 70.0, // (70 / 100) * 100
  });

  expect(data.monthlyComparison).toEqual([
    {
      month: 'Jun',
      studentRate: 80.0, // (4 / 5) * 100
      classRate: 70.0,   // (35 / 50) * 100
    },
  ]);

  expect(data.comparison).toEqual({
    rateVsClass: '10.0', // 80 - 70 = 10
    status: 'above',
  });
});

test('GET returns 500 on database failure', async () => {
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('Database error'));

  const req = new Request('http://localhost/api/teacher/analytics/compare?student=stud_1&course=c_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(500);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Database error');
});
