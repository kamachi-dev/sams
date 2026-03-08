import { NextResponse } from 'next/server'
import db from '@/app/services/database'

export async function GET() {
    try {
        const data = (await db.query(
            `SELECT COUNT(DISTINCT sd.section) FROM student_data sd
             INNER JOIN enrollment_data e ON e.student = sd.student
             INNER JOIN course c ON c.id = e.course
             WHERE c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
             AND sd.section IS NOT NULL`
        )).rows[0];

        return NextResponse.json({
            success: true,
            status: 200,
            data: data,
            error: null
        })
    }
    catch (error) {
        return NextResponse.json({
            success: false,
            status: 500,
            data: {
                message: error
            },
            error: 'Section count data could not be retrieved'
        })
    }
}
