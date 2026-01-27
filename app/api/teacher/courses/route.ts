export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

export async function GET() {
    try {
        const user = await currentUser()
        
        if (!user) {
            return NextResponse.json({ 
                success: false, 
                error: 'Not authenticated' 
            }, { status: 401 })
        }

        // Get all courses for this teacher
        const result = await db.query(`
            SELECT id, name, schedule
            FROM course
            WHERE teacher = $1
            ORDER BY name
        `, [user.id])

        return NextResponse.json({ 
            success: true, 
            data: result.rows
        })
    } catch (error) {
        console.error('Error fetching teacher courses:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch courses'
        }, { status: 500 })
    }
}
