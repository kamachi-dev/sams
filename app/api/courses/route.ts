export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const name = String(formData.get('name') ?? '').trim()
        const schedule = String(formData.get('schedule') ?? '').trim()
        const studentsRaw = String(formData.get('students') ?? '').trim()

        if (!name) {
            return NextResponse.json({ success: false, status: 400, data: null, error: 'Name required' }, { status: 400 })
        }

        // Get active school year
        const metaRes = await db.query(`SELECT active_school_year FROM meta WHERE id = '1'`)
        const activeSchoolYear = metaRes.rows[0]?.active_school_year ?? null

        const insertCourse = await db.query(
            `INSERT INTO course (name, school_year) VALUES ($1, $2) RETURNING *`,
            [name, activeSchoolYear]
        )

        const course = insertCourse.rows[0]

        // Create a default section for this course
        const sectionResult = await db.query(
            `INSERT INTO section (name, schedule, course) VALUES ($1, $2, $3) RETURNING *`,
            [name, schedule || null, course.id]
        )
        const section = sectionResult.rows[0]

        // Optionally enroll students (comma separated ids)
        if (studentsRaw) {
            const ids = studentsRaw.split(',').map(s => s.trim()).filter(Boolean)
            const values = ids.map((id, i) => `($1, $${i + 2})`).join(', ')
            if (ids.length) {
                // section id + student ids
                await db.query(`INSERT INTO enrollment_data (section, student) VALUES ${values}`, [section.id, ...ids])
            }
        }

        return NextResponse.json({ success: true, status: 200, data: course, error: null })
    } catch (error) {
        console.error('Error creating course:', error)
        return NextResponse.json({ success: false, status: 500, data: { message: String(error) }, error: 'Course creation failed' })
    }
}

export async function GET() {
    try {
        const result = await db.query(`SELECT s.id, c.name, s.name as section_name, s.schedule, s.teacher FROM section s INNER JOIN course c ON s.course = c.id WHERE c.school_year = (SELECT active_school_year FROM meta WHERE id='1') ORDER BY c.name, s.name`)
        return NextResponse.json({ success: true, status: 200, data: result.rows, error: null })
    } catch (error) {
        console.error('Error fetching courses:', error);
        return NextResponse.json({ success: false, status: 500, data: { message: String(error) }, error: 'Courses fetch failed' });
    }
}

export async function DELETE(req: Request) {
    try {
        const formData = await req.formData()
        const id = String(formData.get('id') ?? '').trim()

        if (!id) {
            return NextResponse.json({ success: false, status: 400, data: null, error: 'Course id required' }, { status: 400 })
        }

        // Delete enrollments for all sections of this course
        await db.query(`DELETE FROM enrollment_data WHERE section IN (SELECT id FROM section WHERE course = $1)`, [id])
        // Delete records for all sections of this course
        await db.query(`DELETE FROM record WHERE course IN (SELECT id FROM section WHERE course = $1)`, [id])
        // Delete course_models for all sections of this course
        await db.query(`DELETE FROM course_models WHERE course_id IN (SELECT id FROM section WHERE course = $1)`, [id])
        // Delete sections
        await db.query(`DELETE FROM section WHERE course = $1`, [id])
        // Delete course
        const result = await db.query(`DELETE FROM course WHERE id = $1 RETURNING *`, [id])

        return NextResponse.json({ success: true, status: 200, data: result.rows[0], error: null })
    } catch (error) {
        console.error('Error deleting course:', error)
        return NextResponse.json({ success: false, status: 500, data: { message: String(error) }, error: 'Course deletion failed' })
    }
}
