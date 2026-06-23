import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';
import { currentUser } from '@clerk/nextjs/server';

vi.mock('@clerk/nextjs/server', () => {
  return {
    currentUser: vi.fn(),
  };
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(currentUser).mockResolvedValue({ id: 'teacher_123' } as any);
});

test('GET returns 401 if teacher is not authenticated', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce(null);

  const req = new Request('http://localhost/api/teacher/analytics/compare/sections?course=sec_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(401);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Not authenticated');
});

test('GET returns 400 if course parameter is missing', async () => {
  const req = new Request('http://localhost/api/teacher/analytics/compare/sections');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(400);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Course parameter is required');
});

test('GET returns 404 if course not found or not assigned to teacher', async () => {
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] } as any); // parentResult

  const req = new Request('http://localhost/api/teacher/analytics/compare/sections?course=sec_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(404);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Course not found or not assigned to you');
});

test('GET returns 404 if course name not found in active school year', async () => {
  vi.spyOn(db, 'query')
    .mockResolvedValueOnce({ rows: [{ course: 'parent_c_1' }] } as any) // parentResult
    .mockResolvedValueOnce({ rows: [] } as any); // courseNameResult

  const req = new Request('http://localhost/api/teacher/analytics/compare/sections?course=sec_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(404);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Course not found in active school year');
});

test('GET returns sections comparative analysis successfully', async () => {
  const monthlyRows = [
    { section_id: 'sec_1', month: 'Jun 2026', year_num: '2026', month_num: '6', present_count: '8', late_count: '1', absent_count: '1' },
    { section_id: 'sec_2', month: 'Jun 2026', year_num: '2026', month_num: '6', present_count: '12', late_count: '4', absent_count: '4' },
  ];

  vi.spyOn(db, 'query').mockImplementation(async (sql: string, params?: any[]) => {
    if (sql.includes('SELECT s.course FROM section')) {
      return { rows: [{ course: 'parent_c_1' }] };
    }
    if (sql.includes('SELECT name FROM course')) {
      return { rows: [{ name: 'Science 10' }] };
    }
    if (sql.includes('SELECT s.id, s.name') && sql.includes('FROM section s')) {
      return { rows: [{ id: 'sec_1', name: 'Section A' }, { id: 'sec_2', name: 'Section B' }] };
    }
    if (sql.includes('enrolled_count')) {
      const secId = params?.[0];
      if (secId === 'sec_1') return { rows: [{ enrolled_count: '20' }] };
      if (secId === 'sec_2') return { rows: [{ enrolled_count: '30' }] };
    }
    if (sql.includes('present_count') && !sql.includes('DATE_TRUNC')) {
      const secId = params?.[0];
      if (secId === 'sec_1') return { rows: [{ present_count: '8', late_count: '1', absent_count: '1' }] };
      if (secId === 'sec_2') return { rows: [{ present_count: '12', late_count: '4', absent_count: '4' }] };
    }
    if (sql.includes("DATE_TRUNC('month'")) {
      return { rows: monthlyRows };
    }
    return { rows: [] };
  });

  const req = new Request('http://localhost/api/teacher/analytics/compare/sections?course=sec_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);

  const data = json.data;
  expect(data.courseName).toBe('Science 10');
  expect(data.sections).toHaveLength(2);
  expect(data.sections[0]).toEqual({
    section: 'Section A',
    studentCount: 20,
    presentCount: 8,
    lateCount: 1,
    absentCount: 1,
    attendanceRate: 80.0,
  });

  expect(data.sections[1]).toEqual({
    section: 'Section B',
    studentCount: 30,
    presentCount: 12,
    lateCount: 4,
    absentCount: 4,
    attendanceRate: 60.0,
  });

  expect(data.courseAvgRate).toBe(66.7);
  expect(data.sectionNames).toEqual(['Section A', 'Section B']);
  expect(data.monthlyComparison).toEqual([
    {
      month: 'Jun 2026',
      'Section A': 80.0,
      'Section B': 60.0,
    },
  ]);
});

test('GET returns 500 on database failure', async () => {
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('Database error'));

  const req = new Request('http://localhost/api/teacher/analytics/compare/sections?course=sec_1');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(500);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Database error');
});
