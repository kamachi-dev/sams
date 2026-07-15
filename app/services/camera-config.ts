import { readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_CONFIG_PATH = 'C:\\SAMS-MMCL\\Camera-Attendance-App\\config.ini'

export type CameraConfig = {
    room: string
    courseName: string
    section: string
    startTime: string
    endTime: string
}

export function getCameraConfigPath() {
    return process.env.CAMERA_CONFIG_PATH || DEFAULT_CONFIG_PATH
}

function getValue(contents: string, key: string): string {
    const cameraSection = contents.match(/\[Camera\]([\s\S]*?)(?=\r?\n\s*\[|$)/i)?.[1] ?? ''
    return cameraSection.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*?)\\s*$`, 'im'))?.[1] ?? ''
}

function setValue(contents: string, key: string, value: string): string {
    const sectionMatch = contents.match(/\[Camera\]([\s\S]*?)(?=\r?\n\s*\[|$)/i)
    if (!sectionMatch || sectionMatch.index === undefined) {
        const newline = contents.endsWith('\n') || !contents ? '' : '\n'
        return `${contents}${newline}\n[Camera]\n${key} = ${value}\n`
    }

    const sectionStart = sectionMatch.index
    const section = sectionMatch[0]
    const keyPattern = new RegExp(`^(\\s*${key}\\s*=).*?$`, 'im')
    const updatedSection = keyPattern.test(section)
        ? section.replace(keyPattern, `$1 ${value}`)
        : `${section}${section.endsWith('\n') ? '' : '\n'}${key} = ${value}`

    return `${contents.slice(0, sectionStart)}${updatedSection}${contents.slice(sectionStart + section.length)}`
}

export async function readCameraConfig(): Promise<CameraConfig> {
    const contents = await readFile(getCameraConfigPath(), 'utf8')
    return {
        room: getValue(contents, 'room').trim(),
        courseName: getValue(contents, 'course_name').trim(),
        section: getValue(contents, 'section').trim(),
        startTime: getValue(contents, 'start_time').trim(),
        endTime: getValue(contents, 'end_time').trim(),
    }
}

export async function writeCameraConfig(config: CameraConfig): Promise<void> {
    const configPath = getCameraConfigPath()
    const contents = await readFile(configPath, 'utf8')
    const updated = setValue(
        setValue(
            setValue(
                setValue(setValue(contents, 'room', config.room), 'course_name', config.courseName),
                'section',
                config.section,
            ),
            'start_time',
            config.startTime,
        ),
        'end_time', config.endTime,
    )
    const tempPath = path.join(path.dirname(configPath), `.${path.basename(configPath)}.${process.pid}.tmp`)
    await writeFile(tempPath, updated, 'utf8')
    await rename(tempPath, configPath)
}
