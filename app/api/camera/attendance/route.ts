export const runtime = 'nodejs'
import { NextResponse } from "next/server"
import db from "@/app/services/database"
import { createNotificationWithPush } from '@/lib/createAndNotify'
import { sendAttendanceUpdateEmail } from '@/lib/email-notifications'

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("Camera payload received:", body);

        // Validate environment configuration
        if (!process.env.POSTGRES_URL) {
            console.error("Database configuration error: POSTGRES_URL is not set");
            return NextResponse.json(
                {
                    success: false,
                    error: "Database not configured - POSTGRES_URL environment variable is missing"
                },
                { status: 500 }
            );
        }

        // Accept either a single object or an array of records
        const records = Array.isArray(body) ? body : [body];

        // Validate all records
        for (const rec of records) {
            if (rec.student === undefined || rec.student === null ||
                rec.course === undefined || rec.course === null ||
                rec.attendance === undefined || rec.attendance === null ||
                rec.confidence === undefined || rec.confidence === null ||
                rec.timestamp === undefined || rec.timestamp === null) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Missing required fields in one or more records"
                    },
                    { status: 400 }
                );
            }
        }

        // Insert all records into camera_session_detections
        const client = await db.connect();
        const insertedRecords: any[] = [];
        try {
            await client.query('BEGIN');
            for (const rec of records) {
                const result = await client.query(
                    `INSERT INTO camera_session_detections (course_id, student_id, confidence, detected_at)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id, student_id, course_id, confidence, detected_at`,
                    [rec.course, rec.student, rec.confidence, rec.timestamp]
                );
                if (result.rows.length > 0) {
                    insertedRecords.push(result.rows[0]);
                }
            }
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        console.log(`\n🎉 ===== CAMERA DETECTIONS REGISTERED =====`);
        console.log(`📊 Total records registered: ${records.length}`);
        console.log(`⏱️  Timestamp: ${new Date().toISOString()}`);
        console.log(`============================================\n`);

        return NextResponse.json({
            success: true,
            message: `Detections registered for ${records.length} record(s)`
        });

    } catch (error) {
        console.error("Camera insert error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to insert attendance record(s)",
                details: error
            },
            { status: 500 }
        );
    }
}

function getClassTime(schedule: unknown, date: string | Date): string | null {
    if (!schedule) return null;

    try {
        const parsed = typeof schedule === 'string' ? JSON.parse(schedule) : schedule;
        if (!parsed || typeof parsed !== 'object') return null;

        const day = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const classSchedule = (parsed as Record<string, { start?: string; end?: string }>)[day];
        if (!classSchedule?.start && !classSchedule?.end) return null;
        return [classSchedule.start, classSchedule.end].filter(Boolean).join(' – ');
    } catch {
        return null;
    }
}

export async function GET() {
    return NextResponse.json({
        message: "Camera attendance API is live"
    })
}
