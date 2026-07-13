import React from 'react';
import { render, screen } from '@testing-library/react';
import Admin from '../page';
import { expect, test, vi } from 'vitest';

vi.mock('next/image', () => {
  return {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    default: (props: any) => <img {...props} />
  };
});

test('renders admin portal dashboard and counts', async () => {
  const fetchMock = vi.fn().mockImplementation((url) => {
    if (url.includes('/api/students/count')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { count: 120 } }) });
    }
    if (url.includes('/api/teachers/count')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { count: 15 } }) });
    }
    if (url.includes('/api/classes/count')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { count: 30 } }) });
    }
    if (url.includes('/api/classes/sections')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { count: 8 } }) });
    }
    if (url.includes('/api/school_year/active')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [{ active_school_year: 'sy_1' }] }) });
    }
    if (url.includes('/api/school_year')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }
    if (url.includes('/api/students')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }
    if (url.includes('/api/teachers')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }
    if (url.includes('/api/courses')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
  });
  global.fetch = fetchMock;

  await act(async () => {
    render(<Admin />);
  });

  expect(screen.getAllByText('Total Number of Students')[0]).toBeInTheDocument();
  expect(screen.getAllByText('Total Number of Teachers')[0]).toBeInTheDocument();
  expect(screen.getAllByText('Total Number of Courses')[0]).toBeInTheDocument();
  expect(screen.getAllByText('120')[0]).toBeInTheDocument();
  expect(screen.getAllByText('15')[0]).toBeInTheDocument();
  expect(screen.getAllByText('30')[0]).toBeInTheDocument();
});
