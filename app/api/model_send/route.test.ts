import { POST } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('POST stores model file successfully', async () => {
  // Mock course check
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [{ id: 's_1' }] } as any) // SELECT section check
    .mockResolvedValueOnce({ rows: [] } as any) // UPDATE check (not found, proceed to insert)
    .mockResolvedValueOnce({ rows: [{ id: 'model_1' }] } as any); // INSERT result

  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' });
  const file = new File([blob], 'model.joblib');

  const req = {
    formData: async () => ({
      get: (key: string) => {
        if (key === 'course_id') return 's_1';
        if (key === 'section') return 'A';
        if (key === 'model') return file;
        return null;
      }
    })
  } as unknown as Request;

  const response = await POST(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.model_id).toBe('model_1');
});
