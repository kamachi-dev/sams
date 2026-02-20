import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { Buffer } from 'buffer'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId')
    if (!courseId) {
        return NextResponse.json({ success: false, error: 'Missing courseId' }, { status: 400 })
    }
    try {
        const result = await db.query(
            'SELECT model_pickle FROM course WHERE id = $1',
            [courseId]
        );
        if (!result.rows.length || !result.rows[0].model_pickle) {
            return NextResponse.json({ success: false, error: 'Model not found' }, { status: 404 });
        }
        // Encode as base64 for safe transport
        const model_pickle = Buffer.from(result.rows[0].model_pickle).toString('base64');
        return NextResponse.json({ success: true, model_pickle });
    } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch model' }, { status: 500 });
    }
}