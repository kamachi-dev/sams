-- Per-teacher camera settings so each teacher/agent has their own config
CREATE TABLE IF NOT EXISTS teacher_camera_settings (
    teacher_id TEXT PRIMARY KEY,
    room TEXT NOT NULL DEFAULT '',
    course_name TEXT NOT NULL DEFAULT '',
    section TEXT NOT NULL DEFAULT '',
    start_time TEXT NOT NULL DEFAULT '',
    end_time TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on camera_command.requested_by for faster per-teacher command claiming
CREATE INDEX IF NOT EXISTS camera_command_requested_by_idx
    ON camera_command (requested_by, requested_at)
    WHERE status = 'pending';
