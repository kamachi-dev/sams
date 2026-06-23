import React from 'react';
import { render, screen, act } from '@testing-library/react';
import SamsTemplate from '../SamsTemplate';
import { expect, test, vi } from 'vitest';

vi.mock('next/image', () => {
  return {
    default: (props: any) => <img {...props} />
  };
});

test('renders template structure, tabs, and user info', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: {
        id: 'user_123',
        username: 'John Doe',
        email: 'john@example.com',
        pfp: null,
        role: 1,
        created_at: '2026-06-23T12:00:00Z',
      },
    }),
  });
  global.fetch = fetchMock;

  const DummyIcon = () => <span>Icon</span>;
  const links = [
    {
      label: 'Home',
      Icon: DummyIcon,
      panels: [<div key="panel1">Panel Content</div>],
      content: <div>Body Content</div>,
    },
  ];

  await act(async () => {
    render(<SamsTemplate links={links} />);
  });

  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
  expect(screen.getAllByText('Home')[0]).toBeInTheDocument();
  expect(screen.getByText('Welcome to')).toBeInTheDocument();
  expect(screen.getByText('Panel Content')).toBeInTheDocument();
  expect(screen.getByText('Body Content')).toBeInTheDocument();
});
