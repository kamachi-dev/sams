export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import db from '@/app/services/database'
import { readCameraSettings, queueCameraCommand } from '@/app/services/camera-settings'
import { createNotificationWithPush } from '@/lib/createAndNotify'
import { sendAttendanceUpdateEmail } from '@/lib/email-notifications'

function getStartFromSchedule(schedule: unknown, date: Date): string | null {
    if (!schedule) return null
    try {
        const parsed = typeof schedule === 'string' ? JSON.parse(schedule) : schedule
        if (!parsed || typeof parsed !== 'object') return null

        const day = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        const classSchedule = (parsed as Record<string, { start?: string; end?: string }>)[day]
        return classSchedule?.start || null
    } catch {
        return null
    }
}

function getClassTime(schedule: unknown, date: string | Date): string | null {
    if (!schedule) return null

    try {
        const parsed = typeof schedule === 'string' ? JSON.parse(schedule) : schedule
        if (!parsed || typeof parsed !== 'object') return null

        const day = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        const classSchedule = (parsed as Record<string, { start?: string; end?: string }>)[day]
        if (!classSchedule?.start && !classSchedule?.end) return null
        return [classSchedule.start, classSchedule.end].filter(Boolean).join(' – ')
    } catch {
        return null
    }
}

export async function POST() {
    try {
        const user = await currentUser()
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

        const config = await readCameraSettings(user.id)
        if (!config.courseName || !config.section) {
            return NextResponse.json({ success: false, error: 'Active course and section not configured' }, { status: 400 })
        }

        // Resolve active section ID
        const sectionResult = await db.query(
            `SELECT s.id, s.schedule, c.name AS course_name, s.teacher, s.classroom
             FROM section s
             INNER JOIN course c ON s.course = c.id
             WHERE c.name = $1 AND s.name = $2
               AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
            [config.courseName, config.section]
        )

        if (sectionResult.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Active section not found' }, { status: 404 })
        }
        const sectionInfo = sectionResult.rows[0]
        const sectionId = sectionInfo.id
        const sectionSchedule = sectionInfo.schedule
        const courseName = sectionInfo.course_name
        const teacherId = sectionInfo.teacher
        const roomId = sectionInfo.classroom

        // Get enrolled students
        const enrolledResult = await db.query(
            `SELECT ed.student as student_id, acc.username as student_name
             FROM enrollment_data ed
             INNER JOIN account acc ON ed.student = acc.id
             WHERE ed.section = $1`,
            [sectionId]
        )
        const enrolledStudents = enrolledResult.rows

        if (enrolledStudents.length === 0) {
            return NextResponse.json({ success: false, error: 'No enrolled students found for this section' }, { status: 400 })
        }

        // Get detections for this session
        const detectionsResult = await db.query(
            `SELECT student_id, MAX(confidence) as max_confidence, MIN(detected_at) as first_seen
             FROM camera_session_detections
             WHERE course_id = $1
             GROUP BY student_id`,
            [sectionId]
        )
        const detections = detectionsResult.rows
        const detectionMap = new Map(
            detections.map(d => [
                d.student_id,
                { maxConfidence: d.max_confidence, firstSeen: new Date(d.first_seen) }
            ])
        )

        const now = new Date()
        let refStart = config.startTime
        if (!refStart) {
            refStart = getStartFromSchedule(sectionSchedule, now) || ''
        }

        const client = await db.connect()
        const insertedRecords: any[] = []
        try {
            await client.query('BEGIN')
            for (const student of enrolledStudents) {
                const det = detectionMap.get(student.student_id)
                let status = 1 // default present
                let confidence = 0
                let recordTime = now

                if (det) {
                    confidence = det.maxConfidence
                    recordTime = det.firstSeen
                    status = 1 // present

                    if (refStart) {
                        const [sHour, sMin] = refStart.split(':').map(Number)
                        const startDateTime = new Date(recordTime)
                        startDateTime.setHours(sHour, sMin, 0, 0)
                        const graceEnd = new Date(startDateTime.getTime() + 5 * 60 * 1000)
                        status = recordTime > graceEnd ? 2 : 1 // Late if past grace period
                    }
                } else {
                    // Absent
                    status = 0
                    confidence = 0
                    recordTime = now
                }

                const result = await client.query(
                    `INSERT INTO record (student, course, attendance, confidence, time)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id, student, course, attendance, time`,
                    [student.student_id, sectionId, status, confidence, recordTime]
                )
                if (result.rows.length > 0) {
                    insertedRecords.push(result.rows[0])
                }
            }
            await client.query('COMMIT')
        } catch (err) {
            await client.query('ROLLBACK')
            throw err
        } finally {
            client.release()
        }

        // Trigger notifications and email sending in background (non-blocking)
        Promise.resolve().then(async () => {
            try {
                for (const record of insertedRecords) {
                    const studentAccountResult = await db.query('SELECT username FROM account WHERE id = $1', [record.student])
                    const studentName = studentAccountResult.rows[0]?.username || 'Student'

                    const teacherAccountResult = teacherId
                        ? await db.query('SELECT username FROM account WHERE id = $1', [teacherId])
                        : null
                    const teacherName = teacherAccountResult?.rows[0]?.username || null

                    const classTime = getClassTime(sectionSchedule, record.time)
                    const recordedTime = new Date(record.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    const recordedDate = new Date(record.time).toLocaleDateString()

                    let studentTitle = ''
                    let studentMessage = ''
                    let parentTitle = ''
                    let parentMessage = ''
                    let teacherTitle = ''
                    let teacherMessage = ''

                    if (record.attendance === 1) {
                        studentTitle = 'Present Attendance Recorded'
                        studentMessage = `You were marked as present for ${courseName} at ${recordedTime}`
                        parentTitle = 'Child Present'
                        parentMessage = `Your child was marked as present for ${courseName} at ${recordedTime}`
                        teacherTitle = 'Attendance: Present'
                        teacherMessage = `${studentName} marked present for ${courseName} at ${recordedTime}`
                    } else if (record.attendance === 2) {
                        studentTitle = 'Late Attendance Recorded'
                        studentMessage = `You were marked as late for ${courseName} at ${recordedTime}`
                        parentTitle = 'Child Late'
                        parentMessage = `Your child was marked as late for ${courseName} at ${recordedTime}`
                        teacherTitle = 'Attendance: Late'
                        teacherMessage = `${studentName} marked late for ${courseName} at ${recordedTime}`
                    } else if (record.attendance === 0) {
                        studentTitle = 'Absence Recorded'
                        studentMessage = `You were marked as absent for ${courseName} on ${recordedDate}`
                        parentTitle = 'Child Absent'
                        parentMessage = `Your child was marked as absent for ${courseName} on ${recordedDate}`
                        teacherTitle = 'Attendance: Absent'
                        teacherMessage = `${studentName} marked absent for ${courseName} on ${recordedDate}`
                    }

                    // 1️⃣ NOTIFY STUDENT
                    await createNotificationWithPush({
                        studentId: record.student,
                        courseId: record.course,
                        recordId: record.id,
                        type: 0,
                        title: studentTitle,
                        message: studentMessage,
                        sendPush: true
                    })

                    // 2️⃣ NOTIFY PARENTS
                    const parentResult = await db.query(
                        `SELECT parent FROM student_data WHERE student = $1 AND parent IS NOT NULL`,
                        [record.student]
                    )
                    for (const pRow of parentResult.rows) {
                        await createNotificationWithPush({
                            studentId: pRow.parent,
                            courseId: record.course,
                            recordId: record.id,
                            type: 0,
                            title: parentTitle,
                            message: parentMessage,
                            sendPush: true
                        })
                    }

                    // 3️⃣ NOTIFY TEACHER
                    if (teacherId) {
                        await createNotificationWithPush({
                            studentId: teacherId,
                            courseId: record.course,
                            recordId: record.id,
                            type: 0,
                            title: teacherTitle,
                            message: teacherMessage,
                            sendPush: true
                        })
                    }

                    await sendAttendanceUpdateEmail({
                        studentId: record.student,
                        parentIds: parentResult.rows.map((row: any) => row.parent),
                        teacherId,
                        studentName,
                        courseName,
                        teacherName,
                        roomId,
                        classTime,
                        status: record.attendance === 1 ? 'present' : record.attendance === 2 ? 'late' : 'absent',
                        recordedTime,
                        recordedDate,
                    })
                }
            } catch (notifyErr) {
                console.error('Error sending attendance notification:', notifyErr)
            }
        })

        // Clear temporary detections
        await db.query('DELETE FROM camera_session_detections WHERE course_id = $1', [sectionId])

        // Stop the camera agent
        await queueCameraCommand('stop', user.id)

        return NextResponse.json({
            success: true,
            message: `Attendance finalized. ${insertedRecords.length} records written to database.`
        })
    } catch (error) {
        console.error('Error finalising attendance:', error)
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to finalize attendance' }, { status: 500 })
    }
}
