import db from '@/app/services/database'

export type CameraSettings = {
    room: string
    courseName: string
    section: string
    startTime: string
    endTime: string
}

export type CameraCommand = {
    id: number
    action: 'start' | 'stop' | 'snapshot'
    status: 'pending' | 'claimed' | 'completed' | 'failed'
    requested_by?: string | null
}

const EMPTY_SETTINGS: CameraSettings = {
    room: '',
    courseName: '',
    section: '',
    startTime: '',
    endTime: '',
}

function toSettings(row: Record<string, unknown> | undefined): CameraSettings {
    if (!row) return EMPTY_SETTINGS
    return {
        room: String(row.room ?? '').trim(),
        courseName: String(row.course_name ?? '').trim(),
        section: String(row.section ?? '').trim(),
        startTime: String(row.start_time ?? '').trim(),
        endTime: String(row.end_time ?? '').trim(),
    }
}

export async function readCameraSettings(teacherId?: string): Promise<CameraSettings> {
    if (teacherId) {
        const result = await db.query(
            'SELECT room, course_name, section, start_time, end_time FROM teacher_camera_settings WHERE teacher_id = $1',
            [teacherId],
        )
        if (result.rows[0]) return toSettings(result.rows[0])
    }
    const result = await db.query(
        'SELECT room, course_name, section, start_time, end_time FROM camera_settings WHERE id = 1',
    )
    return toSettings(result.rows[0])
}

export async function writeCameraSettings(config: CameraSettings, updatedBy: string): Promise<void> {
    await db.query(
        `INSERT INTO teacher_camera_settings (teacher_id, room, course_name, section, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (teacher_id) DO UPDATE SET
             room = EXCLUDED.room,
             course_name = EXCLUDED.course_name,
             section = EXCLUDED.section,
             start_time = EXCLUDED.start_time,
             end_time = EXCLUDED.end_time,
             updated_at = NOW()`,
         [updatedBy, config.room, config.courseName, config.section, config.startTime, config.endTime],
     )
}

export async function queueCameraCommand(action: 'start' | 'stop' | 'snapshot', requestedBy: string): Promise<CameraCommand> {
    const result = await db.query(
        `INSERT INTO camera_command (action, requested_by)
         VALUES ($1, $2)
         RETURNING id, action, status`,
        [action, requestedBy],
    )
    return result.rows[0] as CameraCommand
}

export async function claimNextCameraCommand(teacherId?: string): Promise<CameraCommand | null> {
    const result = await db.query(
        `WITH next_command AS (
            SELECT id
            FROM camera_command
            WHERE status = 'pending'
              AND ($1::text IS NULL OR requested_by = $1)
            ORDER BY requested_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
         )
         UPDATE camera_command AS command
         SET status = 'claimed', claimed_at = NOW()
         FROM next_command
         WHERE command.id = next_command.id
         RETURNING command.id, command.action, command.status, command.requested_by`,
        [teacherId ?? null],
    )
    const row = result.rows[0] as CameraCommand | undefined
    return row ?? null
}

export async function completeCameraCommand(id: number, succeeded: boolean, error = ''): Promise<void> {
    await db.query(
        `UPDATE camera_command
         SET status = $2, completed_at = NOW(), error = $3
         WHERE id = $1 AND status = 'claimed'`,
        [id, succeeded ? 'completed' : 'failed', error.slice(0, 1000)],
    )
}

export async function readLatestCameraCommand(teacherId?: string): Promise<CameraCommand | null> {
    const result = await db.query(
        `SELECT id, action, status
         FROM camera_command
         WHERE $1::text IS NULL OR requested_by = $1
         ORDER BY requested_at DESC
         LIMIT 1`,
        [teacherId ?? null],
    )
    return (result.rows[0] as CameraCommand | undefined) ?? null
}
