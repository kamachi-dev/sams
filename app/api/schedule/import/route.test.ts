import { POST } from './route';
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
        ['Math'],
        ['', 'section', 'Section A'],
        ['', 'classroom', 'Room 101'],
        ['', 'teacher', 'teacher@example.com'],
        ['', 'schedule'],
        ['', '', 'monday', '08:00 am', '09:15 am'],
        ['', 'students'],
        ['', '', 'Alice', 'alice@example.com', 'Bob', 'bob@example.com'],
      ]),
    }
  };
});

beforeEach(() => {
  vi.restoreAllMocks();
});

test('POST imports schedule sheet and creates database entities', async () => {
  const insertedEmails = new Set<string>();
  vi.spyOn(db, 'query').mockImplementation(async (sql, params) => {
    if (sql.includes('active_school_year FROM meta')) {
      return { rows: [{ active_school_year: 'sy_1' }] } as any;
    }
    if (sql.includes('SELECT id FROM account')) {
      const email = params?.[0];
      if (email && insertedEmails.has(email)) {
        if (email === 'alice@example.com') return { rows: [{ id: 'stud_1' }] } as any;
        if (email === 'bob@example.com') return { rows: [{ id: 'parent_1' }] } as any;
        if (email === 'teacher@example.com') return { rows: [{ id: 'teacher_1' }] } as any;
      }
      return { rows: [] } as any;
    }
    if (sql.includes('INSERT INTO account')) {
      const email = params?.[2];
      if (email) insertedEmails.add(email);
      return { rows: [] } as any;
    }
    if (sql.includes('SELECT id FROM student_data')) {
      return { rows: [] } as any;
    }
    if (sql.includes('SELECT id FROM course')) {
      return { rows: [] } as any;
    }
    if (sql.includes('INSERT INTO course')) {
      return { rows: [{ id: 'c_1' }] } as any;
    }
    if (sql.includes('INSERT INTO section')) {
      return { rows: [{ id: 'sec_1' }] } as any;
    }
    return { rows: [] } as any;
  });

  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const file = new File([blob], 'schedule.xlsx');

  const req = {
    formData: async () => ({
      get: (key: string) => (key === 'file' ? file : null),
    }),
  } as unknown as Request;

  const response = await POST(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data.coursesCreated).toBe(1);
  expect(json.data.sectionsCreated).toBe(1);
});
