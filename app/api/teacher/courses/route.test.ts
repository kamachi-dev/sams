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

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(401);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Not authenticated');
});

test('GET returns mapped courses for teacher', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);

  const mockRows = [
    {
      course_id: 'c_1',
      name: 'Science 101',
      representative_section_id: 'sec_1',
      section_count: '2',
      total_students: '50',
      sections: [
        { id: 'sec_1', name: 'Section A', schedule: 'Mon/Wed 9am', studentCount: 25 },
        { id: 'sec_2', name: 'Section B', schedule: 'Mon/Wed 9am', studentCount: 25 },
      ],
    },
  ];

  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toHaveLength(1);
  expect(json.data[0]).toEqual({
    id: 'sec_1',
    courseId: 'c_1',
    name: 'Science 101',
    schedule: 'Mon/Wed 9am',
    sectionCount: 2,
    studentCount: 50,
    sectionNames: ['Section A', 'Section B'],
    sections: [
      { id: 'sec_1', name: 'Section A', schedule: 'Mon/Wed 9am', studentCount: 25 },
      { id: 'sec_2', name: 'Section B', schedule: 'Mon/Wed 9am', studentCount: 25 },
    ],
  });
});

test('GET returns 500 if database query fails', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('DB failure'));

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(500);
  expect(json.success).toBe(false);
  expect(json.error).toBe('DB failure');
});
