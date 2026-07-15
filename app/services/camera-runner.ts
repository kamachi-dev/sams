import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const DEFAULT_CAMERA_RUNNER_PATH = 'C:\\SAMS-MMCL\\Camera-Attendance-App\\run_camera.bat'

let cameraProcess: ChildProcess | null = null

function getCameraRunnerPath() {
    return process.env.CAMERA_RUNNER_PATH || DEFAULT_CAMERA_RUNNER_PATH
}

export function isCameraRunning() {
    return Boolean(cameraProcess?.pid && cameraProcess.exitCode === null)
}

export function startCamera() {
    if (isCameraRunning()) return true

    cameraProcess = spawn('cmd.exe', ['/d', '/s', '/c', getCameraRunnerPath()], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
    })
    cameraProcess.once('exit', () => { cameraProcess = null })
    cameraProcess.unref()
    return true
}

export async function stopCamera() {
    const pid = cameraProcess?.pid
    if (!pid) return false

    try {
        await execFileAsync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true })
    } finally {
        cameraProcess = null
    }
    return true
}
