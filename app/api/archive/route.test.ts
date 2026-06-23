import { GET, POST, DELETE } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns school year list', async () => {
  const mockRows = [{ id: '1', school_year: '2025-2026', notes: 'Test' }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const response = await GET();
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockRows);
});

test('POST inserts new school year', async () => {
  const mockRows = [{ id: '1', school_year: '2025-2026', notes: 'Test' }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const formData = new FormData();
  formData.append('school_year', '2025-2026');
  formData.append('notes', 'Test');

  const req = new Request('http://localhost/api/archive', {
    method: 'POST',
    body: formData,
  });

  const response = await POST(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockRows);
});

test('DELETE removes school year', async () => {
  const mockRows = [{ id: '1', school_year: '2025-2026', notes: 'Test' }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const formData = new FormData();
  formData.append('id', '1');

  const req = new Request('http://localhost/api/archive', {
    method: 'DELETE',
    body: formData,
  });

  const response = await DELETE(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockRows);
});
