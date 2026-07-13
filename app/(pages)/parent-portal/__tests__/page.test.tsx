import React from 'react';
import { render, screen } from '@testing-library/react';
import Parent from '../page';
import { expect, test, vi } from 'vitest';

vi.mock('next/image', () => {
  return {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    default: (props: any) => <img {...props} />
  };
});

test('renders parent portal with children list and widgets', async () => {
  const fetchMock = vi.fn().mockImplementation((url) => {
    if (url.includes('/summary')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: { present: 10, late: 2, absent: 1, percentage: 90, absentYesterday: false },
        }),
      });
    }
    if (url.includes('/api/parent/children')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 'child_1', name: 'Child One', present: 10, late: 2, absent: 1, percentage: 90 },
          ],
        }),
      });
    }
    if (url.includes('/api/parent/notifications')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
  });
  global.fetch = fetchMock;

  await act(async () => {
    render(<Parent />);
  });

  expect(await screen.findByText('Total Number of Children')).toBeInTheDocument();
  expect(await screen.findByText('Child One')).toBeInTheDocument();
  expect(await screen.findByText('90%')).toBeInTheDocument();
  expect(await screen.findByText('Check Info')).toBeInTheDocument();
});
