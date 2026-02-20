import { NextResponse } from 'next/server'
import db from '@/app/services/database'

export async function POST(request: Request) {
    try {
        // Parse multipart form
        const formData = await request.formData();
        const courseId = formData.get('course_id');
        const file = formData.get('model');
        
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
        
        // Verify course exists
        const courseCheck = await db.query(
            `SELECT id FROM course WHERE id = $1`,
            [courseId]
        );
        
        if (courseCheck.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Course not found' },
                { status: 404 }
            );
        }
        
        // Read file as buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Store model in database
        await db.query(
            `UPDATE course SET model_pickle = $1 WHERE id = $2`,
            [buffer, courseId]
        );
        
        return NextResponse.json({ 
            success: true, 
            message: 'Model stored successfully',
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