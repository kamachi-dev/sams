"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import { ThickArrowRightIcon, CalendarIcon, DownloadIcon, PersonIcon, BookmarkIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import './styles.css';

// Mock student data
const studentInfo = {
    name: "Juan Carlos Ilano (MOCK not connected to DB)",
    studentId: "2022-00123",
    grade: "Grade 12",
    section: "STEM-A"
};

// Mock attendance data
const dailyAttendance = [
    { date: "Jan 2", status: "Present", time: "7:45 AM" },
    { date: "Jan 3", status: "Present", time: "7:52 AM" },
    { date: "Jan 4", status: "Late", time: "8:15 AM" },
    { date: "Jan 5", status: "Present", time: "7:48 AM" },
    { date: "Jan 6", status: "Present", time: "7:50 AM" },
    { date: "Jan 7", status: "Absent", time: "-" },
    { date: "Jan 8", status: "Present", time: "7:43 AM" }
];

const weeklyTrend = [
    { week: "Week 1", present: 4, late: 1, absent: 0 },
    { week: "Week 2", present: 5, late: 0, absent: 0 },
    { week: "Week 3", present: 3, late: 1, absent: 1 },
    { week: "Week 4", present: 5, late: 0, absent: 0 }
];

const monthlyData = [
    { month: "Sep", percentage: 95 },
    { month: "Oct", percentage: 92 },
    { month: "Nov", percentage: 98 },
    { month: "Dec", percentage: 90 },
    { month: "Jan", percentage: 94 }
];

const subjectAttendance = [
    { subject: "Mathematics", present: 38, late: 2, absent: 0, percentage: 95 },
    { subject: "Science", present: 36, late: 3, absent: 1, percentage: 90 },
    { subject: "English", present: 39, late: 1, absent: 0, percentage: 97.5 },
    { subject: "Filipino", present: 37, late: 2, absent: 1, percentage: 92.5 },
    { subject: "Social Studies", present: 40, late: 0, absent: 0, percentage: 100 },
    { subject: "Physical Education", present: 35, late: 4, absent: 1, percentage: 87.5 },
    { subject: "Computer Science", present: 39, late: 1, absent: 0, percentage: 97.5 },
    { subject: "Statistics", present: 36, late: 3, absent: 1, percentage: 90 },
    { subject: "Research", present: 38, late: 2, absent: 0, percentage: 95 },
    { subject: "Entrepreneurship", present: 37, late: 2, absent: 1, percentage: 92.5 },
    { subject: "Ethics", present: 40, late: 0, absent: 0, percentage: 100 },
    { subject: "Practical Research", present: 36, late: 3, absent: 1, percentage: 90 }
];

const quarterlyData = [
    { name: "1st Quarter", present: 180, late: 8, absent: 2 },
    { name: "2nd Quarter", present: 175, late: 10, absent: 5 },
    { name: "3rd Quarter", present: 182, late: 6, absent: 2 },
    { name: "4th Quarter", present: 178, late: 9, absent: 3 }
];

// Calculate overall stats
const totalDays = 40;
const presentDays = 37;
const lateDays = 2;
const absentDays = 1;
const attendanceRate = ((presentDays + lateDays) / totalDays * 100).toFixed(1);
const totalSubjects = subjectAttendance.length;

const pieData = [
    { name: "Present", value: presentDays, color: "#0F9D58" },
    { name: "Late", value: lateDays, color: "#F4B400" },
    { name: "Absent", value: absentDays, color: "#DB4437" }
];

export default function Student() {
    const [selectedView, setSelectedView] = useState<"daily" | "weekly" | "monthly" | "quarterly">("weekly");
    const [selectedSubject, setSelectedSubject] = useState("all");
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "subjects">("overview");

    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => {
            alert("Attendance report exported successfully!");
            setIsExporting(false);
        }, 1500);
    };

    return (
        <SamsTemplate links={[
            {
                label: "Dashboard",
                Icon: ThickArrowRightIcon,
                panels: [
                    // Attendance Rate
                    <div key="attendance-rate" className="student-panel-card green">
                        <CalendarIcon className="student-panel-icon" />
                        <div className="student-panel-content">
                            <div className="student-panel-label">Overall Attendance Rate</div>
                            <div className="student-panel-value">{attendanceRate}%</div>
                            <div className="student-panel-sub">
                                {presentDays + lateDays} out of {totalDays} days
                            </div>
                        </div>
                    </div>,

                    // Present Days
                    <div key="present-days" className="student-panel-card blue">
                        <PersonIcon className="student-panel-icon" />
                        <div className="student-panel-content">
                            <div className="student-panel-label">Days Present</div>
                            <div className="student-panel-value">{presentDays}</div>
                            <div className="student-panel-sub">
                                {((presentDays / totalDays) * 100).toFixed(1)}% of total days
                            </div>
                        </div>
                    </div>,

                    // Total Subjects
                    <div key="total-subjects" className="student-panel-card dark">
                        <BookmarkIcon className="student-panel-icon" />
                        <div className="student-panel-content">
                            <div className="student-panel-label">Total Subjects Enrolled</div>
                            <div className="student-panel-value">{totalSubjects}</div>
                            <div className="student-panel-sub">
                                Active this semester
                            </div>
                        </div>
                    </div>
                ],
                content: (
                    <div className="student-main-container">
                        
                        {/* Tab Navigation */}
                        <div className="student-tabs">
                            <button
                                onClick={() => setActiveTab("overview")}
                                className={`student-tab ${activeTab === "overview" ? "active" : ""}`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab("analytics")}
                                className={`student-tab ${activeTab === "analytics" ? "active" : ""}`}
                            >
                                Analytics
                            </button>
                            <button
                                onClick={() => setActiveTab("subjects")}
                                className={`student-tab ${activeTab === "subjects" ? "active" : ""}`}
                            >
                                Subject Breakdown
                            </button>
                        </div>

                        {/* Overview Tab */}
                        {activeTab === "overview" && (
                            <div>
                                {/* Student Info Card */}
                                <div className="student-info-card">
                            <div className="student-info-header">
                                <h3 className="student-info-title">
                                    Student Information
                                </h3>
                                <div className="student-info-meta">
                                    2nd Semester, S.Y. 2025-2026
                                </div>
                            </div>
                            <div className="student-info-grid">
                                <div>
                                    <div className="student-info-field-label">Student Name</div>
                                    <div className="student-info-field-value">{studentInfo.name}</div>
                                </div>
                                <div>
                                    <div className="student-info-field-label">Student ID</div>
                                    <div className="student-info-field-value">{studentInfo.studentId}</div>
                                </div>
                                <div>
                                    <div className="student-info-field-label">Grade Level</div>
                                    <div className="student-info-field-value">{studentInfo.grade}</div>
                                </div>
                                <div>
                                    <div className="student-info-field-label">Section</div>
                                    <div className="student-info-field-value">{studentInfo.section}</div>
                                </div>
                            </div>
                        </div>

                        {/* Current Semester Summary */}
                        <div className="student-summary-card">
                            <div className="student-summary-header">
                                <h3 className="student-summary-title">
                                    Current Semester Summary
                                </h3>
                                <p className="student-summary-desc">
                                    Breakdown of your {totalDays} total class days
                                </p>
                            </div>
                            <div className="student-summary-chart">
                                <ResponsiveContainer width="100%" height={100}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={28}
                                            outerRadius={50}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: "white", border: "1px solid #F2F2F2", borderRadius: "6px" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="student-summary-legend">
                                {pieData.map((entry) => (
                                    <div key={entry.name} className="student-legend-item">
                                        <div className="student-legend-label-group">
                                            <div className="student-legend-color" style={{ background: entry.color }}></div>
                                            <span className="student-legend-label">{entry.name}</span>
                                        </div>
                                        <div className="student-legend-value">
                                            {entry.value} days
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                            </div>
                        )}

                        {/* Analytics Tab */}
                        {activeTab === "analytics" && (
                            <div>
                                {/* Filters and Export */}
                                <div className="student-filters">
                            <div className="student-filters-group">
                                {/* Semester Filter */}
                                <select className="student-select">
                                    <option value="1">1st Semester</option>
                                    <option value="2">2nd Semester</option>
                                </select>

                                <select
                                    value={selectedView}
                                    onChange={(e) => setSelectedView(e.target.value as any)}
                                    className="student-select"
                                >
                                    <option value="daily">Daily View</option>
                                    <option value="weekly">Weekly View</option>
                                    <option value="monthly">Monthly View</option>
                                    <option value="quarterly">Quarterly View</option>
                                </select>

                                <select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    className="student-select"
                                >
                                    <option value="all">All Subjects</option>
                                    <option value="mathematics">Mathematics</option>
                                    <option value="science">Science</option>
                                    <option value="english">English</option>
                                    <option value="filipino">Filipino</option>
                                    <option value="social">Social Studies</option>
                                </select>
                            </div>

                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="student-export-btn"
                            >
                                <DownloadIcon className="student-export-icon" />
                                {isExporting ? "Exporting..." : "Export"}
                            </button>
                        </div>

                        {/* Main Content Grid */}
                        <div className="student-chart-container">
                            {/* Dynamic Chart based on selected view */}
                            <div className="student-chart-card">
                                <div className="student-chart-header">
                                    <h3 className="student-chart-title">
                                        {selectedView === "daily" && "Daily Attendance"}
                                        {selectedView === "weekly" && "Weekly Attendance Trend"}
                                        {selectedView === "monthly" && "Monthly Attendance Rate"}
                                        {selectedView === "quarterly" && "Quarterly Comparison"}
                                    </h3>
                                    <div className="student-chart-meta">
                                        {selectedView === "daily" && "Last 7 days"}
                                        {selectedView === "weekly" && "This month"}
                                        {selectedView === "monthly" && "This semester"}
                                        {selectedView === "quarterly" && "Academic year"}
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={240}>
                                    {selectedView === "weekly" ? (
                                        <BarChart data={weeklyTrend}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F2" />
                                            <XAxis dataKey="week" stroke="#BDBDBD" style={{ fontSize: "12px" }} />
                                            <YAxis stroke="#BDBDBD" style={{ fontSize: "12px" }} />
                                            <Tooltip contentStyle={{ background: "white", border: "1px solid #F2F2F2", borderRadius: "6px" }} />
                                            <Legend />
                                            <Bar dataKey="present" fill="#0F9D58" name="Present" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="late" fill="#F4B400" name="Late" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="absent" fill="#DB4437" name="Absent" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    ) : selectedView === "monthly" ? (
                                        <LineChart data={monthlyData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F2" />
                                            <XAxis dataKey="month" stroke="#BDBDBD" style={{ fontSize: "12px" }} />
                                            <YAxis stroke="#BDBDBD" style={{ fontSize: "12px" }} domain={[80, 100]} />
                                            <Tooltip contentStyle={{ background: "white", border: "1px solid #F2F2F2", borderRadius: "6px" }} />
                                            <Line type="monotone" dataKey="percentage" stroke="#1DA1F2" strokeWidth={3} dot={{ r: 6 }} name="Attendance %" />
                                        </LineChart>
                                    ) : selectedView === "quarterly" ? (
                                        <BarChart data={quarterlyData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F2" />
                                            <XAxis dataKey="name" stroke="#BDBDBD" style={{ fontSize: "12px" }} />
                                            <YAxis stroke="#BDBDBD" style={{ fontSize: "12px" }} />
                                            <Tooltip contentStyle={{ background: "white", border: "1px solid #F2F2F2", borderRadius: "6px" }} />
                                            <Legend />
                                            <Bar dataKey="present" fill="#0F9D58" name="Present" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="late" fill="#F4B400" name="Late" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="absent" fill="#DB4437" name="Absent" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    ) : (
                                        <BarChart data={dailyAttendance}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F2" />
                                            <XAxis dataKey="date" stroke="#BDBDBD" style={{ fontSize: "12px" }} />
                                            <YAxis stroke="#BDBDBD" style={{ fontSize: "12px" }} />
                                            <Tooltip contentStyle={{ background: "white", border: "1px solid #F2F2F2", borderRadius: "6px" }} />
                                            <Bar dataKey={(entry) => entry.status === "Present" ? 1 : entry.status === "Late" ? 1 : entry.status === "Absent" ? 1 : 0} fill="#0F9D58" name="Status">
                                                {dailyAttendance.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.status === "Present" ? "#0F9D58" : entry.status === "Late" ? "#F4B400" : "#DB4437"} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>
                            </div>
                        )}

                        {/* Subject Breakdown Tab */}
                        {activeTab === "subjects" && (
                            <div>
                                {/* Subject-wise Attendance Table */}
                                <div className="student-subjects-card">
                            <h3 className="student-subjects-title">
                                Attendance by Subject
                            </h3>
                            <div className="student-subjects-scroll">
                                <table className="student-subjects-table">
                                    <thead>
                                        <tr>
                                            <th>Subject</th>
                                            <th className="center">Present</th>
                                            <th className="center">Late</th>
                                            <th className="center">Absent</th>
                                            <th className="center">Attendance Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subjectAttendance.map((subject, index) => (
                                            <tr key={index}>
                                                <td className="subject-name">{subject.subject}</td>
                                                <td className="center">
                                                    <span className="student-status-badge present">
                                                        {subject.present}
                                                    </span>
                                                </td>
                                                <td className="center">
                                                    <span className="student-status-badge late">
                                                        {subject.late}
                                                    </span>
                                                </td>
                                                <td className="center">
                                                    <span className="student-status-badge absent">
                                                        {subject.absent}
                                                    </span>
                                                </td>
                                                <td className="center">
                                                    <div className="student-progress-container">
                                                        <div className="student-progress-bar">
                                                            <div 
                                                                className={`student-progress-fill ${subject.percentage >= 95 ? 'good' : subject.percentage >= 85 ? 'warning' : 'danger'}`}
                                                                style={{ width: `${subject.percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="student-progress-text">
                                                            {subject.percentage}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                            </div>
                        )}
                    </div>
                )
            },
            {
                label: "Records",
                Icon: CalendarIcon,
                panels: [],
                content: (
                    <div className="student-records-placeholder">
                        <CalendarIcon className="student-records-icon" />
                        <h3 className="student-records-title">Detailed Records Coming Soon</h3>
                        <p className="student-records-desc">View comprehensive attendance history and detailed records</p>
                    </div>
                )
            }
        ]} />
    );
}