export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import db from '@/app/services/database'
import { readCameraSettings } from '@/app/services/camera-settings'

export async function GET() {
    try {
        const user = await currentUser()
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

        const config = await readCameraSettings(user.id)
        if (!config.courseName || !config.section) {
            return NextResponse.json({ success: true, data: { detected: [], undetected: [] } })
        }

        // Resolve active section ID
        const sectionResult = await db.query(
            `SELECT s.id
             FROM section s
             INNER JOIN course c ON s.course = c.id
             WHERE c.name = $1 AND s.name = $2 AND s.teacher = $3
               AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
            [config.courseName, config.section, user.id]
        )

        if (sectionResult.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Active section not found' }, { status: 404 })
        }
        const sectionId = sectionResult.rows[0].id

        // Get enrolled students
        const enrolledResult = await db.query(
            `SELECT ed.student as student_id, acc.username as student_name
             FROM enrollment_data ed
             INNER JOIN account acc ON ed.student = acc.id
             WHERE ed.section = $1
             ORDER BY acc.username`,
            [sectionId]
        )
        const enrolledStudents = enrolledResult.rows

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
                { maxConfidence: d.max_confidence, firstSeen: d.first_seen }
            ])
        )

        const detected: any[] = []
        const undetected: any[] = []

        for (const student of enrolledStudents) {
            const det = detectionMap.get(student.student_id)
            if (det && Number(det.maxConfidence) > 0) {
                detected.push({
                    studentId: student.student_id,
                    studentName: student.student_name,
                    maxConfidence: det.maxConfidence,
                    firstSeen: det.firstSeen
                })
            } else {
                undetected.push({
                    studentId: student.student_id,
                    studentName: student.student_name
                })
            }
        }

        return NextResponse.json({ success: true, data: { detected, undetected } })
    } catch (error) {
        console.error('Error fetching camera detections:', error)
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch camera detections' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await currentUser()
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

        const config = await readCameraSettings(user.id)
        if (!config.courseName || !config.section) {
            return NextResponse.json({ success: false, error: 'Active course and section not configured' }, { status: 400 })
        }

        const body = await request.json()
        const records = Array.isArray(body.records) ? body.records : []
        if (records.length > 100) {
            return NextResponse.json({ success: false, error: 'Too many detections in one request' }, { status: 400 })
        }

        const sectionResult = await db.query(
            `SELECT s.id
             FROM section s
             INNER JOIN course c ON s.course = c.id
             WHERE c.name = $1 AND s.name = $2 AND s.teacher = $3
               AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
            [config.courseName, config.section, user.id]
        )
        if (sectionResult.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Active section not found' }, { status: 404 })
        }
        const sectionId = sectionResult.rows[0].id

        const validRecords = records.flatMap((record: any) => {
            if (!record || typeof record.student !== 'string' || !record.student.trim()) return []
            const confidence = Number(record.confidence)
            if (!Number.isFinite(confidence) || confidence <= 0) return []
            return [{ studentId: record.student.trim(), confidence: Math.max(0, Math.min(1, confidence > 1 ? confidence / 100 : confidence)) }]
        })
        const studentIds = [...new Set(validRecords.map((record: { studentId: string }) => record.studentId))]
        if (studentIds.length === 0) {
            return NextResponse.json({ success: true, data: { storedCount: 0, ignoredCount: records.length } })
        }

        const enrolledResult = await db.query(
            `SELECT student::text AS student_id
             FROM enrollment_data
             WHERE section = $1 AND student::text = ANY($2::text[])`,
            [sectionId, studentIds]
        )
        const enrolledIds = new Set(enrolledResult.rows.map((row: { student_id: string }) => row.student_id))
        const client = await db.connect()
        let storedCount = 0
        try {
            await client.query('BEGIN')
            for (const record of validRecords) {
                if (!enrolledIds.has(record.studentId)) continue
                await client.query(
                    `INSERT INTO camera_session_detections (course_id, student_id, confidence, detected_at)
                     VALUES ($1, $2, $3, NOW())`,
                    [sectionId, record.studentId, record.confidence]
                )
                storedCount += 1
            }
            await client.query('COMMIT')
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }

        return NextResponse.json({
            success: true,
            data: { storedCount, ignoredCount: records.length - storedCount }
        })
    } catch (error) {
        console.error('Error storing camera detections:', error)
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to store camera detections' }, { status: 500 })
    }
}
