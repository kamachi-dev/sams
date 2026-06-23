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

  const req = new Request('http://localhost/api/teacher/attendance/sf2?course=sec_1&month=6&year=2026');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(401);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Not authenticated');
});

test('GET returns 400 if required parameters are missing or invalid', async () => {
  // Missing parameters
  const req1 = new Request('http://localhost/api/teacher/attendance/sf2?course=sec_1');
  const res1 = await GET(req1);
  const json1 = await res1.json();
  expect(res1.status).toBe(400);
  expect(json1.success).toBe(false);
  expect(json1.error).toBe('course, month, and year parameters are required');

  // Invalid month
  const req2 = new Request('http://localhost/api/teacher/attendance/sf2?course=sec_1&month=13&year=2026');
  const res2 = await GET(req2);
  const json2 = await res2.json();
  expect(res2.status).toBe(400);
  expect(json2.success).toBe(false);
  expect(json2.error).toBe('Invalid month or year');
});

test('GET returns 404 if course not found', async () => {
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] } as any); // courseCheck

  const req = new Request('http://localhost/api/teacher/attendance/sf2?course=sec_1&month=6&year=2026');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(404);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Course not found');
});

test('GET generates correct SF2 data and detection log', async () => {
  // 1. courseCheck
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ id: 'sec_1', name: 'Science 10', section_name: 'Section A' }],
  } as any);

  // 2. teacherResult
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ username: 'Mr. Smith' }],
  } as any);

  // 3. studentsResult
  const studentRows = [
    { id: 'stud_1', name: 'Alice' },
    { id: 'stud_2', name: 'Bob' },
  ];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: studentRows } as any);

  // 4. recordsResult
  const recordRows = [
    { student: 'stud_1', record_date: '2026-06-01', attendance: 1, confidence: 0.95 }, // Alice present on day 1
    { student: 'stud_1', record_date: '2026-06-02', attendance: 2, confidence: 0.8 },  // Alice late on day 2
    { student: 'stud_2', record_date: '2026-06-01', attendance: 0, confidence: 0 },    // Bob absent on day 1
    // Bob has no detection/record on day 2
  ];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: recordRows } as any);

  // 5. detectionLogResult
  const logRows = [
    { student: 'stud_1', student_name: 'Alice', time: '2026-06-01T08:00:00Z', attendance: 1, confidence: 0.95 },
    { student: 'stud_2', student_name: 'Bob', time: '2026-06-01T09:00:00Z', attendance: 0, confidence: 0 },
    { student: 'stud_1', student_name: 'Alice', time: '2026-06-02T08:15:00Z', attendance: 2, confidence: 0.8 },
  ];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: logRows } as any);

  const req = new Request('http://localhost/api/teacher/attendance/sf2?course=sec_1&month=6&year=2026');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  
  const data = json.data;
  expect(data.courseName).toBe('Science 10');
  expect(data.section).toBe('Section A');
  expect(data.month).toBe('June');
  expect(data.year).toBe(2026);
  expect(data.teacherName).toBe('Mr. Smith');
  expect(data.totalEnrolled).toBe(2);
  expect(data.schoolDays).toEqual([1, 2]);

  // Alice checks
  const alice = data.students.find((s: any) => s.id === 'stud_1');
  expect(alice.dailyStatus['1']).toBe('P');
  expect(alice.dailyStatus['2']).toBe('L');
  expect(alice.totalPresent).toBe(1);
  expect(alice.totalLate).toBe(1);
  expect(alice.totalAbsent).toBe(0);
  expect(alice.avgConfidence).toBeCloseTo(0.875); // (0.95 + 0.8) / 2

  // Bob checks
  const bob = data.students.find((s: any) => s.id === 'stud_2');
  expect(bob.dailyStatus['1']).toBe('A');
  expect(bob.dailyStatus['2']).toBe('ND'); // No Detection
  expect(bob.totalPresent).toBe(0);
  expect(bob.totalLate).toBe(0);
  expect(bob.totalAbsent).toBe(1);
  expect(bob.avgConfidence).toBeNull(); // no successful detection

  // Detection log checks
  expect(data.detectionLog).toHaveLength(3);
  expect(data.detectionLog[0]).toEqual({
    studentName: 'Alice',
    date: 'Jun 1, 2026',
    time: new Date('2026-06-01T08:00:00Z').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
    status: 'Present',
    confidence: 0.95,
  });
});

test('GET returns 500 on database failure', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);
  vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('Database error'));

  const req = new Request('http://localhost/api/teacher/attendance/sf2?course=sec_1&month=6&year=2026');
  const response = await GET(req);
  const json = await response.json();

  expect(response.status).toBe(500);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Database error');
});
