import { GET, POST, DELETE } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns courses list', async () => {
  const mockRows = [{ id: 's_1', name: 'Science', section_name: 'A' }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const response = await GET();
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockRows);
});

test('POST creates course and default section', async () => {
  const querySpy = vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [{ active_school_year: 'sy_1' }] } as any) // meta
    .mockResolvedValueOnce({ rows: [{ id: 'c_1', name: 'Math' }] } as any) // course
    .mockResolvedValueOnce({ rows: [{ id: 's_1', name: 'Math', schedule: null, teacher: 't_1', classroom: 'Room A' }] } as any); // section

  const formData = new FormData();
  formData.append('name', 'Math');
  formData.append('teacher', 't_1');
  formData.append('classroom', 'Room A');
  formData.append('schedule', '{"monday": {"start": "08:00", "end": "09:15"}}');

  const req = new Request('http://localhost/api/courses', {
    method: 'POST',
    body: formData,
  });

  const response = await POST(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data.id).toBe('c_1');
  expect(querySpy).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO section'),
    ['Math', '{"monday": {"start": "08:00", "end": "09:15"}}', 'c_1', 't_1', 'Room A']
  );
});

test('DELETE removes course and dependencies', async () => {
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [] } as any) // enrollment_data
    .mockResolvedValueOnce({ rows: [] } as any) // record
    .mockResolvedValueOnce({ rows: [] } as any) // course_models
    .mockResolvedValueOnce({ rows: [] } as any) // section
    .mockResolvedValueOnce({ rows: [{ id: 'c_1', name: 'Math' }] } as any); // course

  const formData = new FormData();
  formData.append('id', 'c_1');

  const req = new Request('http://localhost/api/courses', {
    method: 'DELETE',
    body: formData,
  });

  const response = await DELETE(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data.id).toBe('c_1');
});
