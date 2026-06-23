import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET handles callback and redirects according to role', async () => {
  // Mock account selection row
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [{ id: 'user_123', email: 'test@example.com', role: 1 }] } as any) // SELECT
    .mockResolvedValueOnce({ rows: [] } as any) // UPDATE id
    .mockResolvedValueOnce({ rows: [] } as any) // UPDATE pfp
    .mockResolvedValueOnce({ rows: [] } as any) // UPDATE username
    .mockResolvedValueOnce({ rows: [] } as any); // INSERT notification_preferences

  const response = await GET();
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data.path).toBe('/teacher-portal');
});
