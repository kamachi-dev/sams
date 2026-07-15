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

test('GET returns formatted appeals for the teacher', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);

  const mockRows = [
    {
      id: 'app_1',
      record_id: 'rec_1',
      student_id: 'stud_1',
      course_id: 'sec_1',
      reason: 'Was sick',
      status: 0, // pending
      submitted_at: '2026-06-23T12:00:00Z',
      reviewed_at: null,
      teacher_response: null,
      reviewed_by: null,
      record_time: '2026-06-23T08:00:00Z',
      attendance: 0, // Absent
      course_name: 'Science 10',
      course_id_db: 'c_1',
      section_id: 'sec_1',
      section_name: 'Section A',
      student_name: 'Jane Doe',
      reviewer_name: null,
    },
    {
      id: 'app_2',
      record_id: 'rec_2',
      student_id: 'stud_2',
      course_id: 'sec_1',
      reason: 'Traffic',
      status: 1, // approved
      submitted_at: '2026-06-23T13:00:00Z',
      reviewed_at: '2026-06-23T14:00:00Z',
      teacher_response: 'Approved',
      reviewed_by: 'teacher_123',
      record_time: '2026-06-23T08:00:00Z',
      attendance: 2, // Late
      course_name: 'Science 10',
      course_id_db: 'c_1',
      section_id: 'sec_1',
      section_name: 'Section A',
      student_name: 'John Smith',
      reviewer_name: 'Test Teacher',
    },
  ];

  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toHaveLength(2);

  expect(json.data[0].status).toBe('pending');
  expect(json.data[0].recordedStatus).toBe('Absent');
  expect(json.data[0].studentName).toBe('Jane Doe');
  expect(json.data[0].sectionId).toBe('sec_1');
  expect(json.data[0].recordDate).toBe('2026-06-23');

  expect(json.data[1].status).toBe('approved');
  expect(json.data[1].recordedStatus).toBe('Late');
  expect(json.data[1].studentName).toBe('John Smith');
  expect(json.data[1].reviewedBy).toBe('Test Teacher');
  expect(json.data[1].teacherResponse).toBe('Approved');

  const [query] = vi.mocked(db.query).mock.calls[0];
  expect(query).toContain('account student_account');
  expect(query).not.toContain('student_data');
});

test('GET returns 500 on database error', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('Database error'));

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(500);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Database error');
});
