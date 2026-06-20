import { useState, useEffect } from 'react';

interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  new_notification: boolean;
  attendance_alert: boolean;
  appeal_status: boolean;
}

export function usePushNotifications() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
      setIsSupported(supported);
      return supported;
    };

    checkSupport();
  }, []);

  // Fetch notification preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const res = await fetch('/api/notifications/preferences');
        const data = await res.json();
        if (data.success) {
          setPreferences(data.data);
          // Check if already subscribed
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
          }
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const requestNotificationPermission = async () => {
    if (!isSupported) {
      alert('Push notifications are not supported in your browser');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  };

  const subscribeToPushNotifications = async () => {
    try {
      if (!isSupported) {
        throw new Error('Push notifications not supported');
      }

      const permission = await requestNotificationPermission();
      if (!permission) {
        throw new Error('Notification permission denied');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        )
      });

      // Save subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      if (response.ok) {
        setIsSubscribed(true);
        return true;
      }
      throw new Error('Failed to save subscription');
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });

        await subscription.unsubscribe();
        setIsSubscribed(false);
        return true;
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences)
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.data);
        return true;
      }
      throw new Error('Failed to update preferences');
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  };

  return {
    preferences,
    isSupported,
    isSubscribed,
    loading,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    updatePreferences,
    requestNotificationPermission
  };
}
