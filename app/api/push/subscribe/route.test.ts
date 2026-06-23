import { POST, DELETE } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('POST saves subscription', async () => {
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [] } as any) // existing check
    .mockResolvedValueOnce({ rows: [] } as any); // insert

  const req = new Request('http://localhost/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: 'http://example.com',
      keys: { auth: 'auth', p256dh: 'p256dh' }
    }),
  });

  const response = await POST(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.message).toBe('Subscription saved');
});

test('DELETE removes subscription', async () => {
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] } as any);

  const req = new Request('http://localhost/api/push/subscribe', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint: 'http://example.com' }),
  });

  const response = await DELETE(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.message).toBe('Subscription removed');
});
