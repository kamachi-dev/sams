import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET with no params returns list of courses', async () => {
  const mockRows = [{ id: 's_1', name: 'Science', section_name: 'A' }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const req = new Request('http://localhost/api/camera/courses');
  const response = await GET(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockRows);
});

test('GET with courseId returns detailed course info and students', async () => {
  const courseDetail = [{ id: 's_1', name: 'Science', section_name: 'A', course_start_time: '08:00', course_end_time: '09:00' }];
  const students = [{ id: 'stud_1', name: 'Alice', email: 'alice@example.com' }];

  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: courseDetail } as any)
    .mockResolvedValueOnce({ rows: students } as any);

  const req = new Request('http://localhost/api/camera/courses?courseId=s_1&day=monday');
  const response = await GET(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data.name).toBe('Science');
  expect(json.data.enrolled_students).toHaveLength(1);
});
