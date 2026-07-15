import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const DEFAULT_CAMERA_RUNNER_PATH = 'C:\\SAMS-MMCL\\Camera-Attendance-App\\run_camera.bat'
const GRACEFUL_STOP_TIMEOUT_MS = 60_000

let cameraProcess: ChildProcess | null = null

function getCameraRunnerPath() {
    return process.env.CAMERA_RUNNER_PATH || DEFAULT_CAMERA_RUNNER_PATH
}

function getGracefulStopScriptPath() {
    return join(dirname(getCameraRunnerPath()), 'request_camera_stop.bat')
}

function waitForCameraExit(camera: ChildProcess) {
    return new Promise<void>((resolve, reject) => {
        if (camera.exitCode !== null) {
            resolve()
            return
        }

        const timeout = setTimeout(() => {
            cleanup()
            reject(new Error('Camera shutdown timed out while final attendance records were posting.'))
        }, GRACEFUL_STOP_TIMEOUT_MS)

        const cleanup = () => {
            clearTimeout(timeout)
            camera.removeListener('exit', onExit)
            camera.removeListener('error', onError)
        }
        const onExit = () => {
            cleanup()
            resolve()
        }
        const onError = (error: Error) => {
            cleanup()
            reject(error)
        }

        camera.once('exit', onExit)
        camera.once('error', onError)
    })
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
    const camera = cameraProcess
    if (!camera?.pid || camera.exitCode !== null) return false

    await execFileAsync('cmd.exe', ['/d', '/s', '/c', getGracefulStopScriptPath()], { windowsHide: true })
    await waitForCameraExit(camera)
    return true
}
