import { POST } from './route';
import { expect, test, vi, beforeEach } from 'vitest';
import { exec } from 'child_process';

vi.mock('child_process', () => {
  const execMock = vi.fn();
  return {
    exec: execMock,
    default: {
      exec: execMock,
    },
  };
});

beforeEach(() => {
  vi.restoreAllMocks();
});

test('POST starts training successfully', async () => {
  const req = new Request('http://localhost/api/train', {
    method: 'POST',
    body: JSON.stringify({ courseId: 'c_123' }),
  });

  const response = await POST(req);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.message).toBe('Training started');
  expect(exec).toHaveBeenCalledWith(
    expect.stringContaining('train.py" c_123'),
    expect.any(Function)
  );
});

test('POST returns 400 if courseId is missing', async () => {
  const req = new Request('http://localhost/api/train', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  const response = await POST(req);
  const json = await response.json();

  expect(response.status).toBe(400);
  expect(json.success).toBe(false);
  expect(json.error).toBe('Missing courseId');
});
