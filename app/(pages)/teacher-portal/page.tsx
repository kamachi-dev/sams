"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import * as XLSX from 'xlsx';
import { 
    MagnifyingGlassIcon, 
    PersonIcon, 
    DownloadIcon,
    CalendarIcon,
    BookmarkIcon,
    DashboardIcon,
    ExclamationTriangleIcon,
    BarChartIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from "@radix-ui/react-icons";
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Legend, 
    LineChart, 
    Line,
    PieChart,
    Pie,
    Cell,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis
} from "recharts";
import { useState, useEffect } from "react";
import './styles.css';

// Types for low attendance students
interface LowAttendanceStudent {
    id: string;
    name: string;
    email: string;
    courseId: string;
    courseName: string;
    totalRecords: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    attendanceRate: number;
}

// Types for comparative analytics
interface StudentForComparison {
    id: string;
    name: string;
    email: string;
}

interface ComparisonData {
    student: {
        id: string;
        name: string;
        courseName: string;
        totalRecords: number;
        present: number;
        late: number;
        absent: number;
        attendanceRate: number;
    } | null;
    class: {
        totalStudents: number;
        totalRecords: number;
        present: number;
        late: number;
        absent: number;
        attendanceRate: number;
    };
    monthlyComparison: Array<{
        month: string;
        studentRate: number;
        classRate: number;
    }>;
    comparison: {
        rateVsClass: string | null;
        status: 'above' | 'below' | 'unknown';
    };
}

export default function Teacher() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [selectedView, setSelectedView] = useState<"daily" | "weekly" | "monthly" | "quarterly">("daily");
    const [totalStudents, setTotalStudents] = useState<number>(0);
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);
    const [todayAttendance, setTodayAttendance] = useState({ present: 0, late: 0, absent: 0, total: 0, attendanceRate: 0 });
    const [attendanceRecords, setAttendanceRecords] = useState<Array<{
        id: string;
        name: string;
        email: string;
        course: string;
        status: string;
        time: string;
        confidence: string;
    }>>([]);
    const [isLoadingRecords, setIsLoadingRecords] = useState(true);
    const [courses, setCourses] = useState<Array<{ id: string; name: string; studentCount?: number; sectionCount?: number }>>([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedChartCourse, setSelectedChartCourse] = useState("all");
    const [semesterAttendance, setSemesterAttendance] = useState({ present: 0, late: 0, absent: 0, total: 0, attendanceRate: 0 });

    // Overview drill-down state
    const [overviewStep, setOverviewStep] = useState<'courses' | 'sections' | 'stats'>('courses');
    const [selectedOverviewCourse, setSelectedOverviewCourse] = useState<{ id: string; name: string } | null>(null);
    const [courseSections, setCourseSections] = useState<Array<{ section: string; studentCount: number }>>([]);
    const [selectedSection, setSelectedSection] = useState<string>("");
    const [isLoadingSections, setIsLoadingSections] = useState(false);

    // Low Attendance Students State
    const [lowAttendanceStudents, setLowAttendanceStudents] = useState<LowAttendanceStudent[]>([]);
    const [isLoadingLowAttendance, setIsLoadingLowAttendance] = useState(true);
    const [lowAttendanceThreshold, setLowAttendanceThreshold] = useState(50);
    const [lowAttendanceCourseFilter, setLowAttendanceCourseFilter] = useState("all");

    // Comparative Analytics State
    const [studentsForComparison, setStudentsForComparison] = useState<StudentForComparison[]>([]);
    const [selectedStudentForComparison, setSelectedStudentForComparison] = useState("");
    const [selectedCourseForComparison, setSelectedCourseForComparison] = useState("");
    const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
    const [isLoadingComparison, setIsLoadingComparison] = useState(false);

    // Trend Data State
    const [weeklyTrendData, setWeeklyTrendData] = useState<Array<{
        week: string;
        dateRange: string;
        present: number;
        late: number;
        absent: number;
    }>>([]);
    const [monthlyTrendData, setMonthlyTrendData] = useState<Array<{
        month: string;
        fullMonth: string;
        present: number;
        late: number;
        absent: number;
        total: number;
        attendanceRate: number;
    }>>([]);
    const [quarterlyTrendData, setQuarterlyTrendData] = useState<Array<{
        name: string;
        label: string;
        semester: string;
        dateRange: string;
        present: number;
        late: number;
        absent: number;
    }>>([]);

    // Helper function to get current semester info
    const getCurrentSemester = () => {
        const now = new Date();
        const month = now.getMonth(); // 0=Jan, 1=Feb, ..., 11=Dec
        const day = now.getDate();
        
        // Q1 (1st Sem): July 7 - September 30
        if ((month === 6 && day >= 7) || month === 7 || month === 8) {
            return { semester: '1st Semester', quarter: 'Q1', range: 'July 7 - September 30' };
        }
        // Q2 (1st Sem): October 1 - November 30  
        if (month === 9 || month === 10) {
            return { semester: '1st Semester', quarter: 'Q2', range: 'October 1 - November 30' };
        }
        // Q3 (2nd Sem): December 1 - February 28
        if (month === 11 || month === 0 || month === 1) {
            return { semester: '2nd Semester', quarter: 'Q3', range: 'December 1 - February 28' };
        }
        // Q4 (2nd Sem): March 1 - April 14
        if (month === 2 || (month === 3 && day <= 14)) {
            return { semester: '2nd Semester', quarter: 'Q4', range: 'March 1 - April 14' };
        }
        // Summer break or other period
        if ((month === 3 && day > 14) || month === 4 || month === 5 || (month === 6 && day < 7)) {
            return { semester: 'Summer Break', quarter: '', range: 'April 15 - July 6' };
        }
        
        return { semester: '2nd Semester', quarter: 'Q3', range: 'December 1 - February 28' };
    };

    const currentSemesterInfo = getCurrentSemester();

    // Fetch total students count from database
    useEffect(() => {
        const fetchStudentCount = async () => {
            try {
                const response = await fetch('/api/teacher/students/count');
                const result = await response.json();
                if (result.success) {
                    setTotalStudents(result.data.count);
                }
            } catch (error) {
                console.error('Error fetching student count:', error);
            } finally {
                setIsLoadingStudents(false);
            }
        };
        
        fetchStudentCount();
    }, []);

    // Fetch today's attendance data
    useEffect(() => {
        const fetchTodayAttendance = async () => {
            try {
                const params = new URLSearchParams();
                if (selectedCourse) params.set('course', selectedCourse);
                if (overviewStep === 'stats' && selectedSection) params.set('section', selectedSection);
                const queryStr = params.toString() ? `?${params.toString()}` : '';
                const response = await fetch(`/api/teacher/attendance/today${queryStr}`);
                const result = await response.json();
                if (result.success) {
                    setTodayAttendance(result.data);
                }
            } catch (error) {
                console.error('Error fetching today\'s attendance:', error);
            }
        };
        
        fetchTodayAttendance();
    }, [selectedCourse, selectedSection, overviewStep]);

    // Fetch semester-wide attendance summary (for average attendance rate)
    useEffect(() => {
        const fetchSemesterAttendance = async () => {
            try {
                const params = new URLSearchParams();
                if (selectedChartCourse !== "all") params.set('course', selectedChartCourse);
                if (overviewStep === 'stats' && selectedSection) params.set('section', selectedSection);
                const queryStr = params.toString() ? `?${params.toString()}` : '';
                const response = await fetch(`/api/teacher/attendance/summary${queryStr}`);
                const result = await response.json();
                if (result.success) {
                    setSemesterAttendance(result.data);
                }
            } catch (error) {
                console.error('Error fetching semester attendance:', error);
            }
        };
        
        fetchSemesterAttendance();
    }, [selectedChartCourse, selectedSection, overviewStep]);

    // Fetch trend data for charts (weekly, monthly, quarterly)
    useEffect(() => {
        const fetchTrendData = async () => {
            try {
                const courseParam = selectedChartCourse !== "all" ? `&course=${selectedChartCourse}` : '';
                
                const [weeklyRes, monthlyRes, quarterlyRes] = await Promise.all([
                    fetch(`/api/teacher/attendance/trends?view=weekly${courseParam}`),
                    fetch(`/api/teacher/attendance/trends?view=monthly${courseParam}`),
                    fetch(`/api/teacher/attendance/trends?view=quarterly${courseParam}`)
                ]);

                const [weeklyData, monthlyData, quarterlyData] = await Promise.all([
                    weeklyRes.json(),
                    monthlyRes.json(),
                    quarterlyRes.json()
                ]);

                if (weeklyData.success) {
                    setWeeklyTrendData(weeklyData.data);
                }
                if (monthlyData.success) {
                    setMonthlyTrendData(monthlyData.data);
                }
                if (quarterlyData.success) {
                    setQuarterlyTrendData(quarterlyData.data);
                }
            } catch (error) {
                console.error('Error fetching trend data:', error);
            }
        };
        
        fetchTrendData();
    }, [selectedChartCourse, selectedView]);

    // Fetch attendance records
    useEffect(() => {
        const fetchAttendanceRecords = async () => {
            if (!selectedCourse) {
                setIsLoadingRecords(false);
                return;
            }
            
            setIsLoadingRecords(true);
            try {
                const params = new URLSearchParams({ course: selectedCourse });
                if (overviewStep === 'stats' && selectedSection) params.set('section', selectedSection);
                const url = `/api/teacher/attendance/records?${params.toString()}`;
                const response = await fetch(url);
                const result = await response.json();
                if (result.success) {
                    setAttendanceRecords(result.data);
                }
            } catch (error) {
                console.error('Error fetching attendance records:', error);
            } finally {
                setIsLoadingRecords(false);
            }
        };
        
        fetchAttendanceRecords();
    }, [selectedCourse, selectedSection, overviewStep]);

    // Fetch teacher's courses
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await fetch('/api/teacher/courses');
                const result = await response.json();
                if (result.success) {
                    setCourses(result.data);
                    if (result.data.length > 0 && !selectedCourse) {
                        setSelectedCourse(result.data[0].id);
                    }
                    // Set default course for comparison
                    if (result.data.length > 0 && !selectedCourseForComparison) {
                        setSelectedCourseForComparison(result.data[0].id);
                    }
                }
            } catch (error) {
                console.error('Error fetching courses:', error);
            }
        };
        
        fetchCourses();
    }, []);

    // Fetch sections when a course is selected in the overview drill-down
    useEffect(() => {
        const fetchSections = async () => {
            if (!selectedOverviewCourse) return;
            
            setIsLoadingSections(true);
            try {
                const response = await fetch(`/api/teacher/courses/sections?course=${selectedOverviewCourse.id}`);
                const result = await response.json();
                if (result.success) {
                    setCourseSections(result.data.sections);
                }
            } catch (error) {
                console.error('Error fetching sections:', error);
            } finally {
                setIsLoadingSections(false);
            }
        };
        
        fetchSections();
    }, [selectedOverviewCourse]);

    // When a section is selected, update the data fetchers
    useEffect(() => {
        if (overviewStep === 'stats' && selectedOverviewCourse && selectedSection) {
            // Set the course for the records table and charts
            setSelectedCourse(selectedOverviewCourse.id);
            setSelectedChartCourse(selectedOverviewCourse.id);
        }
    }, [overviewStep, selectedOverviewCourse, selectedSection]);

    // Fetch low attendance students
    useEffect(() => {
        const fetchLowAttendanceStudents = async () => {
            setIsLoadingLowAttendance(true);
            try {
                const courseParam = lowAttendanceCourseFilter !== "all" ? `&course=${lowAttendanceCourseFilter}` : '';
                const response = await fetch(`/api/teacher/students/low-attendance?threshold=${lowAttendanceThreshold}${courseParam}`);
                const result = await response.json();
                if (result.success) {
                    setLowAttendanceStudents(result.data);
                }
            } catch (error) {
                console.error('Error fetching low attendance students:', error);
            } finally {
                setIsLoadingLowAttendance(false);
            }
        };
        
        fetchLowAttendanceStudents();
    }, [lowAttendanceThreshold, lowAttendanceCourseFilter]);

    // Fetch students list for comparison dropdown
    useEffect(() => {
        const fetchStudentsForComparison = async () => {
            if (!selectedCourseForComparison) return;
            
            try {
                const response = await fetch(`/api/teacher/students/list?course=${selectedCourseForComparison}`);
                const result = await response.json();
                if (result.success) {
                    setStudentsForComparison(result.data);
                    setSelectedStudentForComparison(''); // Reset student selection when course changes
                    setComparisonData(null);
                }
            } catch (error) {
                console.error('Error fetching students for comparison:', error);
            }
        };
        
        fetchStudentsForComparison();
    }, [selectedCourseForComparison]);

    // Fetch comparative analytics data
    useEffect(() => {
        const fetchComparisonData = async () => {
            if (!selectedStudentForComparison || !selectedCourseForComparison) {
                setComparisonData(null);
                return;
            }
            
            setIsLoadingComparison(true);
            try {
                const response = await fetch(
                    `/api/teacher/analytics/compare?student=${selectedStudentForComparison}&course=${selectedCourseForComparison}`
                );
                const result = await response.json();
                if (result.success) {
                    setComparisonData(result.data);
                }
            } catch (error) {
                console.error('Error fetching comparison data:', error);
            } finally {
                setIsLoadingComparison(false);
            }
        };
        
        fetchComparisonData();
    }, [selectedStudentForComparison, selectedCourseForComparison]);

    const handleExport = async () => {
        setIsExporting(true);
        
        try {
            let data: any[] = [];
            let fileName = '';
            
            const courseLabel = selectedChartCourse === 'all' 
                ? 'All Subjects' 
                : courses.find(c => c.id === selectedChartCourse)?.name || 'Selected Course';
            
            const sanitizedCourseLabel = courseLabel.replace(/[^a-z0-9]/gi, '_');
            const dateStr = new Date().toISOString().split('T')[0];
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Helper function to fetch records for a date range
            const fetchRecordsForDateRange = async (startDate: Date, endDate: Date) => {
                const allRecords: any[] = [];
                
                if (selectedChartCourse === 'all') {
                    for (const course of courses) {
                        const response = await fetch(`/api/teacher/attendance/records?course=${course.id}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`);
                        const result = await response.json();
                        if (result.success) {
                            allRecords.push(...result.data);
                        }
                    }
                } else {
                    const response = await fetch(`/api/teacher/attendance/records?course=${selectedChartCourse}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`);
                    const result = await response.json();
                    if (result.success) {
                        allRecords.push(...result.data);
                    }
                }
                
                return allRecords;
            };
            
            // Helper function to create status sheets
            const createStatusSheets = (records: any[], includeWeekInfo = false) => {
                const presentStudents = records.filter(r => r.status === 'present');
                const lateStudents = records.filter(r => r.status === 'late');
                const absentStudents = records.filter(r => r.status === 'absent');
                
                if (presentStudents.length > 0) {
                    const presentData = presentStudents.map(s => {
                        const data: any = {
                            'Student Name': s.name,
                            'Email': s.email
                        };
                        if (selectedChartCourse === 'all') data['Course'] = s.course;
                        if (includeWeekInfo) data['Week/Period'] = s.weekInfo;
                        data['Date'] = s.date || new Date(s.time).toLocaleDateString();
                        data['Time'] = s.time;
                        data['Confidence'] = s.confidence;
                        return data;
                    });
                    const presentWs = XLSX.utils.json_to_sheet(presentData);
                    XLSX.utils.book_append_sheet(wb, presentWs, 'Present Students');
                }
                
                if (lateStudents.length > 0) {
                    const lateData = lateStudents.map(s => {
                        const data: any = {
                            'Student Name': s.name,
                            'Email': s.email
                        };
                        if (selectedChartCourse === 'all') data['Course'] = s.course;
                        if (includeWeekInfo) data['Week/Period'] = s.weekInfo;
                        data['Date'] = s.date || new Date(s.time).toLocaleDateString();
                        data['Time'] = s.time;
                        data['Confidence'] = s.confidence;
                        return data;
                    });
                    const lateWs = XLSX.utils.json_to_sheet(lateData);
                    XLSX.utils.book_append_sheet(wb, lateWs, 'Late Students');
                }
                
                if (absentStudents.length > 0) {
                    const absentData = absentStudents.map(s => {
                        const data: any = {
                            'Student Name': s.name,
                            'Email': s.email
                        };
                        if (selectedChartCourse === 'all') data['Course'] = s.course;
                        if (includeWeekInfo) data['Week/Period'] = s.weekInfo;
                        data['Date'] = s.date || new Date(s.time).toLocaleDateString();
                        data['Time'] = s.time;
                        data['Confidence'] = s.confidence;
                        return data;
                    });
                    const absentWs = XLSX.utils.json_to_sheet(absentData);
                    XLSX.utils.book_append_sheet(wb, absentWs, 'Absent Students');
                }
            };
            
            if (selectedView === 'daily') {
                // Export daily attendance data with detailed student list
                fileName = `Daily_Attendance_${sanitizedCourseLabel}_${dateStr}.xlsx`;
                
                // Summary data
                const summaryData = [
                    { Status: 'Present', Count: todayAttendance.present },
                    { Status: 'Late', Count: todayAttendance.late },
                    { Status: 'Absent', Count: todayAttendance.absent },
                    { Status: 'Total', Count: todayAttendance.total },
                    { Status: 'Attendance Rate', Count: `${todayAttendance.attendanceRate}%` }
                ];
                const summaryWs = XLSX.utils.json_to_sheet(summaryData);
                XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
                
                // Fetch detailed student records
                try {
                    if (selectedChartCourse === 'all') {
                        const allRecords: any[] = [];
                        for (const course of courses) {
                            const response = await fetch(`/api/teacher/attendance/records?course=${course.id}`);
                            const result = await response.json();
                            if (result.success) {
                                allRecords.push(...result.data);
                            }
                        }
                        createStatusSheets(allRecords);
                    } else {
                        const response = await fetch(`/api/teacher/attendance/records?course=${selectedChartCourse}`);
                        const result = await response.json();
                        if (result.success) {
                            createStatusSheets(result.data);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching detailed records:', error);
                }
                
            } else if (selectedView === 'weekly') {
                // Export weekly attendance data with detailed student records
                fileName = `Weekly_Attendance_${sanitizedCourseLabel}_${dateStr}.xlsx`;
                
                // Summary data
                data = weeklyTrendData.map(week => ({
                    Week: week.week,
                    'Date Range': week.dateRange,
                    Present: week.present,
                    Late: week.late,
                    Absent: week.absent,
                    Total: week.present + week.late + week.absent
                }));
                const summaryWs = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
                
                // Fetch detailed records for all weeks
                try {
                    // We'll need to query the records API with date filters
                    // For now, we'll fetch all records from the current month
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    
                    const records = await fetchRecordsForDateRange(startOfMonth, endOfMonth);
                    
                    // Add week info to each record based on weeklyTrendData
                    const enrichedRecords = records.map((record: any) => {
                        // Parse the time to determine which week it belongs to
                        const recordDate = new Date(record.time);
                        const matchingWeek = weeklyTrendData.find(week => {
                            const [startStr, endStr] = week.dateRange.split(' - ');
                            return true; // Simplified - would need proper date parsing
                        });
                        
                        return {
                            ...record,
                            weekInfo: 'Current Month'
                        };
                    });
                    
                    createStatusSheets(enrichedRecords, true);
                } catch (error) {
                    console.error('Error fetching weekly detailed records:', error);
                }
                
            } else if (selectedView === 'monthly') {
                // Export monthly attendance data with detailed student records
                fileName = `Monthly_Attendance_${sanitizedCourseLabel}_${dateStr}.xlsx`;
                
                // Summary data
                data = monthlyTrendData.map(month => ({
                    Month: month.fullMonth,
                    Present: month.present,
                    Late: month.late,
                    Absent: month.absent,
                    Total: month.total,
                    'Attendance Rate': `${month.attendanceRate}%`
                }));
                const summaryWs = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
                
                // Fetch detailed records for last 6 months
                try {
                    const now = new Date();
                    const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    
                    const records = await fetchRecordsForDateRange(startDate, endDate);
                    
                    // Add month info to each record
                    const enrichedRecords = records.map((record: any) => {
                        const recordDate = new Date(record.time);
                        const monthName = recordDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        return {
                            ...record,
                            weekInfo: monthName
                        };
                    });
                    
                    createStatusSheets(enrichedRecords, true);
                } catch (error) {
                    console.error('Error fetching monthly detailed records:', error);
                }
                
            } else if (selectedView === 'quarterly') {
                // Export quarterly attendance data with detailed student records
                fileName = `Quarterly_Attendance_${sanitizedCourseLabel}_${dateStr}.xlsx`;
                
                // Summary data
                data = quarterlyTrendData.map(quarter => {
                    const semester = (quarter.name === 'Q1' || quarter.name === 'Q2') ? '1st Semester' : '2nd Semester';
                    return {
                        Quarter: quarter.label,
                        Semester: semester,
                        'Date Range': quarter.dateRange,
                        Present: quarter.present,
                        Late: quarter.late,
                        Absent: quarter.absent,
                        Total: quarter.present + quarter.late + quarter.absent
                    };
                });
                const summaryWs = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
                
                // Fetch detailed records for the entire semester
                try {
                    const startDate = new Date(2025, 7, 1); // Aug 1, 2025
                    const endDate = new Date(2026, 0, 31); // Jan 31, 2026
                    
                    const records = await fetchRecordsForDateRange(startDate, endDate);
                    
                    // Add quarter info to each record
                    const enrichedRecords = records.map((record: any) => {
                        const recordDate = new Date(record.time);
                        let quarterInfo = 'Unknown';
                        
                        for (const quarter of quarterlyTrendData) {
                            const [startStr, endStr] = quarter.dateRange.split(' - ');
                            quarterInfo = quarter.label;
                            break; // Simplified
                        }
                        
                        return {
                            ...record,
                            weekInfo: quarterInfo
                        };
                    });
                    
                    createStatusSheets(enrichedRecords, true);
                } catch (error) {
                    console.error('Error fetching quarterly detailed records:', error);
                }
            }
            
            // Add metadata sheet
            const metadata = [
                { Field: 'Export Date', Value: new Date().toLocaleString() },
                { Field: 'View Type', Value: selectedView.charAt(0).toUpperCase() + selectedView.slice(1) },
                { Field: 'Course Filter', Value: courseLabel },
                { Field: 'Academic Year', Value: '2025-2026' },
                { Field: 'Semester', Value: '2nd Semester' }
            ];
            const metaWs = XLSX.utils.json_to_sheet(metadata);
            XLSX.utils.book_append_sheet(wb, metaWs, 'Info');
            
            // Export file
            XLSX.writeFile(wb, fileName);
            
        } catch (error) {
            console.error('Error exporting attendance data:', error);
            alert('Failed to export attendance report. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const pieData = [
        { name: "Present", value: semesterAttendance.present, color: "var(--present)" },
        { name: "Late", value: semesterAttendance.late, color: "var(--late)" },
        { name: "Absent", value: semesterAttendance.absent, color: "var(--absent)" },
    ];

    return (
        <SamsTemplate links={[
            {
                label: "Overview",
                Icon: DashboardIcon,
                panels: overviewStep === 'stats' ? [
                    <div key="total-subjects" className="teacher-panel-card enroll">
                        <BookmarkIcon className="teacher-panel-icon" />
                        <div className="teacher-panel-content">
                            <div className="teacher-panel-label">Current Subject</div>
                            <div className="teacher-panel-value" style={{ fontSize: '16px' }}>{selectedOverviewCourse?.name || '-'}</div>
                            <div className="teacher-panel-sub">Section: {selectedSection}</div>
                        </div>
                    </div>,

                    <div key="attendance-rate" className="teacher-panel-card attendance">
                        <CalendarIcon className="teacher-panel-icon" />
                        <div className="teacher-panel-content">
                            <div className="teacher-panel-label">Overall Attendance Rate</div>
                            <div className="teacher-panel-value">{semesterAttendance.attendanceRate}%</div>
                            <div className="teacher-panel-sub">
                                {semesterAttendance.present} present out of {semesterAttendance.total} expected
                            </div>
                        </div>
                    </div>,

                    <div key="student-count" className="teacher-panel-card present">
                        <PersonIcon className="teacher-panel-icon" />
                        <div className="teacher-panel-content">
                            <div className="teacher-panel-label">Total Number of Students</div>
                            <div className="teacher-panel-value">
                                {isLoadingStudents ? "..." : totalStudents}
                            </div>
                            <div className="teacher-panel-sub">
                                Enrolled in your courses
                            </div>
                        </div>
                    </div>,
                ] : [
                    <div key="total-subjects" className="teacher-panel-card enroll">
                        <BookmarkIcon className="teacher-panel-icon" />
                        <div className="teacher-panel-content">
                            <div className="teacher-panel-label">Total Number of Subjects Handled</div>
                            <div className="teacher-panel-value">{courses.length}</div>
                            <div className="teacher-panel-sub">Active this semester</div>
                        </div>
                    </div>,

                    <div key="attendance-rate" className="teacher-panel-card attendance">
                        <CalendarIcon className="teacher-panel-icon" />
                        <div className="teacher-panel-content">
                            <div className="teacher-panel-label">Overall Attendance Rate</div>
                            <div className="teacher-panel-value">{semesterAttendance.attendanceRate}%</div>
                            <div className="teacher-panel-sub">
                                {semesterAttendance.present} present out of {semesterAttendance.total} expected
                            </div>
                        </div>
                    </div>,

                    <div key="student-count" className="teacher-panel-card present">
                        <PersonIcon className="teacher-panel-icon" />
                        <div className="teacher-panel-content">
                            <div className="teacher-panel-label">Total Number of Students</div>
                            <div className="teacher-panel-value">
                                {isLoadingStudents ? "..." : totalStudents}
                            </div>
                            <div className="teacher-panel-sub">
                                Enrolled in your courses
                            </div>
                        </div>
                    </div>,
                ],
                content: (
                    <div className="teacher-main-container">
                        {/* STEP 1: Course Cards */}
                        {overviewStep === 'courses' && (
                            <div className="overview-step-container">
                                <div className="overview-step-header">
                                    <h3 className="overview-step-title">
                                        <BookmarkIcon className="overview-step-icon" />
                                        Select a Course
                                    </h3>
                                    <p className="overview-step-subtitle">Choose a subject to view attendance details</p>
                                </div>
                                <div className="overview-cards-grid">
                                    {courses.map(course => (
                                        <div 
                                            key={course.id} 
                                            className="overview-course-card"
                                            onClick={() => {
                                                setSelectedOverviewCourse({ id: course.id, name: course.name });
                                                setOverviewStep('sections');
                                            }}
                                        >
                                            <div className="overview-course-card-header">
                                                <BookmarkIcon className="overview-course-card-icon" />
                                                <ChevronRightIcon className="overview-course-card-arrow" />
                                            </div>
                                            <div className="overview-course-card-body">
                                                <h4 className="overview-course-card-name">{course.name}</h4>
                                                <div className="overview-course-card-stats">
                                                    <div className="overview-course-stat">
                                                        <span className="overview-course-stat-value">{course.sectionCount || 0}</span>
                                                        <span className="overview-course-stat-label">
                                                            {(course.sectionCount || 0) === 1 ? 'Section' : 'Sections'}
                                                        </span>
                                                    </div>
                                                    <div className="overview-course-stat">
                                                        <span className="overview-course-stat-value">{course.studentCount || 0}</span>
                                                        <span className="overview-course-stat-label">Students</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Sections List */}
                        {overviewStep === 'sections' && (
                            <div className="overview-step-container">
                                <div className="overview-step-header">
                                    <button 
                                        className="overview-back-btn"
                                        onClick={() => {
                                            setOverviewStep('courses');
                                            setSelectedOverviewCourse(null);
                                            setCourseSections([]);
                                        }}
                                    >
                                        <ChevronLeftIcon /> Back to Courses
                                    </button>
                                    <h3 className="overview-step-title">
                                        <PersonIcon className="overview-step-icon" />
                                        {selectedOverviewCourse?.name} — Select a Section
                                    </h3>
                                    <p className="overview-step-subtitle">Choose a section to view detailed attendance statistics</p>
                                </div>
                                {isLoadingSections ? (
                                    <div className="overview-loading">Loading sections...</div>
                                ) : (
                                    <div className="overview-cards-grid">
                                        {courseSections.map(sec => (
                                            <div 
                                                key={sec.section} 
                                                className="overview-section-card"
                                                onClick={() => {
                                                    setSelectedSection(sec.section);
                                                    setOverviewStep('stats');
                                                }}
                                            >
                                                <div className="overview-section-card-header">
                                                    <PersonIcon className="overview-section-card-icon" />
                                                    <ChevronRightIcon className="overview-course-card-arrow" />
                                                </div>
                                                <div className="overview-section-card-body">
                                                    <h4 className="overview-section-card-name">{sec.section}</h4>
                                                    <div className="overview-section-card-count">
                                                        <span className="overview-course-stat-value">{sec.studentCount}</span>
                                                        <span className="overview-course-stat-label">
                                                            {sec.studentCount === 1 ? 'Student' : 'Students'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 3: Attendance Stats */}
                        {overviewStep === 'stats' && (
                            <>
                                <div className="overview-step-header" style={{ marginBottom: '12px' }}>
                                    <button 
                                        className="overview-back-btn"
                                        onClick={() => {
                                            setOverviewStep('sections');
                                            setSelectedSection("");
                                        }}
                                    >
                                        <ChevronLeftIcon /> Back to Sections
                                    </button>
                                    <h3 className="overview-step-title">
                                        <DashboardIcon className="overview-step-icon" />
                                        {selectedOverviewCourse?.name} — Section {selectedSection}
                                    </h3>
                                </div>
                                <div className="teacher-split-layout">

                                    {/* LEFT 50% */}
                                    <div className="teacher-left-column">
                                        <div className="teacher-info-card">
                                            <div className="teacher-info-header">
                                                <h3 className="teacher-info-title">Class Summary</h3>
                                                <div className="teacher-info-meta">
                                                    2nd Semester, S.Y. 2025-2026
                                                </div>
                                            </div>

                                            <div className="teacher-info-grid">
                                                <div>
                                                    <div className="teacher-info-field-label">Total Students</div>
                                                    <div className="teacher-info-field-value">
                                                        {isLoadingStudents ? "Loading..." : totalStudents}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="teacher-info-field-label">Section</div>
                                                    <div className="teacher-info-field-value">{selectedSection}</div>
                                                </div>
                                                <div>
                                                    <div className="teacher-info-field-label">Present Today</div>
                                                    <div className="teacher-info-field-value">{todayAttendance.present}</div>
                                                </div>
                                                <div>
                                                    <div className="teacher-info-field-label">Absent Today</div>
                                                    <div className="teacher-info-field-value">{todayAttendance.absent}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="teacher-summary-card">
                                            <h3 className="teacher-summary-title">
                                                Current Semester Summary
                                                <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666', marginLeft: '10px' }}>
                                                    ({currentSemesterInfo.semester} - {currentSemesterInfo.range})
                                                </span>
                                            </h3>

                                            <div className="teacher-summary-row">
                                                {/* LEFT: CHART */}
                                                <div className="teacher-summary-chart">
                                                    <ResponsiveContainer width={120} height={120}>
                                                        <PieChart>
                                                            <Pie
                                                                data={pieData}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={40}
                                                                outerRadius={55}
                                                                dataKey="value"
                                                                stroke="none"
                                                            >
                                                                {pieData.map((entry, index) => (
                                                                    <Cell key={index} fill={entry.color} />
                                                                ))}
                                                            </Pie>
                                                            <text
                                                                x="50%"
                                                                y="50%"
                                                                textAnchor="middle"
                                                                dominantBaseline="middle"
                                                                style={{
                                                                    fontSize: "14px",
                                                                    fontWeight: 600,
                                                                    fill: "#1F2F57",
                                                                }}
                                                            >
                                                                {semesterAttendance.attendanceRate}%
                                                            </text>
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                {/* RIGHT: DETAILS */}
                                                <div className="teacher-summary-legend">
                                                    {pieData.map((item, index) => (
                                                        <div key={index} className="teacher-legend-item">
                                                            <div className="teacher-legend-label-group">
                                                                <span
                                                                    className="teacher-legend-color"
                                                                    style={{ backgroundColor: item.color }}
                                                                />
                                                                <span className="teacher-legend-label">{item.name}</span>
                                                            </div>
                                                            <span className="teacher-legend-value">{item.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="teacher-filters">
                                            <div className="teacher-filters-group">
                                                <select
                                                    value={selectedView}
                                                    onChange={(e) => setSelectedView(e.target.value as any)}
                                                    className="teacher-select"
                                                >
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                    <option value="quarterly">Quarterly</option>
                                                </select>
                                            </div>

                                            <button
                                                onClick={handleExport}
                                                disabled={isExporting}
                                                className="teacher-export-btn"
                                            >
                                                <DownloadIcon />
                                                {isExporting ? "Exporting..." : ""}
                                            </button>
                                        </div>

                                        <div className="teacher-chart-container">
                                            <div className="teacher-chart-card">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    {selectedView === "daily" && (
                                                        <BarChart data={[
                                                            { category: "Present", count: todayAttendance.present },
                                                            { category: "Late", count: todayAttendance.late },
                                                            { category: "Absent", count: todayAttendance.absent }
                                                        ]}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="category" />
                                                            <YAxis />
                                                            <Tooltip 
                                                                content={({ active, payload }) => {
                                                                    if (active && payload && payload.length) {
                                                                        const category = payload[0]?.payload?.category;
                                                                        const count = payload[0]?.value;
                                                                        const colorMap: Record<string, string> = {
                                                                            'Present': 'var(--present)',
                                                                            'Late': 'var(--late)',
                                                                            'Absent': 'var(--absent)'
                                                                        };
                                                                        return (
                                                                            <div style={{ 
                                                                                backgroundColor: 'white', 
                                                                                padding: '10px', 
                                                                                border: '1px solid #ccc',
                                                                                borderRadius: '4px'
                                                                            }}>
                                                                                <p style={{ fontWeight: 'bold', marginBottom: '5px', color: '#1F2F57' }}>
                                                                                    {new Date().toLocaleDateString('en-US', { 
                                                                                        weekday: 'long', 
                                                                                        year: 'numeric', 
                                                                                        month: 'long', 
                                                                                        day: 'numeric' 
                                                                                    })}
                                                                                </p>
                                                                                <p style={{ color: colorMap[category] || '#333' }}>
                                                                                    {category}: {count}
                                                                                </p>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                }}
                                                            />
                                                            <Bar dataKey="count">
                                                                <Cell fill="var(--present)" />
                                                                <Cell fill="var(--late)" />
                                                                <Cell fill="var(--absent)" />
                                                            </Bar>
                                                        </BarChart>
                                                    )}

                                                    {selectedView === "weekly" && (
                                                        <BarChart data={weeklyTrendData}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="week" />
                                                            <YAxis />
                                                            <Tooltip 
                                                                content={({ active, payload, label }) => {
                                                                    if (active && payload && payload.length) {
                                                                        const data = weeklyTrendData.find(d => d.week === label);
                                                                        return (
                                                                            <div style={{ 
                                                                                backgroundColor: 'white', 
                                                                                padding: '10px', 
                                                                                border: '1px solid #ccc',
                                                                                borderRadius: '4px'
                                                                            }}>
                                                                                <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{label}</p>
                                                                                <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
                                                                                    {data?.dateRange}
                                                                                </p>
                                                                                <p style={{ color: 'var(--present)' }}>Present: {payload[0]?.value}</p>
                                                                                <p style={{ color: 'var(--late)' }}>Late: {payload[1]?.value}</p>
                                                                                <p style={{ color: 'var(--absent)' }}>Absent: {payload[2]?.value}</p>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                }}
                                                            />
                                                            <Legend />
                                                            <Bar dataKey="present" fill="var(--present)" name="Present" />
                                                            <Bar dataKey="late" fill="var(--late)" name="Late" />
                                                            <Bar dataKey="absent" fill="var(--absent)" name="Absent" />
                                                        </BarChart>
                                                    )}

                                                    {selectedView === "monthly" && (
                                                        <BarChart data={monthlyTrendData}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="month" />
                                                            <YAxis />
                                                            <Tooltip 
                                                                content={({ active, payload, label }) => {
                                                                    if (active && payload && payload.length) {
                                                                        const data = monthlyTrendData.find(d => d.month === label);
                                                                        return (
                                                                            <div style={{ 
                                                                                backgroundColor: 'white', 
                                                                                padding: '10px', 
                                                                                border: '1px solid #ccc',
                                                                                borderRadius: '4px'
                                                                            }}>
                                                                                <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data?.fullMonth}</p>
                                                                                <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
                                                                                    Attendance Rate: {data?.attendanceRate}%
                                                                                </p>
                                                                                <p style={{ color: 'var(--present)' }}>Present: {payload[0]?.value}</p>
                                                                                <p style={{ color: 'var(--late)' }}>Late: {payload[1]?.value}</p>
                                                                                <p style={{ color: 'var(--absent)' }}>Absent: {payload[2]?.value}</p>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                }}
                                                            />
                                                            <Legend />
                                                            <Bar dataKey="present" fill="var(--present)" name="Present" />
                                                            <Bar dataKey="late" fill="var(--late)" name="Late" />
                                                            <Bar dataKey="absent" fill="var(--absent)" name="Absent" />
                                                        </BarChart>
                                                    )}

                                                    {selectedView === "quarterly" && (
                                                        <BarChart data={quarterlyTrendData}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="name" />
                                                            <YAxis />
                                                            <Tooltip 
                                                                content={({ active, payload, label }) => {
                                                                    if (active && payload && payload.length) {
                                                                        const data = quarterlyTrendData.find(d => d.name === label);
                                                                        const semester = (label === 'Q1' || label === 'Q2') 
                                                                            ? '1st Semester' 
                                                                            : '2nd Semester';
                                                                        return (
                                                                            <div style={{ 
                                                                                backgroundColor: 'white', 
                                                                                padding: '10px', 
                                                                                border: '1px solid #ccc',
                                                                                borderRadius: '4px'
                                                                            }}>
                                                                                <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data?.label}</p>
                                                                                <p style={{ color: '#1F2F57', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>
                                                                                    {semester}
                                                                                </p>
                                                                                <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
                                                                                    {data?.dateRange}
                                                                                </p>
                                                                                <p style={{ color: 'var(--present)' }}>Present: {payload[0]?.value}</p>
                                                                                <p style={{ color: 'var(--late)' }}>Late: {payload[1]?.value}</p>
                                                                                <p style={{ color: 'var(--absent)' }}>Absent: {payload[2]?.value}</p>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                }}
                                                            />
                                                            <Legend />
                                                            <Bar dataKey="present" fill="var(--present)" name="Present" />
                                                            <Bar dataKey="late" fill="var(--late)" name="Late" />
                                                            <Bar dataKey="absent" fill="var(--absent)" name="Absent" />
                                                        </BarChart>
                                                    )}
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RIGHT 50% */}
                                    <div className="teacher-right-column">
                                        <div className="teacher-records-header">
                                            <h3 className="teacher-records-title">Today&apos;s Attendance Records</h3>
                                            <div className="teacher-records-controls">
                                                <div className="teacher-search-wrapper">
                                                    <MagnifyingGlassIcon className="teacher-search-icon" />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Search student..." 
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="teacher-search-input"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="teacher-records-scroll">
                                            <table className="teacher-records-table">
                                                <thead>
                                                    <tr>
                                                        <th>Student Name</th>
                                                        <th className="center">Status</th>
                                                        <th className="center">Time</th>
                                                        <th className="center">Confidence</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {isLoadingRecords ? (
                                                        <tr>
                                                            <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                                                                Loading attendance records...
                                                            </td>
                                                        </tr>
                                                    ) : attendanceRecords.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                                                                No students enrolled in this section
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        attendanceRecords
                                                            .filter(student => student.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                                            .map((student) => (
                                                                <tr key={student.id}>
                                                                    <td className="student-name">{student.name}</td>
                                                                    <td className="center">
                                                                        <span className={`teacher-status-badge ${student.status.toLowerCase()}`}>
                                                                            {student.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="center">{student.time}</td>
                                                                    <td className={`center confidence-cell ${student.confidence === "No Detection" ? "not-detected" : "detected"}`}>
                                                                        {student.confidence}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                </div>
                            </>
                        )}
                    </div>
                ),
            },
            {
                label: "Students at Risk",
                Icon: ExclamationTriangleIcon,
                panels: [
                    <div key="low-attendance-alert" className="teacher-panel-card low-attendance-alert">
                        <ExclamationTriangleIcon className="teacher-panel-icon" />
                        <div className="teacher-panel-content">
                            <div className="teacher-panel-label">Students Below {lowAttendanceThreshold}%</div>
                            <div className="teacher-panel-value">{lowAttendanceStudents.length}</div>
                            <div className="teacher-panel-sub">Require immediate attention</div>
                        </div>
                    </div>,
                ],
                content: (
                    <div className="teacher-main-container">
                        <div className="low-attendance-section">
                            <div className="low-attendance-header">
                                <h3 className="low-attendance-title">
                                    <ExclamationTriangleIcon className="low-attendance-title-icon" />
                                    Students with Low Attendance Rating
                                </h3>
                                <div className="low-attendance-controls">
                                    <div className="threshold-control">
                                        <label>Threshold:</label>
                                        <select
                                            value={lowAttendanceThreshold}
                                            onChange={(e) => setLowAttendanceThreshold(parseInt(e.target.value))}
                                            className="teacher-select"
                                        >
                                            <option value={30}>Below 30%</option>
                                            <option value={40}>Below 40%</option>
                                            <option value={50}>Below 50%</option>
                                            <option value={60}>Below 60%</option>
                                            <option value={70}>Below 70%</option>
                                        </select>
                                    </div>
                                    <div className="course-filter-control">
                                        <label>Course:</label>
                                        <select
                                            value={lowAttendanceCourseFilter}
                                            onChange={(e) => setLowAttendanceCourseFilter(e.target.value)}
                                            className="teacher-select"
                                        >
                                            <option value="all">All Courses</option>
                                            {courses.map(course => (
                                                <option key={course.id} value={course.id}>{course.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="low-attendance-table-container">
                                <table className="low-attendance-table">
                                    <thead>
                                        <tr>
                                            <th>Student Name</th>
                                            <th>Email</th>
                                            <th>Course</th>
                                            <th className="center">Present</th>
                                            <th className="center">Late</th>
                                            <th className="center">Absent</th>
                                            <th className="center">Total Records</th>
                                            <th className="center">Attendance Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoadingLowAttendance ? (
                                            <tr>
                                                <td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>
                                                    Loading low attendance students...
                                                </td>
                                            </tr>
                                        ) : lowAttendanceStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>
                                                    <div className="no-low-attendance">
                                                        <span className="success-icon">✓</span>
                                                        <p>No students with attendance below {lowAttendanceThreshold}%</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            lowAttendanceStudents.map((student) => (
                                                <tr key={`${student.id}-${student.courseId}`} className="low-attendance-row">
                                                    <td className="student-name">{student.name}</td>
                                                    <td className="student-email">{student.email}</td>
                                                    <td className="course-name">{student.courseName}</td>
                                                    <td className="center present-cell">{student.presentCount}</td>
                                                    <td className="center late-cell">{student.lateCount}</td>
                                                    <td className="center absent-cell">{student.absentCount}</td>
                                                    <td className="center">{student.totalRecords}</td>
                                                    <td className="center">
                                                        <span className={`attendance-rate-badge ${student.attendanceRate < 30 ? 'critical' : 'warning'}`}>
                                                            {student.attendanceRate}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                label: "Comparative Analytics",
                Icon: BarChartIcon,
                panels: [
                    <div key="students-available" className="teacher-panel-card enroll">
                        <PersonIcon className="teacher-panel-icon" />
                        <div className="teacher-panel-content">
                            <div className="teacher-panel-label">Students in Selected Course</div>
                            <div className="teacher-panel-value">{studentsForComparison.length}</div>
                            <div className="teacher-panel-sub">Available for comparison</div>
                        </div>
                    </div>,

                    <div key="attendance-gap" className="teacher-panel-card attendance">
                        <BarChartIcon className="teacher-panel-icon" />
                        <div className="teacher-panel-content">
                            <div className="teacher-panel-label">Attendance Gap</div>
                            <div className="teacher-panel-value">
                                {comparisonData?.comparison?.rateVsClass ?? "N/A"}
                            </div>
                            <div className="teacher-panel-sub">
                                {comparisonData ? (comparisonData.comparison.status === 'above' ? "Above class average" : comparisonData.comparison.status === 'below' ? "Below class average" : "Compared to class") : "Select student to compare"}
                            </div>
                        </div>
                    </div>,
                ],
                content: (
                    <div className="teacher-main-container">
                        <div className="comparative-analytics-section">
                            <div className="comparative-controls">
                                <div className="control-group">
                                    <label>Select Course:</label>
                                    <select
                                        value={selectedCourseForComparison}
                                        onChange={(e) => setSelectedCourseForComparison(e.target.value)}
                                        className="teacher-select"
                                    >
                                        <option value="">-- Select Course --</option>
                                        {courses.map(course => (
                                            <option key={course.id} value={course.id}>{course.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="control-group">
                                    <label>Select Student:</label>
                                    <select
                                        value={selectedStudentForComparison}
                                        onChange={(e) => setSelectedStudentForComparison(e.target.value)}
                                        className="teacher-select"
                                        disabled={!selectedCourseForComparison}
                                    >
                                        <option value="">-- Select Student --</option>
                                        {studentsForComparison.map(student => (
                                            <option key={student.id} value={student.id}>{student.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {isLoadingComparison ? (
                                <div className="comparison-loading">
                                    Loading comparison data...
                                </div>
                            ) : comparisonData ? (
                                <div className="comparison-content">
                                    {/* Summary Cards */}
                                    <div className="comparison-summary-grid">
                                        <div className="comparison-card student-card">
                                            <div className="comparison-card-header">
                                                <PersonIcon className="comparison-card-icon" />
                                                <h4>Student Performance</h4>
                                            </div>
                                            <div className="comparison-card-body">
                                                <div className="comparison-name">{comparisonData.student?.name || 'N/A'}</div>
                                                <div className="comparison-rate">
                                                    <span className="rate-value">{comparisonData.student?.attendanceRate || 0}%</span>
                                                    <span className="rate-label">Attendance Rate</span>
                                                </div>
                                                <div className="comparison-breakdown">
                                                    <div className="breakdown-item present">
                                                        <span className="breakdown-value">{comparisonData.student?.present || 0}</span>
                                                        <span className="breakdown-label">Present</span>
                                                    </div>
                                                    <div className="breakdown-item late">
                                                        <span className="breakdown-value">{comparisonData.student?.late || 0}</span>
                                                        <span className="breakdown-label">Late</span>
                                                    </div>
                                                    <div className="breakdown-item absent">
                                                        <span className="breakdown-value">{comparisonData.student?.absent || 0}</span>
                                                        <span className="breakdown-label">Absent</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="comparison-card class-card">
                                            <div className="comparison-card-header">
                                                <BookmarkIcon className="comparison-card-icon" />
                                                <h4>Class Average</h4>
                                            </div>
                                            <div className="comparison-card-body">
                                                <div className="comparison-name">{comparisonData.student?.courseName || 'N/A'}</div>
                                                <div className="comparison-rate">
                                                    <span className="rate-value">{comparisonData.class.attendanceRate}%</span>
                                                    <span className="rate-label">Attendance Rate</span>
                                                </div>
                                                <div className="comparison-breakdown">
                                                    <div className="breakdown-item present">
                                                        <span className="breakdown-value">{comparisonData.class.present}</span>
                                                        <span className="breakdown-label">Present</span>
                                                    </div>
                                                    <div className="breakdown-item late">
                                                        <span className="breakdown-value">{comparisonData.class.late}</span>
                                                        <span className="breakdown-label">Late</span>
                                                    </div>
                                                    <div className="breakdown-item absent">
                                                        <span className="breakdown-value">{comparisonData.class.absent}</span>
                                                        <span className="breakdown-label">Absent</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`comparison-card difference-card ${comparisonData.comparison.status}`}>
                                            <div className="comparison-card-header">
                                                <BarChartIcon className="comparison-card-icon" />
                                                <h4>Comparison Result</h4>
                                            </div>
                                            <div className="comparison-card-body">
                                                <div className="difference-indicator">
                                                    <span className={`difference-value ${comparisonData.comparison.status}`}>
                                                        {comparisonData.comparison.status === 'above' ? '+' : ''}
                                                        {comparisonData.comparison.rateVsClass}%
                                                    </span>
                                                    <span className="difference-label">
                                                        {comparisonData.comparison.status === 'above' 
                                                            ? 'Above Class Average' 
                                                            : 'Below Class Average'}
                                                    </span>
                                                </div>
                                                <div className="total-students-info">
                                                    <span className="info-value">{comparisonData.class.totalStudents}</span>
                                                    <span className="info-label">Total Students in Class</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comparison Chart */}
                                    <div className="comparison-chart-section">
                                        <h4 className="chart-section-title">Monthly Attendance Trend Comparison</h4>
                                        <div className="comparison-chart-container">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={comparisonData.monthlyComparison} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                                                    <XAxis dataKey="month" tick={{ fill: '#4F4F4F', fontSize: 11 }} />
                                                    <YAxis domain={[0, 100]} tick={{ fill: '#4F4F4F', fontSize: 11 }} />
                                                    <Tooltip 
                                                        contentStyle={{ 
                                                            backgroundColor: '#fff', 
                                                            border: '1px solid #E0E0E0',
                                                            borderRadius: '8px',
                                                            fontSize: '12px'
                                                        }}
                                                        formatter={(value) => [`${value}%`, '']}
                                                    />
                                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                                    <Line 
                                                        type="monotone"
                                                        dataKey="studentRate" 
                                                        name="Student" 
                                                        stroke="#1DA1F2" 
                                                        strokeWidth={3}
                                                        dot={{ fill: '#1DA1F2', r: 4 }}
                                                        activeDot={{ r: 6 }}
                                                    />
                                                    <Line 
                                                        type="monotone"
                                                        dataKey="classRate" 
                                                        name="Class Average" 
                                                        stroke="#0F9D58" 
                                                        strokeWidth={3}
                                                        dot={{ fill: '#0F9D58', r: 4 }}
                                                        activeDot={{ r: 6 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="comparison-placeholder">
                                    <BarChartIcon className="placeholder-icon" />
                                    <p>Select a course and student to view comparative analytics</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            },
            {
                label: "Student Data",
                Icon: PersonIcon,
                panels: [],
                content: (
                    <div className="teacher-content-section">
                        <h2 className="teacher-section-title">Student Data</h2>
                        <p className="teacher-section-text">Student data management will be displayed here</p>
                    </div>
                )
            }
        ]} />
    );
}