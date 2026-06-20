import webpush from 'web-push';

const vapidSubject = process.env.NEXT_PUBLIC_VAPID_SUBJECT;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidSubject && vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn('VAPID details are not fully configured. Browser push notifications will not be sent.');
}

export async function sendPushNotification(
  subscription: any,
  title: string,
  options: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, any>;
  }
) {
  try {
    const payload = {
      title,
      ...options,
    };

    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    if (error.statusCode === 410) {
      // Subscription expired
      return { success: false, expired: true };
    }
    return { success: false, error: error.message };
  }
}

export async function sendBulkPushNotifications(
  subscriptions: any[],
  title: string,
  options: any
) {
  const results = await Promise.all(
    subscriptions.map(sub => sendPushNotification(sub, title, options))
  );

  return {
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    expired: results.filter(r => r.expired).length,
  };
}
