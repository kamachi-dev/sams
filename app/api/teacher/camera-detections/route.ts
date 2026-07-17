export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import db from '@/app/services/database'
import { readCameraSettings } from '@/app/services/camera-settings'

export async function GET() {
    try {
        const user = await currentUser()
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

        const config = await readCameraSettings()
        if (!config.courseName || !config.section) {
            return NextResponse.json({ success: true, data: { detected: [], undetected: [] } })
        }

        // Resolve active section ID
        const sectionResult = await db.query(
            `SELECT s.id
             FROM section s
             INNER JOIN course c ON s.course = c.id
             WHERE c.name = $1 AND s.name = $2
               AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
            [config.courseName, config.section]
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
            if (det) {
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
