import { NextResponse } from 'next/server'
import db from '@/app/services/database'

export async function GET() {
    try {
        const test = [
            ['test-id', 'test-user@test.com'],
            ['test-id2', 'test-user2@test.com'],
            ['test-id3', 'test-user3@test.com']
        ];
        const data = (await db.query(
            `INSERT INTO account ( id, username, email, role ) VALUES ${test.map((row) => `('${row[0]}', '${row[1]}', '${row[1]}', 3)`).join(', ')}
            RETURNING *`
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