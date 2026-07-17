export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username, email, role, parentEmail, parentName } = body

        if (!email || !username || role === undefined) {
            return NextResponse.json(
                { success: false, status: 400, data: null, error: 'Name, email, and role are required fields.' },
                { status: 400 }
            )
        }

        const roleNum = Number(role)
        if (![0, 1, 2, 3].includes(roleNum)) {
            return NextResponse.json(
                { success: false, status: 400, data: null, error: 'Invalid user role selected.' },
                { status: 400 }
            )
        }

        const emailClean = email.trim().toLowerCase()
        const usernameClean = username.trim()

        await db.query('BEGIN')

        // 1. Insert or update the account
        // ID is equal to email in this system
        await db.query(
            `INSERT INTO account (id, username, email, role) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) 
             DO UPDATE SET username = EXCLUDED.username, role = EXCLUDED.role`,
            [emailClean, usernameClean, emailClean, roleNum]
        )

        // 2. Role-specific logic
        if (roleNum === 3) {
            // Student: Ensure student_data entry exists
            const sdExists = await db.query(
                `SELECT id FROM student_data WHERE student = $1 LIMIT 1`,
                [emailClean]
            )
            if (!sdExists.rows.length) {
                await db.query(
                    `INSERT INTO student_data (student) VALUES ($1)`,
                    [emailClean]
                )
            }

            // Link parent if provided
            if (parentEmail) {
                const parentEmailClean = parentEmail.trim().toLowerCase()
                const parentNameClean = parentName?.trim() || parentEmailClean.split('@')[0]

                // Ensure parent account exists (role 2)
                await db.query(
                    `INSERT INTO account (id, username, email, role)
                     VALUES ($1, $2, $3, 2)
                     ON CONFLICT (id) DO NOTHING`,
                    [parentEmailClean, parentNameClean, parentEmailClean]
                )

                // Update student_data parent reference
                await db.query(
                    `UPDATE student_data 
                     SET parent = $2 
                     WHERE student = $1`,
                    [emailClean, parentEmailClean]
                )
            }
        }

        await db.query('COMMIT')

        return NextResponse.json({ success: true, status: 200, data: { email: emailClean }, error: null })
    } catch (error) {
        try {
            await db.query('ROLLBACK')
        } catch (rollErr) {
            console.error('Rollback error:', rollErr)
        }
        console.error('Import user endpoint error:', error)
        return NextResponse.json(
            { success: false, status: 500, data: null, error: error instanceof Error ? error.message : 'User import failed' },
            { status: 500 }
        )
    }
}
