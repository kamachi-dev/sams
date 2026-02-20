import { NextResponse } from 'next/server'
import db from '@/app/services/database'

function bufferToBase64(data: Buffer | string | null): string | null {
    if (!data) return null;

    if (Buffer.isBuffer(data)) {
        return data.toString('base64');
    }
    if (typeof data === 'string') {
        // If postgres returned "\\xHEX"
        if (data.startsWith('\\x')) {
            const buf = Buffer.from(data.slice(2), 'hex');
            return buf.toString('base64');
        }
        // If somehow already base64
        return data;
    }
    return null;
}

export async function GET() {
    try {
        const result = await db.query(`
            SELECT 
                c.id as course_id,
                c.name as course_name,
                c.model_pickle,
                t.name as teacher_name,
                COUNT(DISTINCT ed.student) as enrolled_count
            FROM course c
            LEFT JOIN enrollment_data ed ON c.id = ed.course
            LEFT JOIN teacher_data t ON c.teacher = t.account_id
            WHERE c.model_pickle IS NOT NULL
            GROUP BY c.id, c.name, c.model_pickle, t.name
            ORDER BY c.name
        `);

        const data = result.rows.map(row => ({
            course_id: row.course_id,
            course_name: row.course_name,
            teacher_name: row.teacher_name,
            enrolled_count: row.enrolled_count,
            model_base64: bufferToBase64(row.model_pickle)  // ✅ Now handles both Buffer and string
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch models' 
        }, { status: 500 });
    }
}