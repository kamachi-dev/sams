import { beforeEach, expect, test, vi } from 'vitest'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'
import { readCameraSettings, writeCameraSettings } from '@/app/services/camera-settings'
import { GET, PUT } from './route'

vi.mock('@clerk/nextjs/server', () => ({ currentUser: vi.fn() }))
vi.mock('@/app/services/camera-settings', () => ({
    readCameraSettings: vi.fn(),
    writeCameraSettings: vi.fn(),
}))

beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
})

test('GET returns the assigned-room default when no room is configured', async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 'teacher_123' } as any)
    vi.mocked(readCameraSettings).mockResolvedValue({ room: '', courseName: '', section: '', startTime: '', endTime: '' })
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [
        { classroom: 'R314', course_name: 'Science', section_name: 'A' },
        { classroom: 'R315', course_name: 'Math', section_name: 'B' },
    ] } as any)

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data).toMatchObject({ room: 'R314', defaultRoom: 'R314', roomOptions: ['R314', 'R315'], hasScheduleOverride: false })
})

test('PUT clears both config times when the database schedule is selected', async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 'teacher_123' } as any)
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ classroom: 'R314', course_name: 'Science', section_name: 'A' }] } as any)

    const response = await PUT(new Request('http://localhost/api/teacher/camera-config', {
        method: 'PUT',
        body: JSON.stringify({ room: 'R314', courseName: 'Science', section: 'A', startTime: '09:00', endTime: '10:00', useScheduleOverride: false }),
    }))

    expect(response.status).toBe(200)
    expect(writeCameraSettings).toHaveBeenCalledWith({ room: 'R314', courseName: 'Science', section: 'A', startTime: '', endTime: '' }, 'teacher_123')
})

test('PUT rejects a room the teacher is not assigned to', async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 'teacher_123' } as any)
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ classroom: 'R314', course_name: 'Science', section_name: 'A' }] } as any)

    const response = await PUT(new Request('http://localhost/api/teacher/camera-config', {
        method: 'PUT',
        body: JSON.stringify({ room: 'R999', useScheduleOverride: false }),
    }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Choose one of your assigned rooms.')
    expect(writeCameraSettings).not.toHaveBeenCalled()
})
