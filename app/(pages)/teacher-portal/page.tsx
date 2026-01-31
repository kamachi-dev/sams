"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import { 
    MagnifyingGlassIcon, 
    PersonIcon, 
    DownloadIcon,
    CalendarIcon,
    BookmarkIcon,
    DashboardIcon
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
    Cell
} from "recharts";
import { useState, useEffect } from "react";
import './styles.css';

// Mock chart data
const weeklyTrend = [
    { week: "Week 1", present: 85, late: 10, absent: 5 },
    { week: "Week 2", present: 88, late: 8, absent: 4 },
    { week: "Week 3", present: 82, late: 12, absent: 6 },
    { week: "Week 4", present: 90, late: 7, absent: 3 }
];

const monthlyData = [
    { month: "Aug", percentage: 87 },
    { month: "Sep", percentage: 90 },
    { month: "Oct", percentage: 85 },
    { month: "Nov", percentage: 92 },
    { month: "Dec", percentage: 88 }
];

const quarterlyData = [
    { name: "Q1", present: 88, late: 8, absent: 4 },
    { name: "Q2", present: 85, late: 10, absent: 5 },
    { name: "Q3", present: 90, late: 7, absent: 3 },
    { name: "Q4", present: 87, late: 9, absent: 4 }
];

const dailyAttendance = [
    { date: "Mon", status: "Present" },
    { date: "Tue", status: "Present" },
    { date: "Wed", status: "Late" },
    { date: "Thu", status: "Present" },
    { date: "Fri", status: "Present" }
];

export default function Teacher() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [selectedView, setSelectedView] = useState<"daily" | "weekly" | "monthly" | "quarterly">("weekly");
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
                const response = await fetch('/api/teacher/attendance/today');
                const result = await response.json();
                if (result.success) {
                    setTodayAttendance(result.data);
                }
            } catch (error) {
                console.error('Error fetching today\'s attendance:', error);
            }
        };
        
        fetchTodayAttendance();
    }, []);

    // Fetch semester-wide attendance summary (for average attendance rate)
    useEffect(() => {
        const fetchSemesterAttendance = async () => {
            try {
                const response = await fetch('/api/teacher/attendance/summary');
                const result = await response.json();
                if (result.success) {
                    setSemesterAttendance(result.data);
                }
            } catch (error) {
                console.error('Error fetching semester attendance:', error);
            }
        };
        
        fetchSemesterAttendance();
    }, []);

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
                }
            } catch (error) {
                console.error('Error fetching courses:', error);
            }
        };
        
        fetchCourses();
    }, []);

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
                label: "Dashboard",
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
                                        <select className="teacher-select">
                                            <option value="1">1st Semester</option>
                                            <option value="2">2nd Semester</option>
                                        </select>

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
                                            {selectedView === "weekly" && (
                                                <BarChart data={weeklyTrend}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="week" />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="present" fill="var(--present)" />
                                                    <Bar dataKey="late" fill="var(--late)" />
                                                    <Bar dataKey="absent" fill="var(--absent)" />
                                                </BarChart>
                                            )}

                                            {selectedView === "monthly" && (
                                                <LineChart data={monthlyData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="month" />
                                                    <YAxis domain={[80, 100]} />
                                                    <Tooltip />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="percentage"
                                                        stroke="var(--present)"
                                                        strokeWidth={3}
                                                    />
                                                </LineChart>
                                            )}

                                            {selectedView === "quarterly" && (
                                                <BarChart data={quarterlyData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="present" fill="var(--present)" />
                                                    <Bar dataKey="late" fill="var(--late)" />
                                                    <Bar dataKey="absent" fill="var(--absent)" />
                                                </BarChart>
                                            )}

                                            {selectedView === "daily" && (
                                                <BarChart data={dailyAttendance}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="date" />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Bar dataKey={() => 1}>
                                                        {dailyAttendance.map((entry, i) => (
                                                            <Cell
                                                                key={i}
                                                                fill={
                                                                    entry.status === "Present"
                                                                        ? "var(--present)"
                                                                        : entry.status === "Late"
                                                                        ? "var(--late)"
                                                                        : "var(--absent)"
                                                                }
                                                            />
                                                        ))}
                                                    </Bar>
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