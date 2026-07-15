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

CREATE TABLE IF NOT EXISTS camera_command (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    action TEXT NOT NULL CHECK (action IN ('start', 'stop')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'completed', 'failed')),
    requested_by TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    CONSTRAINT camera_command_requested_by_fkey
        FOREIGN KEY (requested_by) REFERENCES account(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS camera_command_pending_idx
    ON camera_command (requested_at)
    WHERE status = 'pending';
