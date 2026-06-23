import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET with missing courseId returns 400', async () => {
  const req = new Request('http://localhost/api/camera/model_select');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(400);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Missing courseId');
});

test('GET with courseId returns base64 encoded pickle', async () => {
  const mockRows = [{ id: 'm_1', model_pickle: Buffer.from('mock_pickle_data'), section: 'A' }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const req = new Request('http://localhost/api/camera/model_select?courseId=c_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.model_pickle).toBe(Buffer.from('mock_pickle_data').toString('base64'));
});
