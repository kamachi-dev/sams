import { GET, POST, DELETE } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

vi.mock('xlsx', () => {
  return {
    read: vi.fn().mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {},
      }
    }),
    utils: {
      sheet_to_json: vi.fn().mockReturnValue([
        ['Teacher', 'teacher@example.com'],
      ]),
    }
  };
});

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns teachers list', async () => {
  const mockRows = [{ id: 't_1', username: 'Teacher One', role: 1 }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const response = await GET();
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockRows);
});

test('POST imports teachers from xlsx', async () => {
  const mockRows = [{ id: 'teacher@example.com', username: 'Teacher', role: 1 }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const file = new File([blob], 'teachers.xlsx');

  const req = {
    formData: async () => ({
      get: (key: string) => (key === 'file' ? file : null),
    }),
  } as unknown as Request;

  const response = await POST(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockRows);
});

test('DELETE removes teacher', async () => {
  const mockRows = [{ id: 't_1', username: 'Teacher' }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const req = {
    formData: async () => ({
      get: (key: string) => (key === 'id' ? 't_1' : null),
    }),
  } as unknown as Request;

  const response = await DELETE(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockRows);
});
