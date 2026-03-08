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
                s.id as course_id,
                c.name as course_name,
                s.name as section_name,
                cm.id as model_id,
                cm.section,
                cm.model_pickle,
                a.username as teacher_name,
                COUNT(DISTINCT ed.student) as enrolled_count
            FROM course_models cm
            INNER JOIN section s ON cm.course_id = s.id
            INNER JOIN course c ON s.course = c.id
            LEFT JOIN enrollment_data ed ON s.id = ed.section
            LEFT JOIN account a ON s.teacher = a.id
            GROUP BY cm.id, s.id, c.id, c.name, s.name, cm.model_pickle, cm.section, a.username
            ORDER BY c.name, s.name
        `);

        const data = result.rows.map(row => ({
            model_id: row.model_id,
            course_id: row.course_id,
            course_name: row.course_name,
            section: row.section,
            section_name: row.section_name,
            teacher_name: row.teacher_name,
            enrolled_count: row.enrolled_count,
            model_base64: bufferToBase64(row.model_pickle)
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch models'
        }, { status: 500 });
    }
}