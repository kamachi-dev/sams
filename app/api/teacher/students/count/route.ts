export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

export async function GET(req: Request) {
    try {
        // Get the current logged-in teacher's ID
        const user = await currentUser()
        
        console.log('Current user:', user?.id)
        
        if (!user) {
            return NextResponse.json({ 
                success: false, 
                status: 401, 
                data: null, 
                error: 'Not authenticated' 
            }, { status: 401 })
        }

        console.log('Querying for teacher:', user.id)

        // Count distinct students enrolled in courses taught by this teacher
        // Note: To only count students in active (non-archived) courses, add: AND c.archive IS NULL
        const result = await db.query(`
            SELECT COUNT(DISTINCT e.student) as count
            FROM enrollment_data e
            INNER JOIN course c ON e.course = c.id
            WHERE c.teacher = $1
        `, [user.id])

        console.log('Query result:', result.rows)

        const count = parseInt(result.rows[0]?.count || '0')
        
        console.log('Final count:', count)

        return NextResponse.json({ 
            success: true, 
            status: 200, 
            data: { count }, 
            error: null 
        })
    } catch (error) {
        console.error('Error fetching teacher student count:', error)
        return NextResponse.json({ 
            success: false, 
            status: 500, 
            data: null, 
            error: error instanceof Error ? error.message : 'Failed to fetch student count'
        }, { status: 500 })
    }
}
