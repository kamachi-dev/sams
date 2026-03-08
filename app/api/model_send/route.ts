import { NextResponse } from 'next/server'
import db from '@/app/services/database'

export async function POST(request: Request) {
    try {
        // Parse multipart form
        const formData = await request.formData();
        const courseId = formData.get('course_id');
        const sectionRaw = formData.get('section');
        const file = formData.get('model');
        const section = typeof sectionRaw === 'string' && sectionRaw.trim().length > 0
            ? sectionRaw.trim()
            : null;

        // Validate inputs
        if (!courseId || !file || typeof file === 'string') {
            return NextResponse.json(
                { success: false, error: 'Missing course_id or model file' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.name.endsWith('.joblib')) {
            return NextResponse.json(
                { success: false, error: 'Invalid file type. Only .joblib files are accepted' },
                { status: 400 }
            );
        }

        // Validate file size (50MB limit)
        const maxSize = 50 * 1024 * 1024; // 50 MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, error: `File too large. Maximum size is 50MB (received ${(file.size / 1024 / 1024).toFixed(2)}MB)` },
                { status: 400 }
            );
        }

        // Verify section exists (course_id in course_models now references section.id)
        const courseCheck = await db.query(
            `SELECT id FROM section WHERE id = $1`,
            [courseId]
        );

        if (courseCheck.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Section not found' },
                { status: 404 }
            );
        }

        // Read file as buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Store model in course_models table (one row per course + section)
        const updateResult = await db.query(
            `UPDATE course_models
             SET model_pickle = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE course_id = $2 AND section IS NOT DISTINCT FROM $3
             RETURNING id`,
            [buffer, courseId, section]
        );

        let modelId: string;

        if (updateResult.rows.length > 0) {
            modelId = updateResult.rows[0].id;
        } else {
            const insertResult = await db.query(
                `INSERT INTO course_models (course_id, section, model_pickle)
                 VALUES ($1, $2, $3)
                 RETURNING id`,
                [courseId, section, buffer]
            );
            modelId = insertResult.rows[0].id;
        }

        return NextResponse.json({
            success: true,
            message: 'Model stored successfully',
            model_id: modelId,
            course_id: courseId,
            section,
            fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
            fileName: file.name
        });
    } catch (error) {
        console.error('Model upload error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to store model'
        }, { status: 500 });
    }
}