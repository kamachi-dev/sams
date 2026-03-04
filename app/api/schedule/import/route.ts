export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import * as XLSX from 'xlsx'

/* ── Types ─────────────────────────────────────────────────────────── */

type ParsedStudent = { name: string; email: string; section: string | null }
type ParsedScheduleSlot = { day: string; start: string; end: string }
type ParsedCourse = {
    name: string
    teacher: string | null
    schedule: ParsedScheduleSlot[]
    students: ParsedStudent[]
}

/* ── XLSX parser ───────────────────────────────────────────────────── */

/**
 * Expected XLSX layout (one sheet):
 *
 * CourseName
 *   ,teacher, teacher_email
 *   ,schedule
 *     ,,Day, start_time, end_time
 *   ,students
 *     ,,Name, Email, Section
 * NextCourse
 *   ...
 */
function parseScheduleXlsx(buffer: Buffer): ParsedCourse[] {
    const workbook = XLSX.read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: (string | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

    const courses: ParsedCourse[] = []
    let current: ParsedCourse | null = null
    let section: 'schedule' | 'students' | null = null

    for (const row of rows) {
        const col0 = row[0]?.toString().trim() ?? ''
        const col1 = row[1]?.toString().trim() ?? ''
        const col2 = row[2]?.toString().trim() ?? ''
        const col3 = row[3]?.toString().trim() ?? ''
        const col4 = row[4]?.toString().trim() ?? ''

        // Course name row – only col0 is filled
        if (col0 && !col1 && !col2) {
            if (current) courses.push(current)
            current = { name: col0, teacher: null, schedule: [], students: [] }
            section = null
            continue
        }

        // Teacher row  – ,teacher,<email>
        if (!col0 && col1.toLowerCase() === 'teacher' && col2 && current) {
            current.teacher = col2
            continue
        }

        // Section header – ,schedule  or  ,students
        if (!col0 && col1 && !col2) {
            const lower = col1.toLowerCase()
            if (lower === 'schedule') section = 'schedule'
            else if (lower === 'students') section = 'students'
            continue
        }

        // Data rows – ,,value,...
        if (!col0 && !col1 && col2 && current) {
            if (section === 'schedule' && col3) {
                current.schedule.push({
                    day: col2.toLowerCase(),
                    start: normalizeTime(col3),
                    end: normalizeTime(col4),
                })
            } else if (section === 'students') {
                current.students.push({
                    name: col2,
                    email: col3 || col2,
                    section: col4 || null,
                })
            }
        }
    }
    if (current) courses.push(current)
    return courses
}

/* ── Helpers ───────────────────────────────────────────────────────── */

/** Normalise "8:30:00 am" / "1:00:00 pm" → "8:30" / "13:00" */
function normalizeTime(raw: string): string {
    if (!raw) return ''
    const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i)
    if (!match) return raw.trim()

    let hours = parseInt(match[1])
    const mins = match[2]
    const ampm = match[3]?.toLowerCase()

    if (ampm === 'pm' && hours < 12) hours += 12
    if (ampm === 'am' && hours === 12) hours = 0

    return `${hours}:${mins}`
}

/** Look up an account's id by email */
async function getAccountIdByEmail(email: string): Promise<string | null> {
    const res = await db.query(`SELECT id FROM account WHERE email = $1 LIMIT 1`, [email])
    return res.rows[0]?.id ?? null
}

/* ── Route handler ─────────────────────────────────────────────────── */

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json(
                { success: false, status: 400, data: null, error: 'No file provided' },
                { status: 400 },
            )
        }
        if (!file.name.endsWith('.xlsx')) {
            return NextResponse.json(
                { success: false, status: 400, data: null, error: 'Only .xlsx files are supported' },
                { status: 400 },
            )
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const courses = parseScheduleXlsx(buffer)

        if (!courses.length) {
            return NextResponse.json(
                { success: false, status: 400, data: null, error: 'No courses found in file' },
                { status: 400 },
            )
        }

        // Active school year is required
        const metaRes = await db.query(`SELECT active_school_year FROM meta WHERE id = '1'`)
        const activeSchoolYear = metaRes.rows[0]?.active_school_year ?? null

        if (!activeSchoolYear) {
            return NextResponse.json(
                { success: false, status: 400, data: null, error: 'No active school year set. Please set an active school year first.' },
                { status: 400 },
            )
        }

        const results = {
            studentsCreated: 0,
            studentsExisting: 0,
            studentDataCreated: 0,
            coursesCreated: 0,
            enrollments: 0,
            teachersLinked: 0,
            errors: [] as string[],
        }

        for (const course of courses) {
            /* ── 1. Resolve / create student accounts ── */
            const studentIds: string[] = []

            for (const s of course.students) {
                try {
                    // Check if account already exists by email
                    let accountId = await getAccountIdByEmail(s.email)

                    if (accountId) {
                        results.studentsExisting++
                    } else {
                        // Create the account (email as temporary id, same as the students import route)
                        await db.query(
                            `INSERT INTO account (id, username, email, role) VALUES ($1, $2, $3, 3)`,
                            [s.email, s.name, s.email],
                        )
                        // Re-fetch to get the actual id from the database
                        accountId = await getAccountIdByEmail(s.email)
                        results.studentsCreated++
                    }

                    // Ensure student_data record exists with the section
                    if (accountId) {
                        studentIds.push(accountId)

                        try {
                            const sdExists = await db.query(
                                `SELECT id FROM student_data WHERE student = $1 LIMIT 1`,
                                [accountId],
                            )
                            if (!sdExists.rows.length) {
                                await db.query(
                                    `INSERT INTO student_data (student, section) VALUES ($1, $2)`,
                                    [accountId, s.section],
                                )
                                results.studentDataCreated++
                            }
                        } catch (sdErr) {
                            results.errors.push(`student_data for ${s.name} (${s.email}): ${String(sdErr)}`)
                        }
                    }
                } catch (err) {
                    results.errors.push(`Student ${s.name} (${s.email}): ${String(err)}`)
                }
            }

            /* ── 2. Resolve teacher by email ── */
            let teacherId: string | null = null

            if (course.teacher) {
                try {
                    teacherId = await getAccountIdByEmail(course.teacher)
                    if (teacherId) {
                        results.teachersLinked++
                    } else {
                        results.errors.push(
                            `Teacher "${course.teacher}" not found in accounts. Course will be created without a teacher.`,
                        )
                    }
                } catch (err) {
                    results.errors.push(`Teacher lookup "${course.teacher}": ${String(err)}`)
                }
            }

            /* ── 3. Build schedule JSON ── */
            const scheduleObj: Record<string, { start: string; end: string }> = {}
            for (const slot of course.schedule) {
                scheduleObj[slot.day] = { start: slot.start, end: slot.end }
            }

            /* ── 4. Create course ── */
            try {
                const courseResult = await db.query(
                    `INSERT INTO course (name, schedule, teacher, school_year) VALUES ($1, $2, $3, $4) RETURNING id`,
                    [course.name, JSON.stringify(scheduleObj), teacherId, activeSchoolYear],
                )
                const courseId = courseResult.rows[0].id
                results.coursesCreated++

                /* ── 5. Enroll students using their account IDs ── */
                if (studentIds.length) {
                    const placeholders = studentIds.map((_, i) => `($1, $${i + 2})`).join(', ')
                    await db.query(
                        `INSERT INTO enrollment_data (course, student) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
                        [courseId, ...studentIds],
                    )
                    results.enrollments += studentIds.length
                }
            } catch (err) {
                results.errors.push(`Course "${course.name}": ${String(err)}`)
            }
        }

        return NextResponse.json({ success: true, status: 200, data: results, error: null })
    } catch (error) {
        console.error('Schedule import error:', error)
        return NextResponse.json(
            { success: false, status: 500, data: { message: String(error) }, error: 'Schedule import failed' },
            { status: 500 },
        )
    }
}
