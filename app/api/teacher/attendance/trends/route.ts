export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

// Helper to get the Monday of a given week
function getMonday(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
}

// Helper to get Friday of a given week
function getFriday(date: Date): Date {
    const monday = getMonday(date)
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)
    return friday
}

// Helper to format date as "Mon DD"
function formatDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}`
}

// Helper to get full month name
function getMonthName(monthIndex: number): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December']
    return months[monthIndex]
}

// Helper to get day name from date
function getDayName(date: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[date.getDay()]
}

// Helper to get local date string (YYYY-MM-DD) without UTC offset shift
function toLocalDateStr(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

// Query helper: Get enrolled student count for a teacher's course/section
async function getEnrolledCount(userId: string, courseFilter: string | null, sectionFilter: string | null): Promise<number> {
    let query: string
    let params: any[]

    if (courseFilter && sectionFilter) {
        query = `SELECT COUNT(DISTINCT e.student) as enrolled_count
                 FROM enrollment_data e
                 INNER JOIN course c ON e.course = c.id
                 INNER JOIN student_data sd ON e.student = sd.student
                 WHERE c.teacher = $1 AND c.id = $2 AND sd.section = $3`
        params = [userId, courseFilter, sectionFilter]
    } else if (courseFilter) {
        query = `SELECT COUNT(DISTINCT e.student) as enrolled_count
                 FROM enrollment_data e
                 INNER JOIN course c ON e.course = c.id
                 WHERE c.teacher = $1 AND c.id = $2`
        params = [userId, courseFilter]
    } else {
        query = `SELECT COUNT(DISTINCT e.student) as enrolled_count
                 FROM enrollment_data e
                 INNER JOIN course c ON e.course = c.id
                 WHERE c.teacher = $1`
        params = [userId]
    }

    const result = await db.query(query, params)
    return parseInt(result.rows[0]?.enrolled_count || '0')
}

// Query helper: Get number of distinct school days with records in a date range
async function getSchoolDays(userId: string, courseFilter: string | null, sectionFilter: string | null, startStr: string, endStr: string): Promise<number> {
    let query: string
    let params: any[]

    if (courseFilter && sectionFilter) {
        query = `SELECT COUNT(DISTINCT DATE(r.time)) as school_days
                 FROM record r
                 INNER JOIN course c ON r.course = c.id
                 INNER JOIN student_data sd ON r.student = sd.student
                 WHERE c.teacher = $1
                   AND c.id = $2
                   AND sd.section = $3
                   AND r.time IS NOT NULL
                   AND DATE(r.time) >= $4
                   AND DATE(r.time) <= $5`
        params = [userId, courseFilter, sectionFilter, startStr, endStr]
    } else if (courseFilter) {
        query = `SELECT COUNT(DISTINCT DATE(r.time)) as school_days
                 FROM record r
                 INNER JOIN course c ON r.course = c.id
                 WHERE c.teacher = $1
                   AND c.id = $2
                   AND r.time IS NOT NULL
                   AND DATE(r.time) >= $3
                   AND DATE(r.time) <= $4`
        params = [userId, courseFilter, startStr, endStr]
    } else {
        query = `SELECT COUNT(DISTINCT DATE(r.time)) as school_days
                 FROM record r
                 INNER JOIN course c ON r.course = c.id
                 WHERE c.teacher = $1
                   AND r.time IS NOT NULL
                   AND DATE(r.time) >= $2
                   AND DATE(r.time) <= $3`
        params = [userId, startStr, endStr]
    }

    const result = await db.query(query, params)
    return parseInt(result.rows[0]?.school_days || '0')
}

// Query helper: Get present, late, and explicit absent counts in a date range
// Deduplicates by taking the first record per student per day (earliest detection)
// Absent is only counted from EXPLICIT records (attendance=0) — not inferred
async function getAttendanceCounts(userId: string, courseFilter: string | null, sectionFilter: string | null, startStr: string, endStr: string): Promise<{ present: number; late: number; absent: number }> {
    let query: string
    let params: any[]

    // Use a subquery with DISTINCT ON to get only the first record per student per day
    // Then count those deduplicated records
    if (courseFilter && sectionFilter) {
        query = `SELECT 
                    COUNT(CASE WHEN first_records.attendance = 1 THEN 1 END) as present,
                    COUNT(CASE WHEN first_records.attendance = 2 THEN 1 END) as late,
                    COUNT(CASE WHEN first_records.attendance = 0 THEN 1 END) as absent
                 FROM (
                    SELECT DISTINCT ON (r.student, DATE(r.time))
                        r.attendance
                    FROM record r
                    INNER JOIN course c ON r.course = c.id
                    INNER JOIN student_data sd ON r.student = sd.student
                    WHERE c.teacher = $1
                      AND c.id = $2
                      AND sd.section = $3
                      AND r.time IS NOT NULL
                      AND DATE(r.time) >= $4
                      AND DATE(r.time) <= $5
                    ORDER BY r.student, DATE(r.time), r.time ASC
                 ) AS first_records`
        params = [userId, courseFilter, sectionFilter, startStr, endStr]
    } else if (courseFilter) {
        query = `SELECT 
                    COUNT(CASE WHEN first_records.attendance = 1 THEN 1 END) as present,
                    COUNT(CASE WHEN first_records.attendance = 2 THEN 1 END) as late,
                    COUNT(CASE WHEN first_records.attendance = 0 THEN 1 END) as absent
                 FROM (
                    SELECT DISTINCT ON (r.student, DATE(r.time))
                        r.attendance
                    FROM record r
                    INNER JOIN course c ON r.course = c.id
                    WHERE c.teacher = $1
                      AND c.id = $2
                      AND r.time IS NOT NULL
                      AND DATE(r.time) >= $3
                      AND DATE(r.time) <= $4
                    ORDER BY r.student, DATE(r.time), r.time ASC
                 ) AS first_records`
        params = [userId, courseFilter, startStr, endStr]
    } else {
        query = `SELECT 
                    COUNT(CASE WHEN first_records.attendance = 1 THEN 1 END) as present,
                    COUNT(CASE WHEN first_records.attendance = 2 THEN 1 END) as late,
                    COUNT(CASE WHEN first_records.attendance = 0 THEN 1 END) as absent
                 FROM (
                    SELECT DISTINCT ON (r.student, DATE(r.time))
                        r.attendance
                    FROM record r
                    INNER JOIN course c ON r.course = c.id
                    WHERE c.teacher = $1
                      AND r.time IS NOT NULL
                      AND DATE(r.time) >= $2
                      AND DATE(r.time) <= $3
                    ORDER BY r.student, DATE(r.time), r.time ASC
                 ) AS first_records`
        params = [userId, startStr, endStr]
    }

    const result = await db.query(query, params)
    const row = result.rows[0] || { present: 0, late: 0, absent: 0 }
    return {
        present: parseInt(row.present || '0'),
        late: parseInt(row.late || '0'),
        absent: parseInt(row.absent || '0')
    }
}

export async function GET(req: Request) {
    try {
        const user = await currentUser()
        
        if (!user) {
            return NextResponse.json({ 
                success: false, 
                error: 'Not authenticated' 
            }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const view = searchParams.get('view') || 'weekly'
        const courseFilter = searchParams.get('course')
        const sectionFilter = searchParams.get('section')

        if (view === 'daily') {
            // Get last 7 days of attendance (like student portal)
            const now = new Date()
            const days: Array<{
                date: Date
                dayName: string
                dateLabel: string
            }> = []
            
            for (let i = 6; i >= 0; i--) {
                const day = new Date(now)
                day.setDate(now.getDate() - i)
                day.setHours(0, 0, 0, 0)
                
                days.push({
                    date: day,
                    dayName: getDayName(day),
                    dateLabel: formatDate(day)
                })
            }
            
            const dailyData = await Promise.all(days.map(async (dayInfo) => {
                const dateStr = toLocalDateStr(dayInfo.date)
                
                const { present, late, absent } = await getAttendanceCounts(user.id, courseFilter, sectionFilter, dateStr, dateStr)
                
                return {
                    day: dayInfo.dayName,
                    date: dayInfo.dateLabel,
                    present,
                    late,
                    absent
                }
            }))
            
            return NextResponse.json({ 
                success: true, 
                data: dailyData
            })
            
        } else if (view === 'weekly') {
            // Get 4 weeks of the current month with date ranges (school days Mon-Fri)
            const now = new Date()
            const currentMonth = now.getMonth()
            const currentYear = now.getFullYear()
            
            // Find the first Monday of the month
            const firstOfMonth = new Date(currentYear, currentMonth, 1)
            const dayOfWeek = firstOfMonth.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
            
            // Calculate days until the first Monday
            // If Feb 1 is Sunday (0), we need to add 1 day to get to Monday
            // If Feb 1 is Monday (1), we add 0 days
            // If Feb 1 is Saturday (6), we need to add 2 days
            let daysUntilMonday = (dayOfWeek === 0) ? 1 : (dayOfWeek === 1) ? 0 : (8 - dayOfWeek)
            
            const firstMonday = new Date(currentYear, currentMonth, 1 + daysUntilMonday)
            
            // Generate 4 weeks
            const weeks: Array<{
                week: string
                dateRange: string
                startDate: Date
                endDate: Date
            }> = []
            
            for (let i = 0; i < 4; i++) {
                const monday = new Date(firstMonday)
                monday.setDate(firstMonday.getDate() + (i * 7))
                monday.setHours(0, 0, 0, 0)
                
                const friday = new Date(monday)
                friday.setDate(monday.getDate() + 4)
                friday.setHours(23, 59, 59, 999)
                
                weeks.push({
                    week: `Week ${i + 1}`,
                    dateRange: `${formatDate(monday)} - ${formatDate(friday)}`,
                    startDate: monday,
                    endDate: friday
                })
            }
            
            // Query attendance for each week
            const weeklyData = await Promise.all(weeks.map(async (weekInfo) => {
                const startStr = toLocalDateStr(weekInfo.startDate)
                const endStr = toLocalDateStr(weekInfo.endDate)
                
                const { present, late, absent } = await getAttendanceCounts(user.id, courseFilter, sectionFilter, startStr, endStr)
                
                return {
                    week: weekInfo.week,
                    dateRange: weekInfo.dateRange,
                    present,
                    late,
                    absent
                }
            }))
            
            return NextResponse.json({ 
                success: true, 
                data: weeklyData
            })
            
        } else if (view === 'monthly') {
            // Get last 6 months with actual month names
            const now = new Date()
            const months: Array<{
                name: string
                shortName: string
                startDate: Date
                endDate: Date
            }> = []
            
            for (let i = 5; i >= 0; i--) {
                const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
                const lastDay = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
                
                months.push({
                    name: getMonthName(monthDate.getMonth()),
                    shortName: getMonthName(monthDate.getMonth()).substring(0, 3),
                    startDate: monthDate,
                    endDate: lastDay
                })
            }
            
            const monthlyData = await Promise.all(months.map(async (monthInfo) => {
                const startStr = toLocalDateStr(monthInfo.startDate)
                const endStr = toLocalDateStr(monthInfo.endDate)
                
                const { present, late, absent } = await getAttendanceCounts(user.id, courseFilter, sectionFilter, startStr, endStr)
                
                const total = present + late + absent
                
                // Calculate attendance rate: only present counts
                const attendanceRate = total > 0 
                    ? parseFloat(((present / total) * 100).toFixed(1))
                    : 0
                
                return {
                    month: monthInfo.shortName,
                    fullMonth: monthInfo.name,
                    present,
                    late,
                    absent,
                    total,
                    attendanceRate
                }
            }))
            
            return NextResponse.json({ 
                success: true, 
                data: monthlyData
            })
            
        } else if (view === 'quarterly') {
            // Academic quarters (semesters):
            // Q1 (1st Sem): July 7 - September 30
            // Q2 (1st Sem): October 1 - November 30
            // Q3 (2nd Sem): December 1 - February 28
            // Q4 (2nd Sem): March 1 - April 14
            
            // Note: Using academic year 2025-2026
            const quarters = [
                {
                    name: 'Q1',
                    label: 'Quarter 1 (1st Sem)',
                    semester: '1st Semester',
                    startDate: new Date(2025, 6, 7),   // July 7, 2025
                    endDate: new Date(2025, 8, 30)     // Sep 30, 2025
                },
                {
                    name: 'Q2',
                    label: 'Quarter 2 (1st Sem)',
                    semester: '1st Semester',
                    startDate: new Date(2025, 9, 1),   // Oct 1, 2025
                    endDate: new Date(2025, 10, 30)    // Nov 30, 2025
                },
                {
                    name: 'Q3',
                    label: 'Quarter 3 (2nd Sem)',
                    semester: '2nd Semester',
                    startDate: new Date(2025, 11, 1),  // Dec 1, 2025
                    endDate: new Date(2026, 1, 28)     // Feb 28, 2026
                },
                {
                    name: 'Q4',
                    label: 'Quarter 4 (2nd Sem)',
                    semester: '2nd Semester',
                    startDate: new Date(2026, 2, 1),   // Mar 1, 2026
                    endDate: new Date(2026, 3, 14)     // Apr 14, 2026
                }
            ]
            
            const quarterlyData = await Promise.all(quarters.map(async (quarter) => {
                const startStr = toLocalDateStr(quarter.startDate)
                const endStr = toLocalDateStr(quarter.endDate)
                
                const { present, late, absent } = await getAttendanceCounts(user.id, courseFilter, sectionFilter, startStr, endStr)
                
                // Format date range for tooltip
                const formatQuarterDate = (d: Date) => {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                    return `${months[d.getMonth()]} ${d.getDate()}`
                }
                
                return {
                    name: quarter.name,
                    label: quarter.label,
                    semester: quarter.semester,
                    dateRange: `${formatQuarterDate(quarter.startDate)} - ${formatQuarterDate(quarter.endDate)}`,
                    present: present,
                    late: late,
                    absent: absent
                }
            }))
            
            return NextResponse.json({ 
                success: true, 
                data: quarterlyData
            })
        }
        
        return NextResponse.json({ 
            success: false, 
            error: 'Invalid view parameter' 
        }, { status: 400 })
        
    } catch (error) {
        console.error('Error fetching attendance trends:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch attendance trends'
        }, { status: 500 })
    }
}
