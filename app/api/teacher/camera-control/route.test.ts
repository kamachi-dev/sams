import { beforeEach, expect, test, vi } from 'vitest'
import { currentUser } from '@clerk/nextjs/server'
import { isCameraRunning, startCamera, stopCamera } from '@/app/services/camera-runner'
import { GET, POST } from './route'

vi.mock('@clerk/nextjs/server', () => ({ currentUser: vi.fn() }))
vi.mock('@/app/services/camera-runner', () => ({
    isCameraRunning: vi.fn(),
    startCamera: vi.fn(),
    stopCamera: vi.fn(),
}))

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(currentUser).mockResolvedValue({ id: 'teacher_123' } as any)
})

test('GET reports whether the managed camera process is running', async () => {
    vi.mocked(isCameraRunning).mockReturnValue(true)

    const response = await GET()
    expect(await response.json()).toEqual({ success: true, data: { running: true } })
})

test('POST starts the camera', async () => {
    const response = await POST(new Request('http://localhost/api/teacher/camera-control', {
        method: 'POST', body: JSON.stringify({ action: 'start' }),
    }))

    expect(response.status).toBe(200)
    expect(startCamera).toHaveBeenCalledOnce()
    expect(await response.json()).toEqual({ success: true, data: { running: true } })
})

test('POST stops the camera process tree', async () => {
    vi.mocked(stopCamera).mockResolvedValue(true)

    const response = await POST(new Request('http://localhost/api/teacher/camera-control', {
        method: 'POST', body: JSON.stringify({ action: 'stop' }),
    }))

    expect(response.status).toBe(200)
    expect(stopCamera).toHaveBeenCalledOnce()
    expect(await response.json()).toEqual({ success: true, data: { running: false } })
})
