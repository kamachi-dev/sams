export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

export async function GET() {
    try {
        const user = await currentUser()

        // Get all courses for this teacher
        const coursesResult = await db.query(`
            SELECT id, name, teacher, school_year 
            FROM course 
            WHERE teacher = $1
              AND school_year = (SELECT active_school_year FROM meta WHERE id='1')
        `, [user?.id])

        // Get all enrollments for these courses
        const enrollmentsResult = await db.query(`
            SELECT e.*, c.name as course_name
            FROM enrollment_data e
            INNER JOIN course c ON e.course = c.id
            WHERE c.teacher = $1
              AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
        `, [user?.id])

        // Try to get account information for enrolled students (using SELECT * to see all columns)
        const studentIds = enrollmentsResult.rows.map(row => row.student)
        const accountsResult = studentIds.length > 0 ? await db.query(`
            SELECT *
            FROM account
            WHERE id = ANY($1)
        `, [studentIds]) : { rows: [] }

        // Get the count
        const countResult = await db.query(`
            SELECT COUNT(DISTINCT e.student) as count
            FROM enrollment_data e
            INNER JOIN course c ON e.course = c.id
            WHERE c.teacher = $1 
              AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
        `, [user?.id])

        return NextResponse.json({
            success: true,
            data: {
                userId: user?.id,
                userEmail: user?.emailAddresses?.[0]?.emailAddress,
                courses: coursesResult.rows,
                enrollments: enrollmentsResult.rows,
                studentAccounts: accountsResult.rows,
                count: countResult.rows[0]
            }
        })
    } catch (error) {
        console.error('Debug error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
