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

  const req = new Request('http://localhost/api/teacher/students/low-attendance');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(401);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Not authenticated');
});

test('GET returns students below default threshold (50%)', async () => {
  const mockRows = [
    {
      student_id: 'stud_1',
      student_name: 'John Low',
      student_email: 'john@example.com',
      course_id: 'c_1',
      course_name: 'Science',
      section_id: 'sec_1',
      student_section: 'Section A',
      total_records: '10',
      present_count: '3',
      late_count: '2',
      absent_count: '5',
      attendance_rate: '30.0',
    },
  ];

  const querySpy = vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const req = new Request('http://localhost/api/teacher/students/low-attendance');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.threshold).toBe(50);
  expect(json.data).toHaveLength(1);
  expect(json.data[0]).toEqual({
    id: 'stud_1',
    name: 'John Low',
    email: 'john@example.com',
    courseId: 'c_1',
    courseName: 'Science',
    sectionId: 'sec_1',
    section: 'Section A',
    totalRecords: 10,
    presentCount: 3,
    lateCount: 2,
    absentCount: 5,
    attendanceRate: 30.0,
  });

  // Verify threshold param was passed to query
  expect(querySpy).toHaveBeenCalledWith(
    expect.stringContaining('$2'),
    [ 'teacher_123', 50 ]
  );
});

test('GET handles custom threshold and filters', async () => {
  const querySpy = vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] } as any);

  const req = new Request('http://localhost/api/teacher/students/low-attendance?course=c_1&section=Section A&threshold=75');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.threshold).toBe(75);

  // Verify parameters passed: teacher_id, courseFilter, sectionFilter, threshold
  expect(querySpy).toHaveBeenCalledWith(
    expect.any(String),
    [ 'teacher_123', 'c_1', 'Section A', 75 ]
  );
});

test('GET returns 500 on database failure', async () => {
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('Database error'));

  const req = new Request('http://localhost/api/teacher/students/low-attendance');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(500);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Database error');
});
