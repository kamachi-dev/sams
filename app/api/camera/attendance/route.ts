export const runtime = 'nodejs'
import { NextResponse } from "next/server"
import db from "@/app/services/database"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        console.log("Camera payload received:", body)

        // Validate environment configuration
        if (!process.env.POSTGRES_URL) {
            console.error("Database configuration error: POSTGRES_URL is not set")
            return NextResponse.json(
                {
                    success: false,
                    error: "Database not configured - POSTGRES_URL environment variable is missing"
                },
                { status: 500 }
            )
        }

        const { student, course, attendance, confidence, timestamp } = body

        await db.query(
            `INSERT INTO record (student, course, attendance, confidence, time)
             VALUES ($1, $2, $3, $4, $5)`,
            [student, course, attendance, confidence, timestamp]
        )

        return NextResponse.json({
            success: true,
            message: "Attendance recorded successfully"
        })

    } catch (error) {
        console.error("Camera insert error:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to insert attendance record",
                details: error
            },
            { status: 500 }
        )
    }
}

export async function GET() {
    return NextResponse.json({
        message: "Camera attendance API is live"
    })
}
