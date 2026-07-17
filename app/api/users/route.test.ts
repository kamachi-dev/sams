import { POST } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('POST imports new user successfully', async () => {
  const querySpy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] } as any);

  const req = {
    json: async () => ({
      username: 'Test Admin',
      email: 'admin@school.edu',
      role: 0,
    }),
  } as unknown as Request;

  const response = await POST(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data.email).toBe('admin@school.edu');
  expect(querySpy).toHaveBeenCalledWith('BEGIN');
  expect(querySpy).toHaveBeenCalledWith('COMMIT');
});

test('POST imports student with parent info successfully', async () => {
  const querySpy = vi.spyOn(db, 'query').mockImplementation(async (sql: string) => {
    if (sql.includes('SELECT id FROM student_data')) {
      return { rows: [] } as any;
    }
    return { rows: [{ id: 'parent@school.edu' }] } as any;
  });

  const req = {
    json: async () => ({
      username: 'Test Student',
      email: 'student@school.edu',
      role: 3,
      parentEmail: 'parent@school.edu',
      parentName: 'Parent Name',
    }),
  } as unknown as Request;

  const response = await POST(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data.email).toBe('student@school.edu');
});

test('POST returns 400 for invalid role', async () => {
  const req = {
    json: async () => ({
      username: 'Test User',
      email: 'user@school.edu',
      role: 99,
    }),
  } as unknown as Request;

  const response = await POST(req);
  const json = await response.json();

  expect(json.success).toBe(false);
  expect(json.status).toBe(400);
});
