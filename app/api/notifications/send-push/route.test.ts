import { POST } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

vi.mock('@/lib/push-notifications', () => ({
  sendPushNotification: vi.fn().mockResolvedValue(true),
  sendBulkPushNotifications: vi.fn().mockResolvedValue({ sent: 1, failed: 0 }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

test('POST sends generic push notification', async () => {
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ endpoint: 'http://example.com', auth: 'auth', p256dh: 'p256dh' }]
  } as any);

  const req = new Request('http://localhost/api/notifications/send-push', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Alert',
      message: 'New announcement',
      type: 'announcement',
      notificationId: 'notif_1'
    }),
  });

  const response = await POST(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.sent).toBe(1);
});
