-- Database Schema for Push Notification System
-- Execute these SQL statements in your PostgreSQL database

-- Core notification table for storing notifications
CREATE TABLE IF NOT EXISTS notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    course_id UUID NOT NULL,
    record_id BIGINT,
    type SMALLINT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    FOREIGN KEY (student_id) REFERENCES account(id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES section(id) ON DELETE CASCADE,
    FOREIGN KEY (record_id) REFERENCES record(id) ON DELETE CASCADE
);

-- Table for storing notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    new_notification BOOLEAN DEFAULT true,
    attendance_alert BOOLEAN DEFAULT true,
    appeal_status BOOLEAN DEFAULT true,
    daily_summary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES account(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Table for storing push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    auth VARCHAR(500) NOT NULL,
    p256dh VARCHAR(500) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, endpoint),
    FOREIGN KEY (user_id) REFERENCES account(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notification_student_id 
    ON notification(student_id);

CREATE INDEX IF NOT EXISTS idx_notification_course_id 
    ON notification(course_id);

CREATE INDEX IF NOT EXISTS idx_notification_is_read 
    ON notification(is_read);

CREATE INDEX IF NOT EXISTS idx_notification_created_at 
    ON notification(created_at);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
    ON notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
    ON push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active 
    ON push_subscriptions(active);
