import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import NotificationSettings from '../NotificationSettings';
import { expect, test, vi } from 'vitest';

const mockSubscribe = vi.fn().mockResolvedValue(true);
const mockUnsubscribe = vi.fn().mockResolvedValue(true);
const mockUpdatePreferences = vi.fn().mockResolvedValue(true);

vi.mock('@/lib/usePushNotifications', () => {
  return {
    usePushNotifications: () => ({
      preferences: {
        push_enabled: true,
        new_notification: true,
        attendance_alert: false,
        appeal_status: true,
        email_enabled: false,
      },
      isSupported: true,
      isSubscribed: true,
      loading: false,
      subscribeToPushNotifications: mockSubscribe,
      unsubscribeFromPushNotifications: mockUnsubscribe,
      updatePreferences: mockUpdatePreferences,
    }),
  };
});

test('renders modal preferences when open', () => {
  const onClose = vi.fn();
  render(<NotificationSettings isOpen={true} onClose={onClose} showEmailNotifications={true} />);

  expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  expect(screen.getByLabelText('Enable Push Notifications')).toBeChecked();
  expect(screen.getByLabelText('New Notifications')).toBeChecked();
  expect(screen.getByLabelText('Attendance Alerts')).not.toBeChecked();
  expect(screen.getByLabelText('Appeal Status')).toBeChecked();
  expect(screen.getByLabelText('Enable Email Notifications')).not.toBeChecked();
});

test('calls updatePreferences when toggling a preference checkbox', async () => {
  const onClose = vi.fn();
  render(<NotificationSettings isOpen={true} onClose={onClose} />);

  const newNotifCheckbox = screen.getByLabelText('New Notifications');
  await act(async () => {
    fireEvent.click(newNotifCheckbox);
  });

  expect(mockUpdatePreferences).toHaveBeenCalledWith({ new_notification: false });
});

test('does not render settings if closed', () => {
  const onClose = vi.fn();
  const { container } = render(<NotificationSettings isOpen={false} onClose={onClose} />);
  expect(container.firstChild).toBeNull();
});

test('calls onClose when close buttons are clicked', () => {
  const onClose = vi.fn();
  render(<NotificationSettings isOpen={true} onClose={onClose} />);

  const closeButton = screen.getByText('×');
  fireEvent.click(closeButton);
  expect(onClose).toHaveBeenCalled();

  const doneButton = screen.getByText('Done');
  fireEvent.click(doneButton);
  expect(onClose).toHaveBeenCalledTimes(2);
});
