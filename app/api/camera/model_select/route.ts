import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { Buffer } from 'buffer'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId')
    const section = searchParams.get('section') // Optional: get model for specific section

    if (!courseId) {
        return NextResponse.json({ success: false, error: 'Missing courseId' }, { status: 400 })
    }

    try {
        // Query the course_models table
        // If section is provided, get the model for that section
        // Otherwise, get the model with NULL section (applies to all sections)
        const result = section
            ? await db.query(
                `SELECT cm.id, cm.model_pickle, cm.section FROM course_models cm
                                 INNER JOIN course c ON cm.course_id = c.id
                                 WHERE cm.course_id = $1 AND (cm.section = $2 OR cm.section IS NULL)
                                     AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
                 ORDER BY section DESC NULLS LAST LIMIT 1`,
                [courseId, section]
            )
            : await db.query(
                `SELECT cm.id, cm.model_pickle, cm.section FROM course_models cm
                                 INNER JOIN course c ON cm.course_id = c.id
                                 WHERE cm.course_id = $1
                                     AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
                                 ORDER BY cm.section NULLS FIRST
                                 LIMIT 1`,
                [courseId]
            );

        if (!result.rows.length || !result.rows[0].model_pickle) {
            return NextResponse.json({ success: false, error: 'Model not found for this course' }, { status: 404 });
        }

        // Encode as base64 for safe transport
        const model_pickle = Buffer.from(result.rows[0].model_pickle).toString('base64');
        const modelId = result.rows[0].id;
        const modelSection = result.rows[0].section;

        return NextResponse.json({
            success: true,
            model_pickle,
            model_id: modelId,
            section: modelSection
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch model'
        }, { status: 500 });
    }
}