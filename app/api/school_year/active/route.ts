import { NextResponse } from 'next/server'
import db from '@/app/services/database'

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const id = formData.get('id');

        const data = (await db.query(
            `UPDATE meta SET active_school_year='${id}' WHERE id='1' RETURNING *`
        )).rows

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
            error: 'Active school year could not be set'
        })
    }
}

export async function GET() {
    try {
        const data = (await db.query(
            `SELECT active_school_year FROM meta WHERE id='1'`
        )).rows
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
            error: 'Active school year could not be retrieved'
        })
    }
}
