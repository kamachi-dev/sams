"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import { 
    MagnifyingGlassIcon, 
    PersonIcon, 
    DownloadIcon,
    CalendarIcon,
    BookmarkIcon,
    DashboardIcon,
    ExclamationTriangleIcon,
    BarChartIcon
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
    const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedChartCourse, setSelectedChartCourse] = useState("all");
    const [semesterAttendance, setSemesterAttendance] = useState({ present: 0, late: 0, absent: 0, total: 0, attendanceRate: 0 });

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
        dateRange: string;
        present: number;
        late: number;
        absent: number;
    }>>([]);

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
                const courseParam = selectedChartCourse !== "all" ? `?course=${selectedChartCourse}` : '';
                const response = await fetch(`/api/teacher/attendance/today${courseParam}`);
                const result = await response.json();
                if (result.success) {
                    setTodayAttendance(result.data);
                }
            } catch (error) {
                console.error('Error fetching today\'s attendance:', error);
            }
        };
        
        fetchTodayAttendance();
    }, [selectedChartCourse]);

    // Fetch semester-wide attendance summary (for average attendance rate)
    useEffect(() => {
        const fetchSemesterAttendance = async () => {
            try {
                const courseParam = selectedChartCourse !== "all" ? `?course=${selectedChartCourse}` : '';
                const response = await fetch(`/api/teacher/attendance/summary${courseParam}`);
                const result = await response.json();
                if (result.success) {
                    setSemesterAttendance(result.data);
                }
            } catch (error) {
                console.error('Error fetching semester attendance:', error);
            }
        };
        
        fetchSemesterAttendance();
    }, [selectedChartCourse]);

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
                const url = `/api/teacher/attendance/records?course=${selectedCourse}`;
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
    }, [selectedCourse]);

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

    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => {
            alert("Attendance report exported successfully!");
            setIsExporting(false);
        }, 1500);
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
                panels: [
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
                                {semesterAttendance.present + semesterAttendance.late} out of {semesterAttendance.total} records
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
                                            <div className="teacher-info-field-label">Subjects Handled</div>
                                            <div className="teacher-info-field-value">{courses.length}</div>
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
                                    <h3 className="teacher-summary-title">Current Semester Summary</h3>

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

                                        <select
                                            value={selectedChartCourse}
                                            onChange={(e) => setSelectedChartCourse(e.target.value)}
                                            className="teacher-select"
                                        >
                                            <option value="all">All Subjects</option>
                                            {courses.map((course) => (
                                                <option key={course.id} value={course.id}>{course.name}</option>
                                            ))}
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
                                                                // Determine semester based on quarter
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
                                        <select 
                                            value={selectedCourse}
                                            onChange={(e) => {
                                                setSelectedCourse(e.target.value);
                                                setIsLoadingRecords(true);
                                            }}
                                            className="teacher-select"
                                        >
                                            {courses.map(course => (
                                                <option key={course.id} value={course.id}>{course.name}</option>
                                            ))}
                                        </select>
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
                                                        No students enrolled in this course
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