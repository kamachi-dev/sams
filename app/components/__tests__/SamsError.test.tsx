import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SamsError, { Error as triggerError } from '../SamsError';
import { expect, test } from 'vitest';

// Mock Radix UI Toast specifically for custom rendering check if needed, 
// but since we mocked it globally in vitest.setup.ts, it will use that.
// Let's verify the behavior.

test('handles global Error calls and renders error toasts', () => {
  render(<SamsError />);

  // Trigger error globally
  act(() => {
    triggerError('Something went wrong!');
  });

  expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
  expect(screen.getByText('An error occurred')).toBeInTheDocument();
});

test('flushes pending errors pre-mount', () => {
  // Call triggerError before mounting
  act(() => {
    triggerError('Pre-mount error');
  });

  render(<SamsError />);

  expect(screen.getByText('Pre-mount error')).toBeInTheDocument();
});

test('removes toast when close button is clicked', () => {
  render(<SamsError />);

  act(() => {
    triggerError('Close me');
  });

  expect(screen.getByText('Close me')).toBeInTheDocument();

  const closeButton = screen.getByRole('button');
  fireEvent.click(closeButton);

  expect(screen.queryByText('Close me')).not.toBeInTheDocument();
});
