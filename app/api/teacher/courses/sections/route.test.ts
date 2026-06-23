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

  const req = new Request('http://localhost/api/teacher/courses/sections?course=c_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(401);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Not authenticated');
});

test('GET returns 400 if course parameter is missing', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);

  const req = new Request('http://localhost/api/teacher/courses/sections');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(400);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Course parameter is required');
});

test('GET returns 404 if course not found or not assigned to teacher', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] } as any); // courseCheck

  const req = new Request('http://localhost/api/teacher/courses/sections?course=c_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(404);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Course not found or not assigned to you');
});

test('GET returns sibling sections and grouped sorted students', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);

  // 1. courseCheck mock
  const courseCheckRow = { id: 'c_1', parent_course_id: 'parent_1', name: 'Science' };

  // 2. sibling sections result
  const siblingSectionsRows = [
    { section_id: 'sec_1', section: 'Section A', schedule: 'MW 9am', student_count: '2' },
    { section_id: 'sec_2', section: 'Section B', schedule: 'TTh 10am', student_count: '1' },
  ];

  // 3. students result
  const studentRows = [
    { section: 'Section A', name: 'Charlie' },
    { section: 'Section A', name: 'Alice' },
    { section: 'Section B', name: 'Bob' },
  ];

  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [courseCheckRow] } as any)
    .mockResolvedValueOnce({ rows: siblingSectionsRows } as any)
    .mockResolvedValueOnce({ rows: studentRows } as any);

  const req = new Request('http://localhost/api/teacher/courses/sections?course=c_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data.course).toEqual(courseCheckRow);
  expect(json.data.sections).toHaveLength(2);
  expect(json.data.sections[0]).toEqual({
    section: 'Section A',
    sectionId: 'sec_1',
    schedule: 'MW 9am',
    studentCount: 2,
    students: ['Alice', 'Charlie'], // sorted alphabetically
  });
  expect(json.data.sections[1]).toEqual({
    section: 'Section B',
    sectionId: 'sec_2',
    schedule: 'TTh 10am',
    studentCount: 1,
    students: ['Bob'],
  });
});

test('GET returns 500 on database failure', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('DB failure'));

  const req = new Request('http://localhost/api/teacher/courses/sections?course=c_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(500);
  expect(json.success).toBe(false);
  expect(json.error).toBe('DB failure');
});
