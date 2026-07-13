"use client";

import { useState } from "react";
import { useRealTimeNotifications, Notification } from "@/lib/useRealTimeNotifications";
import { useUser } from "@clerk/nextjs";
import "./NotificationCenter.css";

export function NotificationCenter() {
  const { user } = useUser();
  const [showDropdown, setShowDropdown] = useState(false);

  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead 
  } = useRealTimeNotifications({
    userId: user?.id || "",
    pollInterval: 5000, // Poll every 5 seconds
  });

  if (!user) return null;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
  };

  const getNotificationType = (type: number) => {
    const types: { [key: number]: string } = {
      0: "attendance",
      1: "appeal",
      2: "announcement",
      3: "alert",
    };
    return types[type] || "notification";
  };

  return (
    <div className="notification-center">
      {/* Notification Bell Icon */}
      <div className="notification-bell-container">
        <button
          className="notification-bell"
          onClick={() => setShowDropdown(!showDropdown)}
          aria-label="Notifications"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
          )}
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="notification-dropdown">
            <div className="notification-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button
                  className="mark-all-read-btn"
                  onClick={() => {
                    markAllAsRead();
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="notification-list">
              {loading && notifications.length === 0 ? (
                <div className="notification-loading">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="notification-empty">No notifications yet</div>
              ) : (
                notifications.slice(0, 10).map((notif) => (
                  <div
                    key={notif.id}
                    className={`notification-item ${notif.is_read ? "read" : "unread"}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="notification-content">
                      <div className="notification-type">
                        {getNotificationType(notif.type)}
                      </div>
                      <h4 className="notification-title">{notif.title}</h4>
                      <p className="notification-message">{notif.message}</p>
                      {notif.course_name && (
                        <p className="notification-course">{notif.course_name}</p>
                      )}
                      <small className="notification-time">
                        {new Date(notif.created_at).toLocaleString()}
                      </small>
                    </div>
                    {!notif.is_read && <div className="notification-unread-dot" />}
                  </div>
                ))
              )}
            </div>

            {notifications.length > 10 && (
              <div className="notification-footer">
                <button onClick={() => setShowDropdown(false)}>View All</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
