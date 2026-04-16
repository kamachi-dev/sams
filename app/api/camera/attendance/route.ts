export const runtime = 'nodejs'
import { NextResponse } from "next/server"
import db from "@/app/services/database"
import { notifyStudentNotification, notifyParentNotification } from '@/lib/notification-triggers'

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

        // Insert all records in a transaction
        const client = await db.connect();
        const insertedRecords: any[] = [];
        try {
            await client.query('BEGIN');
            for (const rec of records) {
                const result = await client.query(
                    `INSERT INTO record (student, course, attendance, confidence, time)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id, student, course, attendance, time`,
                    [rec.student, rec.course, rec.attendance, rec.confidence, rec.timestamp]
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

        // 🚀 TRIGGER NOTIFICATIONS FOR EACH RECORD
        for (const record of insertedRecords) {
            const courseData = await db.query(
                `SELECT c.name as course_name FROM course c INNER JOIN section s ON c.id = s.course WHERE s.id = $1`,
                [record.course]
            );

            const courseName = courseData.rows.length > 0 ? courseData.rows[0].course_name : 'Unknown Course';
            const recordedTime = new Date(record.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const recordedDate = new Date(record.time).toLocaleDateString();

            if (record.attendance === 2) {
                // LATE - notify student
                await notifyStudentNotification(
                    record.student,
                    'Late Attendance Recorded',
                    `You were marked as late for ${courseName} at ${recordedTime}`,
                    {
                        recordId: record.id,
                        status: 'Late',
                        course: courseName,
                        date: recordedDate,
                        type: 'late_attendance',
                        url: '/student-portal'
                    }
                );
            } else if (record.attendance === 0) {
                // ABSENT - notify student and parents
                await notifyStudentNotification(
                    record.student,
                    'Absence Recorded',
                    `You were marked as absent for ${courseName} on ${recordedDate}`,
                    {
                        recordId: record.id,
                        status: 'Absent',
                        course: courseName,
                        date: recordedDate,
                        type: 'absent',
                        url: '/student-portal'
                    }
                );

                // Also notify parents
                await notifyParentNotification(
                    record.student,
                    'Student Absence Alert',
                    `Your child was marked absent for ${courseName}`,
                    {
                        recordId: record.id,
                        status: 'Absent',
                        course: courseName,
                        date: recordedDate,
                        type: 'child_absent',
                        url: '/parent-portal'
                    }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: `Attendance recorded for ${records.length} record(s)`
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

export async function GET() {
    return NextResponse.json({
        message: "Camera attendance API is live"
    })
}
