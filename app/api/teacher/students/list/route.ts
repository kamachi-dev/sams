export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

export async function GET(req: Request) {
    try {
        const user = await currentUser()
        
        if (!user) {
            return NextResponse.json({ 
                success: false, 
                error: 'Not authenticated' 
            }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const courseId = searchParams.get('course')

        if (!courseId) {
            return NextResponse.json({
                success: false,
                error: 'Course parameter is required'
            }, { status: 400 })
        }

        // Get all students enrolled in the specified course taught by this teacher
        const result = await db.query(`
            SELECT 
                a.id,
                a.username as name,
                a.email
            FROM enrollment_data e
            INNER JOIN course c ON e.course = c.id
            INNER JOIN account a ON e.student = a.id
            WHERE c.teacher = $1 AND c.id = $2
              AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
            ORDER BY a.username ASC
        `, [user.id, courseId])

        const students = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email
        }))

        return NextResponse.json({ 
            success: true, 
            data: students
        })
    } catch (error) {
        console.error('Error fetching students list:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch students list'
        }, { status: 500 })
    }
}
