import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast, ToastMessage } from '../Toast';
import { expect, test, vi } from 'vitest';

test('renders toast messages and triggers onRemove after duration', () => {
  vi.useFakeTimers();
  const onRemove = vi.fn();
  const toasts: ToastMessage[] = [
    { id: '1', message: 'Success message', type: 'success', duration: 3000 },
    { id: '2', message: 'Error message', type: 'error' },
  ];

  render(<Toast toasts={toasts} onRemove={onRemove} />);

  expect(screen.getByText('Success message')).toBeInTheDocument();
  expect(screen.getByText('Error message')).toBeInTheDocument();
  expect(screen.getByText('✓')).toBeInTheDocument();
  expect(screen.getAllByText('✕')[0]).toBeInTheDocument();

  // Fast-forward 3000ms
  act(() => {
    vi.advanceTimersByTime(3000);
  });
  expect(onRemove).toHaveBeenCalledWith('1');

  vi.useRealTimers();
});

test('triggers onRemove when close button is clicked', () => {
  const onRemove = vi.fn();
  const toasts: ToastMessage[] = [
    { id: '1', message: 'Info message', type: 'info' },
  ];

  render(<Toast toasts={toasts} onRemove={onRemove} />);

  const closeButton = screen.getByRole('button');
  fireEvent.click(closeButton);

  expect(onRemove).toHaveBeenCalledWith('1');
});
