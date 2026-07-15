-- Shared camera settings for the deployed web app and the on-premises camera agent.
CREATE TABLE IF NOT EXISTS camera_settings (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    room TEXT NOT NULL DEFAULT '',
    course_name TEXT NOT NULL DEFAULT '',
    section TEXT NOT NULL DEFAULT '',
    start_time TEXT NOT NULL DEFAULT '',
    end_time TEXT NOT NULL DEFAULT '',
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT camera_settings_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES account(id) ON UPDATE CASCADE ON DELETE SET NULL
);
