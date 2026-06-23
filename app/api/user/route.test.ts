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

test('GET returns user account data when user exists', async () => {
  const mockUser = { id: 'user_123' };
  vi.mocked(currentUser).mockResolvedValueOnce(mockUser as any);

  const mockAccount = {
    id: 'user_123',
    username: 'Test User',
    email: 'test@example.com',
    role: 'teacher',
  };

  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [mockAccount],
  } as any);

  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockAccount);
});

test('GET returns 500 when database query fails', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'user_123' } as any);
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('Database error'));

  const response = await GET();
  const json = await response.json();

  expect(json.success).toBe(false);
  expect(json.status).toBe(500);
  expect(json.error).toBe('User data could not be retrieved');
});
