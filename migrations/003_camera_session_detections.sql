-- Table to store temporary detections during the active class hour
CREATE TABLE IF NOT EXISTS camera_session_detections (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update the check constraint on camera_command.action to allow 'snapshot'
ALTER TABLE camera_command DROP CONSTRAINT IF EXISTS camera_command_action_check;
ALTER TABLE camera_command ADD CONSTRAINT camera_command_action_check CHECK (action IN ('start', 'stop', 'snapshot'));
