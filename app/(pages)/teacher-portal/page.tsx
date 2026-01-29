"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import { ThickArrowRightIcon, MagnifyingGlassIcon, PersonIcon, DownloadIcon, ExclamationTriangleIcon, BackpackIcon } from "@radix-ui/react-icons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { useState, useEffect } from "react";
import './styles.css';

// Mock attendance data
const attendanceTrends = [
    { date: "Jan 1", present: 28, late: 4, absent: 2 },
    { date: "Jan 2", present: 30, late: 3, absent: 1 },
    { date: "Jan 3", present: 26, late: 5, absent: 3 },
    { date: "Jan 4", present: 32, late: 2, absent: 0 },
    { date: "Jan 5", present: 29, late: 3, absent: 2 },
    { date: "Jan 6", present: 31, late: 2, absent: 1 }
];

const weeklyComparison = [
    { week: "Week 1", present: 85, late: 10, absent: 5 },
    { week: "Week 2", present: 88, late: 8, absent: 4 },
    { week: "Week 3", present: 82, late: 12, absent: 6 },
    { week: "Week 4", present: 90, late: 7, absent: 3 }
];

const monthlyData = [
    { month: "Aug", present: 350, late: 35, absent: 15 },
    { month: "Sep", present: 365, late: 28, absent: 12 },
    { month: "Oct", present: 340, late: 42, absent: 20 },
    { month: "Nov", present: 375, late: 22, absent: 10 },
    { month: "Dec", present: 360, late: 30, absent: 15 }
];

const quarterlyData = [
    { quarter: "1st Quarter", present: 88, late: 8, absent: 4 },
    { quarter: "2nd Quarter", present: 85, late: 10, absent: 5 },
    { quarter: "3rd Quarter", present: 90, late: 7, absent: 3 },
    { quarter: "4th Quarter", present: 87, late: 9, absent: 4 }
];

// Student list with recent attendance
const recentStudents = [
    { id: 1, name: "Juan Dela Cruz", status: "Present", time: "8:00 AM", confidence: "96%" },
    { id: 2, name: "Maria Santos", status: "Present", time: "8:05 AM", confidence: "94%" },
    { id: 3, name: "Pedro Reyes", status: "Late", time: "8:25 AM", confidence: "89%" },
    { id: 4, name: "Ana Garcia", status: "Present", time: "7:55 AM", confidence: "98%" },
    { id: 5, name: "Carlos Mendoza", status: "Absent", time: "-", confidence: "No Detection" },
    { id: 6, name: "Sofia Rodriguez", status: "Present", time: "7:58 AM", confidence: "92%" },
    { id: 7, name: "Miguel Torres", status: "Present", time: "8:02 AM", confidence: "97%" },
    { id: 8, name: "Isabella Fernandez", status: "Late", time: "8:30 AM", confidence: "85%" },
    { id: 9, name: "Diego Martinez", status: "Present", time: "7:52 AM", confidence: "93%" },
    { id: 10, name: "Valentina Lopez", status: "Present", time: "8:08 AM", confidence: "95%" },
    { id: 11, name: "Gabriel Ramirez", status: "Absent", time: "-", confidence: "No Detection" },
    { id: 12, name: "Camila Gonzalez", status: "Present", time: "7:59 AM", confidence: "91%" },
    { id: 13, name: "Lucas Sanchez", status: "Present", time: "8:03 AM", confidence: "96%" },
    { id: 14, name: "Emma Diaz", status: "Late", time: "8:28 AM", confidence: "88%" },
    { id: 15, name: "Mateo Morales", status: "Present", time: "7:57 AM", confidence: "94%" },
    { id: 16, name: "Olivia Castro", status: "Present", time: "8:01 AM", confidence: "97%" },
    { id: 17, name: "Santiago Ramos", status: "Present", time: "8:06 AM", confidence: "90%" },
    { id: 18, name: "Mia Flores", status: "Absent", time: "-", confidence: "No Detection" },
    { id: 19, name: "Sebastian Cruz", status: "Present", time: "7:54 AM", confidence: "95%" },
    { id: 20, name: "Luna Herrera", status: "Present", time: "8:04 AM", confidence: "93%" }
];

export default function Teacher() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState("all");
    const [selectedGradeLevel, setSelectedGradeLevel] = useState("all");
    const [selectedSection, setSelectedSection] = useState("all");
    const [selectedQuarter, setSelectedQuarter] = useState("current");
    const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "records">("overview");
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
                    // Auto-select first course if not already selected
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

    // Calculate other totals
    const studentsWithWarnings = 4; // TODO: Calculate from database


    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => setIsExporting(false), 2000); // Simulate export
    };

    return (
        <SamsTemplate links={[
            {
                label: "Dashboard",
                Icon: ThickArrowRightIcon,
                panels: [
                    // Number of Students
                    <div key="total" className="teacher-panel-card blue">
                        <PersonIcon className="teacher-panel-icon" />
                        <div className="teacher-panel-content">
                            <div className="teacher-panel-label">Number of Students</div>
                            <div className="teacher-panel-value-group">
                                <div className="teacher-panel-value">
                                    {isLoadingStudents ? "..." : totalStudents}
                                </div>
                            </div>
                        </div>
                    </div>,
                    
                    // Students with Warnings
                    <div key="warnings" className="teacher-panel-card warning">
                        <ExclamationTriangleIcon className="teacher-panel-icon" />
                        <div className="teacher-panel-content">
                            <div className="teacher-panel-label">Students with Warnings</div>
                            <div className="teacher-panel-value-group">
                                <div className="teacher-panel-value">{studentsWithWarnings}</div>
                            </div>
                        </div>
                    </div>,
                    
                    // Class Semester Attendance
                    <div key="semester" className="teacher-panel-card success">
                        <BackpackIcon className="teacher-panel-icon" />
                        <div className="teacher-panel-content">
                            <div className="teacher-panel-label">Class Semester Attendance</div>
                            <div className="teacher-panel-value-group">
                                <div className="teacher-panel-value">{semesterAttendance.attendanceRate}%</div>
                            </div>
                        </div>
                    </div>
                ],
                content: <>
                    <div className="teacher-main-container">
                        
                        {/* Tab Navigation */}
                        <div className="teacher-tabs">
                            <button
                                onClick={() => setActiveTab("overview")}
                                className={`teacher-tab ${activeTab === "overview" ? "active" : ""}`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab("analytics")}
                                className={`teacher-tab ${activeTab === "analytics" ? "active" : ""}`}
                            >
                                Analytics
                            </button>
                            <button
                                onClick={() => setActiveTab("records")}
                                className={`teacher-tab ${activeTab === "records" ? "active" : ""}`}
                            >
                                Attendance Records
                            </button>
                        </div>

                        {/* Overview Tab */}
                        {activeTab === "overview" && (
                            <div>
                                {/* Quick Summary Statistics */}
                                <div className="teacher-stats-grid">
                                    {/* Average Attendance Rate */}
                                    <div className="teacher-stat-card green">
                                        <div className="teacher-stat-label">Avg. Attendance Rate</div>
                                        <div className="teacher-stat-value">{semesterAttendance.attendanceRate}%</div>
                                        <div className="teacher-stat-sublabel">This semester</div>
                                    </div>

                                    {/* Today's Present */}
                                    <div className="teacher-stat-card blue">
                                        <div className="teacher-stat-label">Today's Present</div>
                                        <div className="teacher-stat-value">{todayAttendance.present}/{todayAttendance.total}</div>
                                        <div className="teacher-stat-sublabel">{todayAttendance.total > 0 ? ((todayAttendance.present/todayAttendance.total)*100).toFixed(1) : '0.0'}% attendance</div>
                                    </div>

                                    {/* Late Students */}
                                    <div className="teacher-stat-card yellow">
                                        <div className="teacher-stat-label">Late Today</div>
                                        <div className="teacher-stat-value">{todayAttendance.late}</div>
                                        <div className="teacher-stat-sublabel">Students tardy</div>
                                    </div>

                                    {/* Absent Students */}
                                    <div className="teacher-stat-card red">
                                        <div className="teacher-stat-label">Absent Today</div>
                                        <div className="teacher-stat-value">{todayAttendance.absent}</div>
                                        <div className="teacher-stat-sublabel">Students missing</div>
                                    </div>
                                    {/* Perfect Attendance */}
                                    <div className="teacher-stat-card purple">
                                        <div className="teacher-stat-label">Perfect Attendance</div>
                                        <div className="teacher-stat-value">{todayAttendance.present}</div>
                                        <div className="teacher-stat-sublabel">On time today</div>
                                    </div>

                                    {/* Total Number of Subjects Handled */}
                                    <div className="teacher-stat-card orange">
                                        <div className="teacher-stat-label">Total Number of Subjects Handled</div>
                                        <div className="teacher-stat-value">{courses.length}</div>
                                        <div className="teacher-stat-sublabel">Courses assigned</div>
                                    </div>                                </div>
                            </div>
                        )}

                        {/* Analytics Tab */}
                        {activeTab === "analytics" && (
                            <div>
                                {/* Filters and Export */}
                                <div className="teacher-filters">
                                    <div className="teacher-filters-group">
                                        <select 
                                            value={selectedSubject}
                                            onChange={(e) => setSelectedSubject(e.target.value)}
                                            className="teacher-select">
                                            <option value="all">All Subjects</option>
                                            {courses.map(course => (
                                                <option key={course.id} value={course.id}>{course.name}</option>
                                            ))}
                                        </select>

                                        <select value={selectedGradeLevel}
                                            onChange={(e) => setSelectedGradeLevel(e.target.value)}
                                            className="teacher-select">
                                            <option value="all">All Grades</option>
                                            <option value="11">Grade 11</option>
                                            <option value="12">Grade 12</option>
                                        </select>

                                        <select 
                                            value={selectedSection}
                                            onChange={(e) => setSelectedSection(e.target.value)}
                                            className="teacher-select">
                                            <option value="all">All Sections</option>
                                            <option value="a">Section A</option>
                                            <option value="b">Section B</option>
                                            <option value="c">Section C</option>
                                        </select>

                                        <select 
                                            value={selectedQuarter}
                                            onChange={(e) => setSelectedQuarter(e.target.value)}
                                            className="teacher-select">
                                            <option value="current">Current Quarter</option>
                                            <option value="1">1st Quarter</option>
                                            <option value="2">2nd Quarter</option>
                                            <option value="3">3rd Quarter</option>
                                            <option value="4">4th Quarter</option>
                                        </select>

                                        <select
                                            value={selectedView}
                                            onChange={(e) => setSelectedView(e.target.value as any)}
                                            className="teacher-select"
                                        >
                                            <option value="daily">Daily View</option>
                                            <option value="weekly">Weekly View</option>
                                            <option value="monthly">Monthly View</option>
                                            <option value="quarterly">Quarterly View</option>
                                        </select>
                                    </div>

                                    <button 
                                        onClick={handleExport}
                                        disabled={isExporting}
                                        className="teacher-export-btn">
                                        <DownloadIcon className={isExporting ? "spin-animation" : ""} />
                                        {isExporting ? "Exporting..." : "Export"}
                                    </button>
                                </div>

                                {/* Charts Section */}
                                <div className="teacher-charts-container">
                                    {selectedView === "daily" && (
                                    <div className="teacher-chart-card">
                                <div className="teacher-chart-header">
                                    <h3 className="teacher-chart-title">Daily Attendance Trend</h3>
                                    <span className="teacher-chart-meta">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                                </div>
                                <ResponsiveContainer width="100%" height={240}>
                                    <LineChart data={attendanceTrends}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F2" />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip 
                                            contentStyle={{
                                                background: "#FFFFFF",
                                                border: "1px solid #F2F2F2",
                                                borderRadius: "8px",
                                                boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                                            }}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="present" stroke="#0F9D58" strokeWidth={3} name="Present" dot={{ r: 5 }} activeDot={{ r: 7 }} />
                                        <Line type="monotone" dataKey="late" stroke="#F4B400" strokeWidth={3} name="Late" dot={{ r: 5 }} activeDot={{ r: 7 }} />
                                        <Line type="monotone" dataKey="absent" stroke="#DB4437" strokeWidth={3} name="Absent" dot={{ r: 5 }} activeDot={{ r: 7 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                                    </div>
                                            )}

                                    {selectedView === "weekly" && (
                                    <div className="teacher-chart-card">
                                <div className="teacher-chart-header">
                                    <h3 className="teacher-chart-title">Weekly Attendance Comparison</h3>
                                    <span className="teacher-chart-meta">Last 4 Weeks</span>
                                </div>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={weeklyComparison} barSize={60}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F2" />
                                        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip 
                                            contentStyle={{
                                                background: "#FFFFFF",
                                                border: "1px solid #F2F2F2",
                                                borderRadius: "8px",
                                                boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="present" fill="#0F9D58" radius={[4, 4, 0, 0]} name="Present" />
                                        <Bar dataKey="late" fill="#F4B400" radius={[4, 4, 0, 0]} name="Late" />
                                        <Bar dataKey="absent" fill="#DB4437" radius={[4, 4, 0, 0]} name="Absent" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                                    )}

                                    {selectedView === "monthly" && (
                                    <div className="teacher-chart-card">
                                <div className="teacher-chart-header">
                                    <h3 className="teacher-chart-title">Monthly Attendance Summary</h3>
                                    <span className="teacher-chart-meta">Last 5 Months</span>
                                </div>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={monthlyData} barSize={50}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F2" />
                                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip 
                                            contentStyle={{
                                                background: "#FFFFFF",
                                                border: "1px solid #F2F2F2",
                                                borderRadius: "8px",
                                                boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="present" fill="#0F9D58" radius={[4, 4, 0, 0]} name="Present" />
                                        <Bar dataKey="late" fill="#F4B400" radius={[4, 4, 0, 0]} name="Late" />
                                        <Bar dataKey="absent" fill="#DB4437" radius={[4, 4, 0, 0]} name="Absent" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                                    )}

                                    {selectedView === "quarterly" && (
                                    <div className="teacher-chart-card">
                                <div className="teacher-chart-header">
                                    <h3 className="teacher-chart-title">Quarterly Attendance Overview</h3>
                                    <span className="teacher-chart-meta">4 Quarters</span>
                                </div>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={quarterlyData} barSize={70}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F2" />
                                        <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip 
                                            contentStyle={{
                                                background: "#FFFFFF",
                                                border: "1px solid #F2F2F2",
                                                borderRadius: "8px",
                                                boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="present" fill="#0F9D58" radius={[4, 4, 0, 0]} name="Present" />
                                        <Bar dataKey="late" fill="#F4B400" radius={[4, 4, 0, 0]} name="Late" />
                                        <Bar dataKey="absent" fill="#DB4437" radius={[4, 4, 0, 0]} name="Absent" />
                                    </BarChart>
                                </ResponsiveContainer>
                                    </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Attendance Records Tab */}
                        {activeTab === "records" && (
                            <div>
                                {/* Search Bar */}
                                <div className="teacher-search-container" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>

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
                                    className="teacher-select">
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>{course.name}</option>
                                    ))}
                                </select>
                                </div>
                                
                                {/* Recent Attendance Table */}
                                <div className="teacher-table-container">
                            <div className="teacher-table-header">
                                <h3 className="teacher-table-title">Today&apos;s Attendance</h3>
                                <span className="teacher-table-date">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div className="teacher-table-scroll">
                                <table className="teacher-table">
                                    <thead>
                                        <tr>
                                            <th>Student Name</th>
                                            <th>Status</th>
                                            <th>Time</th>
                                            <th>Facial Recognition Confidence</th>
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
                                                        <td>{student.name}</td>
                                                        <td>
                                                            <span className={`status-badge ${student.status.toLowerCase()}`}>
                                                                {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                                                            </span>
                                                        </td>
                                                        <td className="time-cell">
                                                            {student.time}
                                                        </td>
                                                        <td className={`confidence-cell ${student.confidence === "No Detection" ? "not-detected" : "detected"}`}>
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
                        )}

                    </div>
                </>
            },
            {
                label: "Student Data",
                Icon: PersonIcon,
                panels: [],
                content: <>
                    <div className="teacher-content-section">
                        <h2 className="teacher-section-title">Student Data</h2>
                        <p className="teacher-section-text">Student data management will be displayed here</p>
                    </div>
                </>
            }
        ]} />
    );
}