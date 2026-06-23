import { PATCH } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';
import { currentUser } from '@clerk/nextjs/server';
import { createNotificationWithPush } from '@/lib/createAndNotify';
import { sendAppealDecisionEmail } from '@/lib/email-notifications';

vi.mock('@clerk/nextjs/server', () => {
  return {
    currentUser: vi.fn(),
  };
});

vi.mock('@/lib/createAndNotify', () => {
  return {
    createNotificationWithPush: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/lib/email-notifications', () => {
  return {
    sendAppealDecisionEmail: vi.fn().mockResolvedValue(undefined),
  };
});

beforeEach(() => {
  vi.restoreAllMocks();
});

test('PATCH returns 401 if teacher is not authenticated', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce(null);

  const req = new Request('http://localhost/api/teacher/appeals/app_1', {
    method: 'PATCH',
    body: JSON.stringify({ decision: 'approved' }),
  });

  const response = await PATCH(req, { params: Promise.resolve({ appealId: 'app_1' }) });
  const json = await response.json();

  expect(response.status).toBe(401);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Not authenticated');
});

test('PATCH returns 400 if decision is invalid', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);

  const req = new Request('http://localhost/api/teacher/appeals/app_1', {
    method: 'PATCH',
    body: JSON.stringify({ decision: 'maybe' }),
  });

  const response = await PATCH(req, { params: Promise.resolve({ appealId: 'app_1' }) });
  const json = await response.json();

  expect(response.status).toBe(400);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Invalid decision. Must be "approved" or "rejected"');
});

test('PATCH returns 404 if appeal not found', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] } as any); // appealCheck

  const req = new Request('http://localhost/api/teacher/appeals/app_1', {
    method: 'PATCH',
    body: JSON.stringify({ decision: 'approved' }),
  });

  const response = await PATCH(req, { params: Promise.resolve({ appealId: 'app_1' }) });
  const json = await response.json();

  expect(response.status).toBe(404);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Appeal not found');
});

test('PATCH returns 403 if teacher does not own the course', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ id: 'app_1', status: 0, course_id: 'c_1', teacher: 'teacher_other', course_name: 'Science' }],
  } as any); // appealCheck

  const req = new Request('http://localhost/api/teacher/appeals/app_1', {
    method: 'PATCH',
    body: JSON.stringify({ decision: 'approved' }),
  });

  const response = await PATCH(req, { params: Promise.resolve({ appealId: 'app_1' }) });
  const json = await response.json();

  expect(response.status).toBe(403);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Not authorized to review this appeal');
});

test('PATCH returns 400 if appeal is already reviewed', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ id: 'app_1', status: 1, course_id: 'c_1', teacher: 'teacher_123', course_name: 'Science' }],
  } as any); // appealCheck

  const req = new Request('http://localhost/api/teacher/appeals/app_1', {
    method: 'PATCH',
    body: JSON.stringify({ decision: 'approved' }),
  });

  const response = await PATCH(req, { params: Promise.resolve({ appealId: 'app_1' }) });
  const json = await response.json();

  expect(response.status).toBe(400);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Appeal has already been reviewed');
});

test('PATCH reviews and updates appeal, sends notifications', async () => {
  vi.mocked(currentUser).mockResolvedValueOnce({ id: 'teacher_123' } as any);
  
  // 1. appealCheck result
  vi.spyOn(db, 'query').mockResolvedValueOnce({
    rows: [{ id: 'app_1', status: 0, course_id: 'sec_1', teacher: 'teacher_123', course_name: 'Science' }],
  } as any);

  // 2. update result
  const updatedRow = {
    id: 'app_1',
    record_id: 'rec_1',
    course_id: 'sec_1',
    reason: 'Sick',
    status: 1,
    reviewed_by: 'teacher_123',
    reviewed_at: '2026-06-23T15:00:00Z',
    teacher_response: 'Get well soon',
  };
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [updatedRow] } as any);

  // 3. studentInfo query result
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: [{ student_id: 'stud_99' }] } as any);

  const req = new Request('http://localhost/api/teacher/appeals/app_1', {
    method: 'PATCH',
    body: JSON.stringify({ decision: 'approved', teacherResponse: 'Get well soon' }),
  });

  const response = await PATCH(req, { params: Promise.resolve({ appealId: 'app_1' }) });
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data.status).toBe('approved');
  expect(json.data.teacherResponse).toBe('Get well soon');

  // Verify notifications and emails were triggered
  expect(createNotificationWithPush).toHaveBeenCalledWith(expect.objectContaining({
    studentId: 'stud_99',
    courseId: 'sec_1',
    recordId: 'rec_1',
    type: 1,
    title: 'Appeal ✅ Approved',
  }));

  expect(sendAppealDecisionEmail).toHaveBeenCalledWith(expect.objectContaining({
    studentId: 'stud_99',
    courseName: 'Science',
    decision: 'approved',
    teacherResponse: 'Get well soon',
  }));
});
