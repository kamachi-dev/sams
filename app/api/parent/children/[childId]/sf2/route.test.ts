import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';
import { NextRequest } from 'next/server';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns SF2 attendance structure for a child', async () => {
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [{ id: 'stud_1' }] } as any) // childCheck
    .mockResolvedValueOnce({ rows: [{ username: 'Jane', grade_level: 'Grade 10', section: 'A' }] } as any) // studentInfo
    .mockResolvedValueOnce({ rows: [{ id: 'sec_1', name: 'Science', section_name: 'A' }] } as any) // enrolledCourses
    .mockResolvedValueOnce({ rows: [{ course: 'sec_1', record_date: '2026-06-23', attendance: 1, confidence: 0.99 }] } as any) // records
    .mockResolvedValueOnce({ rows: [{ course_name: 'Science', time: '2026-06-23T08:00:00Z', attendance: 1, confidence: 0.99 }] } as any); // detectionLog

  const req = new NextRequest('http://localhost/api/parent/children/stud_1/sf2?month=6&year=2026');
  const params = Promise.resolve({ childId: 'stud_1' });

  const response = await GET(req, { params });
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data.studentName).toBe('Jane');
  expect(json.data.courses[0].courseName).toBe('Science');
});

test('GET returns 404 when child is not owned by the parent', async () => {
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] } as any);

  const req = new NextRequest('http://localhost/api/parent/children/stud_1/sf2?month=6&year=2026');
  const params = Promise.resolve({ childId: 'stud_1' });

  const response = await GET(req, { params });
  const json = await response.json();

  expect(response.status).toBe(404);
  expect(json.success).toBe(false);
});
