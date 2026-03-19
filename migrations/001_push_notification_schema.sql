-- Database Schema for Push Notification System
-- Execute these SQL statements in your PostgreSQL database

-- Table for storing notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    new_notification BOOLEAN DEFAULT true,
    attendance_alert BOOLEAN DEFAULT true,
    appeal_status BOOLEAN DEFAULT true,
    daily_summary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    auth VARCHAR(500) NOT NULL,
    p256dh VARCHAR(500) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, endpoint)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
    ON notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
    ON push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active 
    ON push_subscriptions(active);

-- Table for storing notification history (optional, for analytics)
CREATE TABLE IF NOT EXISTS notification_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50),
    title TEXT,
    message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_history_user_id 
    ON notification_history(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at 
    ON notification_history(sent_at);
