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
        ['Alice', 'alice@example.com'],
      ]),
    }
  };
});

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns students list', async () => {
  const mockRows = [{ id: 'stud_1', username: 'Alice', role: 3 }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const response = await GET();
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockRows);
});

test('POST imports students from xlsx', async () => {
  const mockRows = [{ id: 'alice@example.com', username: 'Alice', role: 3 }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const file = new File([blob], 'students.xlsx');

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

test('DELETE removes student', async () => {
  const mockRows = [{ id: 'stud_1', username: 'Alice' }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const req = {
    formData: async () => ({
      get: (key: string) => (key === 'id' ? 'stud_1' : null),
    }),
  } as unknown as Request;

  const response = await DELETE(req);
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data).toEqual(mockRows);
});
