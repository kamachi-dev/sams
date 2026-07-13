"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "react-toastify";

export interface Notification {
  id: string;
  student_id: string;
  course_id: string;
  record_id: number | null;
  type: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  course_name: string;
}

interface UseNotificationsOptions {
  userId: string;
  pollInterval?: number; // ms, default 5000
  onNotificationsChange?: (notifications: Notification[]) => void;
}

export function useRealTimeNotifications({
  userId,
  pollInterval = 5000,
  onNotificationsChange,
}: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef<number>(0);
  const previousCountRef = useRef<number>(0);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/notifications?userId=${userId}&limit=50`
      );
      const data = await response.json();

      setNotifications(data.notifications);
      setUnreadCount(data.unread);

      // Show toast for new notifications
      if (previousCountRef.current > 0 && data.unread > previousCountRef.current) {
        const newNotifications = data.unread - previousCountRef.current;
        toast.info(
          `You have ${newNotifications} new notification${newNotifications > 1 ? "s" : ""}!`,
          { position: "bottom-right", autoClose: 3000 }
        );

        // Play notification sound if available
        playNotificationSound();
      }

      previousCountRef.current = data.unread;
      onNotificationsChange?.(data.notifications);
      lastFetchRef.current = Date.now();
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, onNotificationsChange]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
      toast.error("Failed to mark notification as read");
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications
        .filter((n) => !n.is_read)
        .map((n) => n.id);

      await Promise.all(
        unreadIds.map((id) =>
          fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationId: id }),
          })
        )
      );

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Error marking all as read:", err);
      toast.error("Failed to mark notifications as read");
    }
  }, [notifications]);

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [userId, fetchNotifications]);

  // Set up polling
  useEffect(() => {
    if (!userId) return;

    pollTimerRef.current = setInterval(() => {
      fetchNotifications();
    }, pollInterval);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [userId, pollInterval, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}

function playNotificationSound() {
  try {
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj=="
    );
    audio.volume = 0.3;
    audio.play().catch(() => {}); // Silently fail if audio fails
  } catch (err) {
    // Silent fail
  }
}
