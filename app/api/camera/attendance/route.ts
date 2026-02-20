export const runtime = 'nodejs'
import { NextResponse } from "next/server"
import db from "@/app/services/database"

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
            if (!rec.student || !rec.course || !rec.attendance || !rec.confidence || !rec.timestamp) {
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
        try {
            await client.query('BEGIN');
            for (const rec of records) {
                await client.query(
                    `INSERT INTO record (student, course, attendance, confidence, time)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [rec.student, rec.course, rec.attendance, rec.confidence, rec.timestamp]
                );
            }
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
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
