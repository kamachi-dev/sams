import { GET } from './route';
import { expect, test, vi, beforeEach } from 'vitest';

vi.mock('@/lib/runMigrations', () => ({
  runMigrations: vi.fn().mockResolvedValue(true),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

test('GET initializes database migrations successfully', async () => {
  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.message).toBe('Database migrations completed');
});
