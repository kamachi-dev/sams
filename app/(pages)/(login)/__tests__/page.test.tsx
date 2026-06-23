import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Login from '../page';
import { expect, test, vi } from 'vitest';

vi.mock('next/image', () => {
  return {
    default: (props: any) => <img {...props} />
  };
});

vi.mock('@/app/components/CarouselClient', () => {
  return {
    default: () => <div data-testid="carousel">Carousel Mock</div>
  };
});

test('renders login page and opens Terms and Conditions', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { path: '/admin-portal' } }),
  });
  global.fetch = fetchMock;

  render(<Login />);

  expect(screen.getByText('Student Attendance Management System SAMS')).toBeInTheDocument();
  expect(screen.getByText('Sign in with Google')).toBeInTheDocument();

  // Click Terms and Conditions button
  const termsBtn = screen.getByRole('button', { name: 'Terms and Conditions' });
  fireEvent.click(termsBtn);

  // Modal content should be shown
  expect(screen.getByText('By using SAMS, you agree to comply with the following terms and conditions:')).toBeInTheDocument();
});
