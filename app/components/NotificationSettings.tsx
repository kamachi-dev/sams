'use client';

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/lib/usePushNotifications';
import { BellIcon, CheckIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import './NotificationSettings.css';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const {
    preferences,
    isSupported,
    isSubscribed,
    loading,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    updatePreferences
  } = usePushNotifications();

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleTogglePushEnabled = async () => {
    if (!preferences) return;
    setIsSaving(true);
    const newValue = !preferences.push_enabled;
    
    if (newValue && !isSubscribed) {
      // Enable push - subscribe first
      const success = await subscribeToPushNotifications();
      if (success) {
        await updatePreferences({ push_enabled: true });
      }
    } else if (!newValue) {
      // Disable push - unsubscribe
      await unsubscribeFromPushNotifications();
      await updatePreferences({ push_enabled: false });
    }
    setIsSaving(false);
  };

  const handleTogglePreference = async (key: keyof typeof preferences, value: boolean) => {
    if (!preferences) return;
    setIsSaving(true);
    await updatePreferences({ [key]: value });
    setIsSaving(false);
  };

  if (loading) {
    return (
      <div className="notification-modal-overlay" onClick={onClose}>
        <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-modal-overlay" onClick={onClose}>
      <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notification-modal-header">
          <div className="notification-modal-title">
            <BellIcon />
            <h2>Notification Preferences</h2>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="notification-modal-content">
          {!isSupported ? (
            <div className="notification-warning">
              <CrossCircledIcon />
              <p>Push notifications are not supported in your browser</p>
            </div>
          ) : (
            <>
              {/* Main Push Notifications Toggle */}
              <div className="settings-section">
                <h3>Push Notifications</h3>
                <div className="setting-item">
                  <div className="setting-label">
                    <label htmlFor="push-enabled">Enable Push Notifications</label>
                    <p className="setting-description">
                      Get real-time alerts on your device
                    </p>
                  </div>
                  <div className="setting-toggle">
                    {preferences?.push_enabled ? <CheckIcon /> : <CrossCircledIcon />}
                    <input
                      id="push-enabled"
                      type="checkbox"
                      checked={preferences?.push_enabled || false}
                      onChange={handleTogglePushEnabled}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>

              {/* Notification Type Preferences */}
              {preferences?.push_enabled && (
                <div className="settings-section">
                  <h3>Notification Types</h3>
                  
                  <div className="setting-item">
                    <div className="setting-label">
                      <label htmlFor="new-notification">New Notifications</label>
                      <p className="setting-description">
                        Alerts when you receive a new message or notification
                      </p>
                    </div>
                    <div className="setting-toggle">
                      {preferences?.new_notification ? <CheckIcon /> : <CrossCircledIcon />}
                      <input
                        id="new-notification"
                        type="checkbox"
                        checked={preferences?.new_notification || false}
                        onChange={(e) => handleTogglePreference('new_notification', e.target.checked)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="setting-item">
                    <div className="setting-label">
                      <label htmlFor="attendance-alert">Attendance Alerts</label>
                      <p className="setting-description">
                        Get notified about attendance issues and low rates
                      </p>
                    </div>
                    <div className="setting-toggle">
                      {preferences?.attendance_alert ? <CheckIcon /> : <CrossCircledIcon />}
                      <input
                        id="attendance-alert"
                        type="checkbox"
                        checked={preferences?.attendance_alert || false}
                        onChange={(e) => handleTogglePreference('attendance_alert', e.target.checked)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="setting-item">
                    <div className="setting-label">
                      <label htmlFor="appeal-status">Appeal Status</label>
                      <p className="setting-description">
                        Updates when your appeals are reviewed
                      </p>
                    </div>
                    <div className="setting-toggle">
                      {preferences?.appeal_status ? <CheckIcon /> : <CrossCircledIcon />}
                      <input
                        id="appeal-status"
                        type="checkbox"
                        checked={preferences?.appeal_status || false}
                        onChange={(e) => handleTogglePreference('appeal_status', e.target.checked)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="setting-item">
                    <div className="setting-label">
                      <label htmlFor="daily-summary">Daily Summary</label>
                      <p className="setting-description">
                        Receive a summary of your day's events
                      </p>
                    </div>
                    <div className="setting-toggle">
                      {preferences?.daily_summary ? <CheckIcon /> : <CrossCircledIcon />}
                      <input
                        id="daily-summary"
                        type="checkbox"
                        checked={preferences?.daily_summary || false}
                        onChange={(e) => handleTogglePreference('daily_summary', e.target.checked)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Preferences */}
              <div className="settings-section">
                <h3>Email Notifications</h3>
                <div className="setting-item">
                  <div className="setting-label">
                    <label htmlFor="email-enabled">Enable Email Notifications</label>
                    <p className="setting-description">
                      Receive important updates via email
                    </p>
                  </div>
                  <div className="setting-toggle">
                    {preferences?.email_enabled ? <CheckIcon /> : <CrossCircledIcon />}
                    <input
                      id="email-enabled"
                      type="checkbox"
                      checked={preferences?.email_enabled || false}
                      onChange={(e) => handleTogglePreference('email_enabled', e.target.checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>

              {/* Subscription Status */}
              <div className="subscription-status">
                {isSubscribed ? (
                  <div className="status-success">
                    <CheckIcon />
                    <p>Push notifications are active</p>
                  </div>
                ) : (
                  <div className="status-info">
                    <p>Enable push notifications to receive alerts on your device</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="notification-modal-footer">
          <button className="btn-close" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
