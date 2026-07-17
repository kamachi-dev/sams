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
                `SELECT c.name AS course_name, s.teacher, s.classroom, s.schedule,
                        student_account.username AS student_name,
                        teacher_account.username AS teacher_name
                 FROM course c
                 INNER JOIN section s ON c.id = s.course
                 INNER JOIN account student_account ON student_account.id = $2
                 LEFT JOIN account teacher_account ON teacher_account.id = s.teacher
                 WHERE s.id = $1 AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
                [record.course, record.student]
            );

            const courseName = courseData.rows.length > 0 ? courseData.rows[0].course_name : 'Unknown Course';
            const teacherId = courseData.rows.length > 0 ? courseData.rows[0].teacher : null;
            const studentName = courseData.rows[0]?.student_name || 'Student';
            const teacherName = courseData.rows[0]?.teacher_name || null;
            const roomId = courseData.rows[0]?.classroom || null;
            const classTime = getClassTime(courseData.rows[0]?.schedule, record.time);
            const recordedTime = new Date(record.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const recordedDate = new Date(record.time).toLocaleDateString();

            // Determine attendance status and messages
            let studentTitle = '';
            let studentMessage = '';
            let parentTitle = '';
            let parentMessage = '';
            let teacherTitle = '';
            let teacherMessage = '';

            console.log(`\n📍 Processing attendance record ${record.id}`);
            console.log(`   Student: ${record.student} | Course: ${courseName} (${record.course})`);
            console.log(`   Status: ${record.attendance === 1 ? '✅ PRESENT' : record.attendance === 2 ? '⏰ LATE' : '❌ ABSENT'} | Time: ${recordedTime}`);

            if (record.attendance === 1) {
                // PRESENT
                studentTitle = 'Present Attendance Recorded';
                studentMessage = `You were marked as present for ${courseName} at ${recordedTime}`;
                parentTitle = 'Child Present';
                parentMessage = `Your child was marked as present for ${courseName} at ${recordedTime}`;
                teacherTitle = 'Attendance: Present';
                teacherMessage = `Student marked present for ${courseName} at ${recordedTime}`;
            } else if (record.attendance === 2) {
                // LATE
                studentTitle = 'Late Attendance Recorded';
                studentMessage = `You were marked as late for ${courseName} at ${recordedTime}`;
                parentTitle = 'Child Late';
                parentMessage = `Your child was marked as late for ${courseName} at ${recordedTime}`;
                teacherTitle = 'Attendance: Late';
                teacherMessage = `Student marked late for ${courseName} at ${recordedTime}`;
            } else if (record.attendance === 0) {
                // ABSENT
                studentTitle = 'Absence Recorded';
                studentMessage = `You were marked as absent for ${courseName} on ${recordedDate}`;
                parentTitle = 'Child Absent';
                parentMessage = `Your child was marked as absent for ${courseName} on ${recordedDate}`;
                teacherTitle = 'Attendance: Absent';
                teacherMessage = `Student marked absent for ${courseName} on ${recordedDate}`;
            }

            // 1️⃣ NOTIFY STUDENT
            await createNotificationWithPush({
                studentId: record.student,
                courseId: record.course,
                recordId: record.id,
                type: 0, // attendance
                title: studentTitle,
                message: studentMessage,
                sendPush: true
            });

            // 2️⃣ NOTIFY PARENTS
            const parentResult = await db.query(
                `SELECT parent FROM student_data WHERE student = $1 AND parent IS NOT NULL`,
                [record.student]
            );
            for (const pRow of parentResult.rows) {
                await createNotificationWithPush({
                    studentId: pRow.parent,
                    courseId: record.course,
                    recordId: record.id,
                    type: 0, // attendance
                    title: parentTitle,
                    message: parentMessage,
                    sendPush: true
                });
            }

            // 3️⃣ NOTIFY TEACHER
            if (teacherId) {
                await createNotificationWithPush({
                    studentId: teacherId,
                    courseId: record.course,
                    recordId: record.id,
                    type: 0, // attendance
                    title: teacherTitle,
                    message: teacherMessage,
                    sendPush: true
                });
            }

            await sendAttendanceUpdateEmail({
                studentId: record.student,
                parentIds: parentResult.rows.map((row: any) => row.parent),
                teacherId,
                studentName,
                courseName,
                teacherName,
                roomId,
                classTime,
                status: record.attendance === 1 ? 'present' : record.attendance === 2 ? 'late' : 'absent',
                recordedTime,
                recordedDate,
            });

            console.log(`✅ All notifications sent for record ${record.id}\n`);
        }

        console.log(`\n🎉 ===== ATTENDANCE PROCESSING COMPLETE =====`);
        console.log(`📊 Total records processed: ${records.length}`);
        console.log(`⏱️  Timestamp: ${new Date().toISOString()}`);
        console.log(`============================================\n`);

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
