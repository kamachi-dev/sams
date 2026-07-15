import { beforeEach, expect, test, vi } from 'vitest'
import { currentUser } from '@clerk/nextjs/server'
import { queueCameraCommand, readLatestCameraCommand } from '@/app/services/camera-settings'
import { GET, POST } from './route'

vi.mock('@clerk/nextjs/server', () => ({ currentUser: vi.fn() }))
vi.mock('@/app/services/camera-settings', () => ({
    queueCameraCommand: vi.fn(),
    readLatestCameraCommand: vi.fn(),
}))

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(currentUser).mockResolvedValue({ id: 'teacher_123' } as any)
})

test('GET reports the last completed camera command state', async () => {
    vi.mocked(readLatestCameraCommand).mockResolvedValue({ id: 1, action: 'start', status: 'completed' })

    const response = await GET()
    expect(await response.json()).toEqual({ success: true, data: { running: true, pending: false } })
})

test('POST queues a start command for the on-premises agent', async () => {
    vi.mocked(queueCameraCommand).mockResolvedValue({ id: 1, action: 'start', status: 'pending' })
    const response = await POST(new Request('http://localhost/api/teacher/camera-control', {
        method: 'POST', body: JSON.stringify({ action: 'start' }),
    }))

    expect(response.status).toBe(200)
    expect(queueCameraCommand).toHaveBeenCalledWith('start', 'teacher_123')
    expect(await response.json()).toEqual({ success: true, data: { running: true, pending: true } })
})

test('POST queues a stop command for the on-premises agent', async () => {
    vi.mocked(queueCameraCommand).mockResolvedValue({ id: 2, action: 'stop', status: 'pending' })
    const response = await POST(new Request('http://localhost/api/teacher/camera-control', {
        method: 'POST', body: JSON.stringify({ action: 'stop' }),
    }))

    expect(response.status).toBe(200)
    expect(queueCameraCommand).toHaveBeenCalledWith('stop', 'teacher_123')
    expect(await response.json()).toEqual({ success: true, data: { running: false, pending: true } })
})
