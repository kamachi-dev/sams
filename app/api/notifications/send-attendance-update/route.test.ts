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

test('POST sends attendance update push notification to subscribed clients', async () => {
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ endpoint: 'http://example.com', auth: 'auth', p256dh: 'p256dh' }]
  } as any);

  const req = new Request('http://localhost/api/notifications/send-attendance-update', {
    method: 'POST',
    body: JSON.stringify({
      childName: 'Alice',
      present: 10,
      late: 1,
      absent: 0,
      percentage: 95
    }),
  });

  const response = await POST(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.sent).toBe(1);
});
