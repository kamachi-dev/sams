import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import db from '@/app/services/database';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET returns courses models list with base64 encoded pickle data', async () => {
  const mockRows = [{
    model_id: 'm_1',
    course_id: 'c_1',
    course_name: 'Science',
    section: 'A',
    section_name: 'A',
    teacher_name: 'Mr. John',
    enrolled_count: 5,
    model_pickle: Buffer.from('mock_pickle_data')
  }];
  vi.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockRows } as any);

  const response = await GET();
  const json = await response.json();

  expect(json.success).toBe(true);
  expect(json.data[0].model_id).toBe('m_1');
  expect(json.data[0].model_base64).toBe(Buffer.from('mock_pickle_data').toString('base64'));
});
