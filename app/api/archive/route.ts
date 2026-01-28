import { NextResponse } from 'next/server'
import db from '@/app/services/database'

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const school_year = formData.get('school_year');
        const notes = formData.get('notes');

        const data = (await db.query(
            `INSERT INTO archive ( school_year, notes ) VALUES ('${school_year}', '${notes}')
            RETURNING *`
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
            error: 'Records could not be archived'
        })
    }
}

export async function DELETE(req: Request) {
    try {
        const formData = await req.formData();
        const id = formData.get('id');

        const data = (await db.query(
            `DELETE FROM archive WHERE id='${id}' RETURNING *`
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
            error: 'Archive record could not be deleted'
        })
    }
}

export async function GET() {
    try {
        const data = (await db.query(
            "SELECT * FROM archive"
        )).rows;

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
            error: 'Archive data could not be retrieved'
        })
    }
}