import { GET, POST } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns notification preferences', async () => {
  const mockPrefs = { user_id: 'user_123', push_enabled: true, email_enabled: true };
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [mockPrefs] } as any);

  const response = await GET();
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data.user_id).toBe('user_123');
});

test('POST saves notification preferences', async () => {
  const mockPrefs = { user_id: 'user_123', push_enabled: false, email_enabled: true };
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [mockPrefs] } as any);

  const req = new Request('http://localhost/api/notifications/preferences', {
    method: 'POST',
    body: JSON.stringify({ push_enabled: false }),
  });

  const response = await POST(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data.push_enabled).toBe(false);
});
