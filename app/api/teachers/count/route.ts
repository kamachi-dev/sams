import { NextResponse } from 'next/server'
import db from '@/app/services/database'

export async function GET() {
    try {
        const data = (await db.query(
            `SELECT COUNT(*) FROM account WHERE role = 1
              AND id IN (
                SELECT DISTINCT teacher FROM course
                WHERE school_year = (SELECT active_school_year FROM meta WHERE id='1')
              )`
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
            error: 'Teacher count data could not be retrieved'
        })
    }
}