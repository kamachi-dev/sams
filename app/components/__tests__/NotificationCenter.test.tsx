import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NotificationCenter } from '../NotificationCenter';
import { expect, test, vi } from 'vitest';

const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();

vi.mock('@/lib/useRealTimeNotifications', () => {
  return {
    useRealTimeNotifications: () => ({
      notifications: [
        {
          id: 'notif_1',
          student_id: 'stud_1',
          course_id: 'c_1',
          record_id: 1,
          type: 0, // attendance
          title: 'Attendance Alert',
          message: 'Student was marked late',
          is_read: false,
          created_at: '2026-06-23T12:00:00Z',
          course_name: 'Science 101',
        },
      ],
      unreadCount: 1,
      loading: false,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      refetch: vi.fn(),
    }),
  };
});

test('renders notification bell with badge and toggles dropdown on click', () => {
  render(<NotificationCenter />);

  // Unread badge should exist
  expect(screen.getByText('1')).toBeInTheDocument();

  // Bell button should exist
  const bellButton = screen.getByRole('button', { name: 'Notifications' });
  expect(bellButton).toBeInTheDocument();

  // Dropdown should be closed initially
  expect(screen.queryByText('Notifications')).not.toBeInTheDocument();

  // Click bell button
  fireEvent.click(bellButton);

  // Dropdown should now be open
  expect(screen.getByText('Notifications')).toBeInTheDocument();
  expect(screen.getByText('Attendance Alert')).toBeInTheDocument();
  expect(screen.getByText('Student was marked late')).toBeInTheDocument();
  expect(screen.getByText('Science 101')).toBeInTheDocument();
  expect(screen.getByText('Mark all as read')).toBeInTheDocument();
});

test('calls markAsRead when notification item is clicked', () => {
  render(<NotificationCenter />);
  const bellButton = screen.getByRole('button', { name: 'Notifications' });
  fireEvent.click(bellButton);

  const notificationItem = screen.getByText('Attendance Alert').closest('.notification-item');
  expect(notificationItem).toBeInTheDocument();

  fireEvent.click(notificationItem!);

  expect(mockMarkAsRead).toHaveBeenCalledWith('notif_1');
});

test('calls markAllAsRead when "Mark all as read" button is clicked', () => {
  render(<NotificationCenter />);
  const bellButton = screen.getByRole('button', { name: 'Notifications' });
  fireEvent.click(bellButton);

  const markAllButton = screen.getByText('Mark all as read');
  fireEvent.click(markAllButton);

  expect(mockMarkAllAsRead).toHaveBeenCalled();
});
