import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET with missing month/year returns 400', async () => {
  const req = new Request('http://localhost/api/student/attendance/sf2');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(400);
  expect(json.success).toBe(false);
});

test('GET returns SF2 attendance structure for student', async () => {
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [{ username: 'Jane', grade_level: 'Grade 10', section: 'A' }] } as any) // studentInfo
    .mockResolvedValueOnce({ rows: [{ id: 'sec_1', name: 'Science', section_name: 'A' }] } as any) // enrolledCourses
    .mockResolvedValueOnce({ rows: [{ course: 'sec_1', record_date: '2026-06-23', attendance: 1, confidence: 0.99 }] } as any) // records
    .mockResolvedValueOnce({ rows: [{ course_name: 'Science', time: '2026-06-23T08:00:00Z', attendance: 1, confidence: 0.99 }] } as any); // detectionLog

  const req = new Request('http://localhost/api/student/attendance/sf2?month=6&year=2026');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data.studentName).toBe('Jane');
  expect(json.data.courses[0].courseName).toBe('Science');
});
