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

        if (view === 'weekly') {
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
                const startStr = weekInfo.startDate.toISOString()
                const endStr = weekInfo.endDate.toISOString()
                
                const query = courseFilter
                    ? `SELECT 
                        COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                        COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                        COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent
                       FROM record r
                       INNER JOIN course c ON r.course = c.id
                       WHERE c.teacher = $1
                         AND c.id = $2
                         AND r.time >= $3
                         AND r.time <= $4`
                    : `SELECT 
                        COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                        COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                        COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent
                       FROM record r
                       INNER JOIN course c ON r.course = c.id
                       WHERE c.teacher = $1
                         AND r.time >= $2
                         AND r.time <= $3`
                
                const params = courseFilter
                    ? [user.id, courseFilter, startStr, endStr]
                    : [user.id, startStr, endStr]
                
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
                const startStr = monthInfo.startDate.toISOString()
                const endDate = new Date(monthInfo.endDate)
                endDate.setHours(23, 59, 59, 999)
                const endStr = endDate.toISOString()
                
                const query = courseFilter
                    ? `SELECT 
                        COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                        COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                        COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent,
                        COUNT(*) as total
                       FROM record r
                       INNER JOIN course c ON r.course = c.id
                       WHERE c.teacher = $1
                         AND c.id = $2
                         AND r.time >= $3
                         AND r.time <= $4`
                    : `SELECT 
                        COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                        COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                        COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent,
                        COUNT(*) as total
                       FROM record r
                       INNER JOIN course c ON r.course = c.id
                       WHERE c.teacher = $1
                         AND r.time >= $2
                         AND r.time <= $3`
                
                const params = courseFilter
                    ? [user.id, courseFilter, startStr, endStr]
                    : [user.id, startStr, endStr]
                
                const result = await db.query(query, params)
                const row = result.rows[0] || { present: 0, late: 0, absent: 0, total: 0 }
                
                const present = parseInt(row.present || '0')
                const late = parseInt(row.late || '0')
                const absent = parseInt(row.absent || '0')
                const total = parseInt(row.total || '0')
                
                // Calculate attendance rate: Present=100%, Late=50%, Absent=0%
                const attendanceRate = total > 0 
                    ? parseFloat(((present * 1 + late * 0.5) / total * 100).toFixed(1))
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
            // Academic quarters: Each quarter = 1.5 months
            // For a semester (6 months): Q1 (Month 1 - mid Month 2), Q2 (mid Month 2 - Month 3),
            // Q3 (Month 4 - mid Month 5), Q4 (mid Month 5 - Month 6)
            
            // Assuming 2nd semester starts in August and ends in January
            // For 2nd Semester 2025-2026: August 2025 - January 2026
            const semesterStart = new Date(2025, 7, 1) // August 1, 2025
            
            const quarters = [
                {
                    name: 'Q1',
                    label: 'Quarter 1',
                    startDate: new Date(2025, 7, 1),   // Aug 1
                    endDate: new Date(2025, 8, 15)    // Sep 15
                },
                {
                    name: 'Q2',
                    label: 'Quarter 2',
                    startDate: new Date(2025, 8, 16),  // Sep 16
                    endDate: new Date(2025, 9, 31)    // Oct 31
                },
                {
                    name: 'Q3',
                    label: 'Quarter 3',
                    startDate: new Date(2025, 10, 1),  // Nov 1
                    endDate: new Date(2025, 11, 15)   // Dec 15
                },
                {
                    name: 'Q4',
                    label: 'Quarter 4',
                    startDate: new Date(2025, 11, 16), // Dec 16
                    endDate: new Date(2026, 0, 31)    // Jan 31
                }
            ]
            
            const quarterlyData = await Promise.all(quarters.map(async (quarter) => {
                const startStr = quarter.startDate.toISOString()
                const endDate = new Date(quarter.endDate)
                endDate.setHours(23, 59, 59, 999)
                const endStr = endDate.toISOString()
                
                const query = courseFilter
                    ? `SELECT 
                        COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                        COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                        COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent
                       FROM record r
                       INNER JOIN course c ON r.course = c.id
                       WHERE c.teacher = $1
                         AND c.id = $2
                         AND r.time >= $3
                         AND r.time <= $4`
                    : `SELECT 
                        COUNT(CASE WHEN r.attendance = 1 THEN 1 END) as present,
                        COUNT(CASE WHEN r.attendance = 2 THEN 1 END) as late,
                        COUNT(CASE WHEN r.attendance = 0 THEN 1 END) as absent
                       FROM record r
                       INNER JOIN course c ON r.course = c.id
                       WHERE c.teacher = $1
                         AND r.time >= $2
                         AND r.time <= $3`
                
                const params = courseFilter
                    ? [user.id, courseFilter, startStr, endStr]
                    : [user.id, startStr, endStr]
                
                const result = await db.query(query, params)
                const row = result.rows[0] || { present: 0, late: 0, absent: 0 }
                
                // Format date range for tooltip
                const formatQuarterDate = (d: Date) => {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                    return `${months[d.getMonth()]} ${d.getDate()}`
                }
                
                return {
                    name: quarter.name,
                    label: quarter.label,
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
        console.error('Error fetching attendance trends:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch attendance trends'
        }, { status: 500 })
    }
}
