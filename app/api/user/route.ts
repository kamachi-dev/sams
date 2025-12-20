import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'

export async function GET() {
    try {
        const user = await currentUser()
        const data = (await db.query(
            "SELECT * FROM account WHERE id = $1 LIMIT 1",
            [user?.id]
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
            error: 'User data could not be retrieved'
        })
    }
}