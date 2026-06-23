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

test('GET returns debug info successfully', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({
    id: 'teacher_123',
    emailAddresses: [{ emailAddress: 'teacher@example.com' }],
  } as any);

  // Mock DB calls
  // 1. coursesResult
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ id: 'sec_1', name: 'Science', teacher: 'teacher_123', school_year: '1' }],
  } as any);

  // 2. enrollmentsResult
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ student: 'stud_1', section: 'sec_1', course_name: 'Science' }],
  } as any);

  // 3. accountsResult (student accounts)
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ id: 'stud_1', username: 'Alice Student' }],
  } as any);

  // 4. countResult
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ count: '1' }],
  } as any);

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data.userId).toBe('teacher_123');
  expect(json.data.userEmail).toBe('teacher@example.com');
  expect(json.data.courses).toHaveLength(1);
  expect(json.data.enrollments).toHaveLength(1);
  expect(json.data.studentAccounts).toHaveLength(1);
  expect(json.data.count).toEqual({ count: '1' });
});

test('GET handles case when no enrollments exist', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({
    id: 'teacher_123',
    emailAddresses: [],
  } as any);

  // 1. coursesResult
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] } as any);

  // 2. enrollmentsResult
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] } as any);

  // Note: accountsResult query is skipped because studentIds is empty.
  // 3. countResult (next query)
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ count: '0' }],
  } as any);

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data.courses).toHaveLength(0);
  expect(json.data.enrollments).toHaveLength(0);
  expect(json.data.studentAccounts).toHaveLength(0);
  expect(json.data.count).toEqual({ count: '0' });
});

test('GET returns 500 on database failure', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('Database error'));

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(500);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Database error');
});
