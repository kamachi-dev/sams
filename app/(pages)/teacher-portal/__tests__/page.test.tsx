import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Teacher from '../page';
import { expect, test, vi } from 'vitest';

vi.mock('xlsx-js-style', () => ({
  default: {
    utils: {
      book_new: vi.fn(),
      aoa_to_sheet: vi.fn(),
      book_append_sheet: vi.fn(),
    },
    write: vi.fn(),
  }
}));

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    internal: {
      pageSize: {
        getWidth: () => 297,
        getHeight: () => 210,
      }
    },
    setFillColor: vi.fn(),
    rect: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    roundedRect: vi.fn(),
    setDrawColor: vi.fn(),
  }))
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

vi.mock('next/image', () => {
  return {
    default: (props: any) => <img {...props} />
  };
});

test('renders teacher portal dashboard and sections', async () => {
  const fetchMock = vi.fn().mockImplementation((url) => {
    if (url.includes('/api/teacher/students/count')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { count: 80 } }) });
    }
    if (url.includes('/api/teacher/appeals')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }
    if (url.includes('/api/teacher/students/low-attendance')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }
    if (url.includes('/api/teacher/attendance/today')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { present: 40, late: 5, absent: 2, total: 47, attendanceRate: 95.7 } }) });
    }
    if (url.includes('/api/teacher/attendance/summary')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { present: 40, late: 5, absent: 2, total: 47, attendanceRate: 95.7 } }) });
    }
    if (url.includes('/api/teacher/attendance/trends')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }
    if (url.includes('/api/teacher/courses')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
  });
  global.fetch = fetchMock;

  await act(async () => {
    render(<Teacher />);
  });

  expect(screen.getAllByText('Student Attendance Management System SAMS+')[0]).toBeInTheDocument();
  expect(screen.getByText('Number of Courses Handled')).toBeInTheDocument();
  expect(screen.getByText('Number of Sections Handled')).toBeInTheDocument();
});
