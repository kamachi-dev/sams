import { POST, DELETE } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('POST adds students to course', async () => {
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] } as any);

  const formData = new FormData();
  formData.append('courseId', 's_1');
  formData.append('students', 'stud_1,stud_2');

  const req = new Request('http://localhost/api/courses/enrollments', {
    method: 'POST',
    body: formData,
  });

  const response = await POST(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data.enrolled).toBe(2);
});

test('DELETE removes student from course', async () => {
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] } as any);

  const formData = new FormData();
  formData.append('courseId', 's_1');
  formData.append('studentId', 'stud_1');

  const req = new Request('http://localhost/api/courses/enrollments', {
    method: 'DELETE',
    body: formData,
  });

  const response = await DELETE(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data.removed).toBe('stud_1');
});
