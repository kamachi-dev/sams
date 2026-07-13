import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Student from '../page';
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
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    default: (props: any) => <img {...props} />
  };
});

test('renders student portal dashboard and components', async () => {
  const fetchMock = vi.fn().mockImplementation((url) => {
    console.log("FETCH REQUEST:", url);
    if (url.includes('/api/student/info')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: { username: 'Jane Doe', grade_level: 'Grade 10', section: 'A' },
        }),
      });
    }
    if (url.includes('/api/student/attendance/summary')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            presentDays: 15,
            lateDays: 2,
            absentDays: 1,
            totalDays: 18,
            attendanceRate: 94.4,
            totalCourses: 5,
          },
        }),
      });
    }
    if (url.includes('/api/student/attendance/courses')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { courseId: 'c1', course: 'Math', present: 15, late: 2, absent: 1, percentage: 94 },
          ],
        }),
      });
    }
    if (url.includes('/api/student/attendance/trends')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }
    if (url.includes('/api/student/attendance/daily')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }
    if (url.includes('/api/student/notifications')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }
    if (url.includes('/api/student/appeals')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
  });
  global.fetch = fetchMock;

  await act(async () => {
    render(<Student />);
  });

  expect(await screen.findByText('Student Information')).toBeInTheDocument();
  expect(await screen.findByText('Grade Level')).toBeInTheDocument();
  expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
  expect(await screen.findByText((content, element) => element?.classList.contains('student-panel-value') && element.textContent?.includes('94.4'))).toBeInTheDocument();
});
