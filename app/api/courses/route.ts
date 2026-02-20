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

        const insertCourse = await db.query(
            `INSERT INTO course (name, schedule) VALUES ($1, $2) RETURNING *`,
            [name, schedule || null]
        )

        const course = insertCourse.rows[0]

        // Optionally enroll students (comma separated ids)
        if (studentsRaw) {
            const ids = studentsRaw.split(',').map(s => s.trim()).filter(Boolean)
            const values = ids.map((id, i) => `($1, $${i + 2})`).join(', ')
            if (ids.length) {
                // course id + student ids
                await db.query(`INSERT INTO enrollment_data (course, student) VALUES ${values}`, [course.id, ...ids])
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
        const result = await db.query(`SELECT id, name, schedule, teacher FROM course WHERE school_year = (SELECT active_school_year FROM meta WHERE id='1') ORDER BY name`)
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

        // Delete enrollments first
        await db.query(`DELETE FROM enrollment_data WHERE course = $1`, [id])
        // Delete course
        const result = await db.query(`DELETE FROM course WHERE id = $1 RETURNING *`, [id])

        return NextResponse.json({ success: true, status: 200, data: result.rows[0], error: null })
    } catch (error) {
        console.error('Error deleting course:', error)
        return NextResponse.json({ success: false, status: 500, data: { message: String(error) }, error: 'Course deletion failed' })
    }
}
