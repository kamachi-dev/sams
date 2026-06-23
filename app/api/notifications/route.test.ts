import { GET, POST } from './route';
import { NextRequest } from 'next/server';
import { expect, test, vi, beforeEach } from 'vitest';
import pool from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns notifications list and counts', async () => {
  vi.spyOn(pool, 'query')
    .mockResolvedValueOnce({
      rows: [
        { id: 'n_1', student_id: 'user_123', type: 0, title: 'Test', message: 'Test Msg', is_read: false, created_at: '2026-06-23T12:00:00Z', course_name: 'Science' }
      ]
    } as any)
    .mockResolvedValueOnce({
      rows: [{ total: '1' }]
    } as any);

  const req = new NextRequest('http://localhost/api/notifications?userId=user_123');
  const response = await GET(req);
  const json = await response.json();

  expect(json.notifications).toHaveLength(1);
  expect(json.total).toBe(1);
  expect(json.unread).toBe(1);
});

test('POST marks notification as read', async () => {
  vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as any);

  const req = new NextRequest('http://localhost/api/notifications', {
    method: 'POST',
    body: JSON.stringify({ notificationId: 'n_1' }),
  });

  const response = await POST(req);
  const json = await response.json();

  expect(json.success).toBe(true);
});
