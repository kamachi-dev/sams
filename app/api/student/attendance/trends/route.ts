export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import { currentUser } from '@clerk/nextjs/server'

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

// Get day name
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
        const subjectFilter = searchParams.get('subject') // optional subject/course filter

        // Get student's ID from student_data table
        const studentResult = await db.query(
            `SELECT id FROM student_data WHERE student = $1`,
            [user.id]
        )

        if (studentResult.rows.length === 0) {
            return NextResponse.json({ 
                success: false, 
                error: 'Student not found' 
            }, { status: 404 })
        }

        const studentDataId = studentResult.rows[0].id

        if (view === 'daily') {
            // Get last 7 days of attendance
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
                
                let query = `
                    SELECT 
                        COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                        COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                        COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent
                    FROM record r
                    INNER JOIN enrollment_data e ON r.course = e.course AND r.student = e.student
                    WHERE e.student = $1
                      AND DATE(r.time) = $2
                `
                const params: any[] = [user.id, dateStr]
                
                if (subjectFilter && subjectFilter !== 'all') {
                    query += ` AND r.course = $3`
                    params.push(subjectFilter)
                }
                
                const result = await db.query(query, params)
                const row = result.rows[0] || { present: 0, late: 0, absent: 0 }
                
                return {
                    day: dayInfo.dayName,
                    date: dayInfo.dateLabel,
                    present: parseInt(row.present || '0'),
                    late: parseInt(row.late || '0'),
                    absent: parseInt(row.absent || '0')
                }
            }))
            
            return NextResponse.json({ 
                success: true, 
                data: dailyData
            })
            
        } else if (view === 'weekly') {
            // Get 4 weeks of the current month
            const now = new Date()
            const currentMonth = now.getMonth()
            const currentYear = now.getFullYear()
            
            // Find the first Monday of the month
            const firstOfMonth = new Date(currentYear, currentMonth, 1)
            const dayOfWeek = firstOfMonth.getDay()
            let daysUntilMonday = (dayOfWeek === 0) ? 1 : (dayOfWeek === 1) ? 0 : (8 - dayOfWeek)
            const firstMonday = new Date(currentYear, currentMonth, 1 + daysUntilMonday)
            
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
            
            const weeklyData = await Promise.all(weeks.map(async (weekInfo) => {
                const startStr = toLocalDateStr(weekInfo.startDate)
                const endStr = toLocalDateStr(weekInfo.endDate)
                
                let query = `
                    SELECT 
                        COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                        COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                        COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent
                    FROM record r
                    INNER JOIN enrollment_data e ON r.course = e.course AND r.student = e.student
                    WHERE e.student = $1
                      AND DATE(r.time) >= $2
                      AND DATE(r.time) <= $3
                `
                const params: any[] = [user.id, startStr, endStr]
                
                if (subjectFilter && subjectFilter !== 'all') {
                    query += ` AND r.course = $4`
                    params.push(subjectFilter)
                }
                
                const result = await db.query(query, params)
                const row = result.rows[0] || { present: 0, late: 0, absent: 0 }
                
                return {
                    week: weekInfo.week,
                    dateRange: weekInfo.dateRange,
                    present: parseInt(row.present || '0'),
                    late: parseInt(row.late || '0'),
                    absent: parseInt(row.absent || '0')
                }
            }))
            
            return NextResponse.json({ 
                success: true, 
                data: weeklyData
            })
            
        } else if (view === 'monthly') {
            // Get last 6 months
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
                
                let query = `
                    SELECT 
                        COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                        COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                        COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent
                    FROM record r
                    INNER JOIN enrollment_data e ON r.course = e.course AND r.student = e.student
                    WHERE e.student = $1
                      AND DATE(r.time) >= $2
                      AND DATE(r.time) <= $3
                `
                const params: any[] = [user.id, startStr, endStr]
                
                if (subjectFilter && subjectFilter !== 'all') {
                    query += ` AND r.course = $4`
                    params.push(subjectFilter)
                }
                
                const result = await db.query(query, params)
                const row = result.rows[0] || { present: 0, late: 0, absent: 0 }
                
                const present = parseInt(row.present || '0')
                const late = parseInt(row.late || '0')
                const absent = parseInt(row.absent || '0')
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
                
                let query = `
                    SELECT 
                        COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                        COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                        COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent
                    FROM record r
                    INNER JOIN enrollment_data e ON r.course = e.course AND r.student = e.student
                    WHERE e.student = $1
                      AND DATE(r.time) >= $2
                      AND DATE(r.time) <= $3
                `
                const params: any[] = [user.id, startStr, endStr]
                
                if (subjectFilter && subjectFilter !== 'all') {
                    query += ` AND r.course = $4`
                    params.push(subjectFilter)
                }
                
                const result = await db.query(query, params)
                const row = result.rows[0] || { present: 0, late: 0, absent: 0 }
                
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
                    present: parseInt(row.present || '0'),
                    late: parseInt(row.late || '0'),
                    absent: parseInt(row.absent || '0')
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
        console.error('Error fetching student attendance trends:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch attendance trends'
        }, { status: 500 })
    }
}
