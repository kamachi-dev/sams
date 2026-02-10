export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'

// POST - Add student(s) to a course
export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const courseId = String(formData.get('courseId') ?? '').trim()
        const studentsRaw = String(formData.get('students') ?? '').trim()

        if (!courseId) {
            return NextResponse.json({ success: false, status: 400, data: null, error: 'Course id required' }, { status: 400 })
        }

        if (!studentsRaw) {
            return NextResponse.json({ success: false, status: 400, data: null, error: 'Student ids required' }, { status: 400 })
        }

        const ids = studentsRaw.split(',').map(s => s.trim()).filter(Boolean)
        if (!ids.length) {
            return NextResponse.json({ success: false, status: 400, data: null, error: 'No valid student ids' }, { status: 400 })
        }

        // Insert enrollments, ignoring duplicates
        const values = ids.map((id, i) => `($1, $${i + 2})`).join(', ')
        await db.query(
            `INSERT INTO enrollment_data (course, student) VALUES ${values} ON CONFLICT DO NOTHING`,
            [courseId, ...ids]
        )

        return NextResponse.json({ success: true, status: 200, data: { enrolled: ids.length }, error: null })
    } catch (error) {
        console.error('Error adding students to course:', error)
        return NextResponse.json({ success: false, status: 500, data: { message: String(error) }, error: 'Failed to add students' })
    }
}

// DELETE - Remove student(s) from a course
export async function DELETE(req: Request) {
    try {
        const formData = await req.formData()
        const courseId = String(formData.get('courseId') ?? '').trim()
        const studentId = String(formData.get('studentId') ?? '').trim()

        if (!courseId) {
            return NextResponse.json({ success: false, status: 400, data: null, error: 'Course id required' }, { status: 400 })
        }

        if (!studentId) {
            return NextResponse.json({ success: false, status: 400, data: null, error: 'Student id required' }, { status: 400 })
        }

        await db.query(
            `DELETE FROM enrollment_data WHERE course = $1 AND student = $2`,
            [courseId, studentId]
        )

        return NextResponse.json({ success: true, status: 200, data: { removed: studentId }, error: null })
    } catch (error) {
        console.error('Error removing student from course:', error)
        return NextResponse.json({ success: false, status: 500, data: { message: String(error) }, error: 'Failed to remove student' })
    }
}
