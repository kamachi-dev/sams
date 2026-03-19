export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import * as XLSX from 'xlsx'

/* ── Types ─────────────────────────────────────────────────────────── */

type ParsedStudent = { name: string; email: string; parentEmail?: string }
type ParsedScheduleSlot = { day: string; start: string; end: string }
type ParsedCourseBlock = {
    name: string
    section: string | null
    teacher: string | null
    schedule: ParsedScheduleSlot[]
    students: ParsedStudent[]
}

/* ── XLSX parser ───────────────────────────────────────────────────── */

/**
 * Expected XLSX layout (one sheet):
 *
 * CourseName
 *   ,section, Section A
 *   ,teacher, teacher_email
 *   ,schedule
 *     ,,Day, start_time, end_time
 *   ,students
 *     ,,Name, Email, ParentEmail(optional)
 * CourseName            (same course, different section)
 *   ,section, Section B
 *   ...
 */
function parseScheduleXlsx(buffer: Buffer): ParsedCourseBlock[] {
    const workbook = XLSX.read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: (string | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

    const blocks: ParsedCourseBlock[] = []
    let current: ParsedCourseBlock | null = null
    let mode: 'schedule' | 'students' | null = null

    for (const row of rows) {
        const col0 = row[0]?.toString().trim() ?? ''
        const col1 = row[1]?.toString().trim() ?? ''
        const col2 = row[2]?.toString().trim() ?? ''
        const col3 = row[3]?.toString().trim() ?? ''
        const col4 = row[4]?.toString().trim() ?? ''

        // Course name row – only col0 is filled
        if (col0 && !col1 && !col2) {
            if (current) blocks.push(current)
            current = { name: col0, section: null, teacher: null, schedule: [], students: [] }
            mode = null
            continue
        }

        if (!current) continue

        // Section row – ,section,<name>
        if (!col0 && col1.toLowerCase() === 'section' && col2) {
            current.section = col2
            continue
        }

        // Teacher row – ,teacher,<email>
        if (!col0 && col1.toLowerCase() === 'teacher' && col2) {
            current.teacher = col2
            continue
        }

        // Mode header – ,schedule  or  ,students
        if (!col0 && col1 && !col2) {
            const lower = col1.toLowerCase()
            if (lower === 'schedule') mode = 'schedule'
            else if (lower === 'students') mode = 'students'
            continue
        }

        // Data rows – ,,value,...
        if (!col0 && !col1 && col2) {
            if (mode === 'schedule') {
                current.schedule.push({
                    day: col2.toLowerCase(),
                    start: normalizeTime(col3),
                    end: normalizeTime(col4),
                })
            } else if (mode === 'students') {
                current.students.push({
                    name: col2,
                    email: col3 || col2,
                    parentEmail: col4 || undefined,
                })
            }
        }
    }
    if (current) blocks.push(current)
    return blocks
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
        const blocks = parseScheduleXlsx(buffer)

        if (!blocks.length) {
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
            parentLinksUpserted: 0,
            parentsCreated: 0,
            parentsExisting: 0,
            teacherDataUpserted: 0,
            coursesCreated: 0,
            sectionsCreated: 0,
            enrollments: 0,
            teachersCreated: 0,
            teachersExisting: 0,
            errors: [] as string[],
        }

        // Cache: course name → course id (reuse across blocks)
        const courseIdByName = new Map<string, string>()
        // Cache: email → account id (avoid repeated lookups)
        const accountIdCache = new Map<string, string>()

        async function resolveOrCreateAccount(
            email: string, name: string, role: number,
        ): Promise<string | null> {
            const cached = accountIdCache.get(email)
            if (cached) return cached

            let accountId = await getAccountIdByEmail(email)
            if (!accountId) {
                await db.query(
                    `INSERT INTO account (id, username, email, role) VALUES ($1, $2, $3, $4)`,
                    [email, name, email, role],
                )
                accountId = await getAccountIdByEmail(email)
            }
            if (accountId) accountIdCache.set(email, accountId)
            return accountId
        }

        for (const block of blocks) {
            /* ── 1. Resolve / create student accounts ── */
            const studentIds: string[] = []

            for (const s of block.students) {
                try {
                    const existed = await getAccountIdByEmail(s.email)
                    const accountId = await resolveOrCreateAccount(s.email, s.name, 3)

                    if (existed) {
                        results.studentsExisting++
                    } else {
                        results.studentsCreated++
                    }

                    if (accountId) {
                        studentIds.push(accountId)

                        // Ensure student_data record exists.
                        try {
                            const sdExists = await db.query(
                                `SELECT id FROM student_data WHERE student = $1 LIMIT 1`,
                                [accountId],
                            )
                            if (!sdExists.rows.length) {
                                // Keep compatibility across schema variants.
                                // Some environments define student_data.section, some do not.
                                try {
                                    await db.query(
                                        `INSERT INTO student_data (student, section) VALUES ($1, $2)`,
                                        [accountId, block.section],
                                    )
                                } catch {
                                    await db.query(
                                        `INSERT INTO student_data (student) VALUES ($1)`,
                                        [accountId],
                                    )
                                }
                                results.studentDataCreated++
                            }

                            // If a parent email is provided, ensure parent account exists and link it.
                            if (s.parentEmail) {
                                const parentExisted = await getAccountIdByEmail(s.parentEmail)
                                const parentId = await resolveOrCreateAccount(s.parentEmail, s.parentEmail.split('@')[0], 2)

                                if (parentExisted) {
                                    results.parentsExisting++
                                } else if (parentId) {
                                    results.parentsCreated++
                                }

                                if (parentId) {
                                    await db.query(
                                        `UPDATE student_data
                                         SET parent = $2
                                         WHERE student = $1
                                           AND (parent IS DISTINCT FROM $2)`,
                                        [accountId, parentId],
                                    )
                                    results.parentLinksUpserted++
                                }
                            }
                        } catch (sdErr) {
                            results.errors.push(`student_data for ${s.name} (${s.email}): ${String(sdErr)}`)
                        }
                    }
                } catch (err) {
                    results.errors.push(`Student ${s.name} (${s.email}): ${String(err)}`)
                }
            }

            /* ── 2. Resolve / create teacher account ── */
            let teacherId: string | null = null

            if (block.teacher) {
                try {
                    const existed = await getAccountIdByEmail(block.teacher)
                    teacherId = await resolveOrCreateAccount(block.teacher, block.teacher.split('@')[0], 1)

                    if (existed) {
                        results.teachersExisting++
                    } else if (teacherId) {
                        results.teachersCreated++
                    }
                } catch (err) {
                    results.errors.push(`Teacher "${block.teacher}": ${String(err)}`)
                }
            }

            /* ── 3. Build schedule JSON ── */
            const scheduleObj: Record<string, { start: string; end: string }> = {}
            for (const slot of block.schedule) {
                scheduleObj[slot.day] = { start: slot.start, end: slot.end }
            }

            /* ── 4. Reuse or create course, then create section ── */
            try {
                let courseId = courseIdByName.get(block.name)

                if (!courseId) {
                    // Check if a course with this name already exists for this school year
                    const existing = await db.query(
                        `SELECT id FROM course WHERE name = $1 AND school_year = $2 LIMIT 1`,
                        [block.name, activeSchoolYear],
                    )
                    if (existing.rows.length) {
                        courseId = existing.rows[0].id as string
                    } else {
                        const courseResult = await db.query(
                            `INSERT INTO course (name, school_year) VALUES ($1, $2) RETURNING id`,
                            [block.name, activeSchoolYear],
                        )
                        courseId = courseResult.rows[0].id as string
                        results.coursesCreated++
                    }
                    courseIdByName.set(block.name, courseId)
                }

                // Create a section for this block
                const sectionResult = await db.query(
                    `INSERT INTO section (name, schedule, teacher, course) VALUES ($1, $2, $3, $4) RETURNING id`,
                    [block.section ?? 'Default', JSON.stringify(scheduleObj), teacherId, courseId],
                )
                const sectionId = sectionResult.rows[0].id
                results.sectionsCreated++

                // Keep teacher_data synchronized with imported section ownership.
                if (teacherId) {
                    await db.query(
                        `INSERT INTO teacher_data (teacher_id, course_id, advisory_section)
                         VALUES ($1, $2, $3)
                         ON CONFLICT (teacher_id)
                         DO UPDATE SET course_id = EXCLUDED.course_id,
                                       advisory_section = EXCLUDED.advisory_section`,
                        [teacherId, sectionId, block.section],
                    )
                    results.teacherDataUpserted++
                }

                /* ── 5. Enroll students ── */
                if (studentIds.length) {
                    const placeholders = studentIds.map((_, i) => `($1, $${i + 2})`).join(', ')
                    await db.query(
                        `INSERT INTO enrollment_data (section, student) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
                        [sectionId, ...studentIds],
                    )
                    results.enrollments += studentIds.length
                }
            } catch (err) {
                results.errors.push(`Course/section "${block.name}" / "${block.section}": ${String(err)}`)
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
