import { POST } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

vi.mock('@/lib/push-notifications', () => ({
  sendPushNotification: vi.fn().mockResolvedValue(true),
  sendBulkPushNotifications: vi.fn().mockResolvedValue({ sent: 2, failed: 0, expired: 0 }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

test('POST with invalid fields returns 400', async () => {
  const req = new Request('http://localhost/api/notifications/trigger', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  const response = await POST(req);
  const json = await response.json();

  expect(json.success).toBe(false);
});

test('POST sends triggered push notifications', async () => {
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [{ parent: 'p_1' }] } as any) // parent query
    .mockResolvedValueOnce({ rows: [{ endpoint: 'http://example.com', auth: 'auth', p256dh: 'p256dh' }] } as any); // subscription query

  const req = new Request('http://localhost/api/notifications/trigger', {
    method: 'POST',
    body: JSON.stringify({
      type: 'parent_notification',
      userId: 'stud_1',
      title: 'Alert',
      message: 'Urgent parent alert',
    }),
  });

  const response = await POST(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data.sent).toBe(2);
});
