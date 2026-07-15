import db from '@/app/services/database'

export type CameraSettings = {
    room: string
    courseName: string
    section: string
    startTime: string
    endTime: string
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

export async function readCameraSettings(): Promise<CameraSettings> {
    const result = await db.query(
        'SELECT room, course_name, section, start_time, end_time FROM camera_settings WHERE id = 1',
    )
    return toSettings(result.rows[0])
}

export async function writeCameraSettings(config: CameraSettings, updatedBy: string): Promise<void> {
    await db.query(
        `INSERT INTO camera_settings (id, room, course_name, section, start_time, end_time, updated_by)
         VALUES (1, $1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
             room = EXCLUDED.room,
             course_name = EXCLUDED.course_name,
             section = EXCLUDED.section,
             start_time = EXCLUDED.start_time,
             end_time = EXCLUDED.end_time,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()`,
        [config.room, config.courseName, config.section, config.startTime, config.endTime, updatedBy],
    )
}
