"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import { ThickArrowRightIcon, CalendarIcon, DownloadIcon, PersonIcon, BookmarkIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
    { subject: "Social Studies", present: 40, late: 0, absent: 0, percentage: 100 }
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
                    <div key="attendance-rate" style={{
                        background: "linear-gradient(135deg, #0F9D58 0%, #0C7A44 100%)",
                        padding: "24px",
                        borderRadius: "8px",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        gap: "20px",
                        transition: "all 0.3s ease",
                        border: "none",
                        cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 16px rgba(15,157,88,0.3)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                    }}>
                        <CalendarIcon style={{ width: "48px", height: "48px", opacity: 0.9 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "4px" }}>Overall Attendance Rate</div>
                            <div style={{ fontSize: "36px", fontWeight: "bold" }}>{attendanceRate}%</div>
                            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
                                {presentDays + lateDays} out of {totalDays} days
                            </div>
                        </div>
                    </div>,

                    // Present Days
                    <div key="present-days" style={{
                        background: "#1DA1F2",
                        padding: "24px",
                        borderRadius: "8px",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        gap: "20px",
                        transition: "all 0.3s ease",
                        border: "none",
                        cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 16px rgba(29,161,242,0.3)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                    }}>
                        <PersonIcon style={{ width: "48px", height: "48px", opacity: 0.9 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "4px" }}>Days Present</div>
                            <div style={{ fontSize: "36px", fontWeight: "bold" }}>{presentDays}</div>
                            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
                                {((presentDays / totalDays) * 100).toFixed(1)}% of total days
                            </div>
                        </div>
                    </div>,

                    // Total Subjects
                    <div key="total-subjects" style={{
                        background: "#1F2F57",
                        padding: "24px",
                        borderRadius: "8px",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        gap: "20px",
                        transition: "all 0.3s ease",
                        border: "none",
                        cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 16px rgba(31,47,87,0.3)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                    }}>
                        <BookmarkIcon style={{ width: "48px", height: "48px", opacity: 0.9 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "4px" }}>Total Subjects Enrolled</div>
                            <div style={{ fontSize: "36px", fontWeight: "bold" }}>{totalSubjects}</div>
                            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
                                Active this semester
                            </div>
                        </div>
                    </div>
                ],
                content: (
                    <div style={{ padding: "20px", width: "100%", maxWidth: "100%", overflow: "hidden" }}>
                        {/* Student Info Card */}
                        <div style={{
                            background: "white",
                            padding: "20px",
                            borderRadius: "8px",
                            marginBottom: "20px",
                            border: "1px solid #F2F2F2",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                <h3 style={{ color: "#1F2F57", fontSize: "18px", fontWeight: "600", margin: 0 }}>
                                    Student Information
                                </h3>
                                <div style={{ fontSize: "12px", color: "#BDBDBD" }}>
                                    2nd Semester, S.Y. 2025-2026
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                                <div>
                                    <div style={{ fontSize: "12px", color: "#BDBDBD", marginBottom: "4px" }}>Student Name</div>
                                    <div style={{ fontSize: "14px", color: "#4F4F4F", fontWeight: "500" }}>{studentInfo.name}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "12px", color: "#BDBDBD", marginBottom: "4px" }}>Student ID</div>
                                    <div style={{ fontSize: "14px", color: "#4F4F4F", fontWeight: "500" }}>{studentInfo.studentId}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "12px", color: "#BDBDBD", marginBottom: "4px" }}>Grade Level</div>
                                    <div style={{ fontSize: "14px", color: "#4F4F4F", fontWeight: "500" }}>{studentInfo.grade}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "12px", color: "#BDBDBD", marginBottom: "4px" }}>Section</div>
                                    <div style={{ fontSize: "14px", color: "#4F4F4F", fontWeight: "500" }}>{studentInfo.section}</div>
                                </div>
                            </div>
                        </div>

                        {/* Filters and Export */}
                        <div style={{
                            background: "white",
                            padding: "16px 20px",
                            borderRadius: "8px",
                            marginBottom: "20px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "16px",
                            border: "1px solid #F2F2F2",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
                        }}>
                            <div style={{ display: "flex", gap: "12px", flex: 1, flexWrap: "wrap" }}>
                                <select
                                    value={selectedView}
                                    onChange={(e) => setSelectedView(e.target.value as any)}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: "6px",
                                        border: "1px solid #BDBDBD",
                                        background: "white",
                                        color: "#4F4F4F",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#1DA1F2";
                                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(29,161,242,0.1)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "#BDBDBD";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    <option value="daily">Daily View</option>
                                    <option value="weekly">Weekly View</option>
                                    <option value="monthly">Monthly View</option>
                                    <option value="quarterly">Quarterly View</option>
                                </select>

                                <select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: "6px",
                                        border: "1px solid #BDBDBD",
                                        background: "white",
                                        color: "#4F4F4F",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#1DA1F2";
                                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(29,161,242,0.1)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "#BDBDBD";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
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
                                style={{
                                    padding: "10px 24px",
                                    background: isExporting ? "#BDBDBD" : "#1DA1F2",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: isExporting ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    transition: "all 0.2s ease",
                                    whiteSpace: "nowrap"
                                }}
                                onMouseEnter={(e) => {
                                    if (!isExporting) {
                                        e.currentTarget.style.background = "#1a8cd8";
                                        e.currentTarget.style.transform = "scale(1.02)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = isExporting ? "#BDBDBD" : "#1DA1F2";
                                    e.currentTarget.style.transform = "scale(1)";
                                }}
                            >
                                <DownloadIcon style={{ width: "16px", height: "16px" }} />
                                {isExporting ? "Exporting..." : "Export Report"}
                            </button>
                        </div>

                        {/* Main Content Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "20px" }}>
                            {/* Attendance Trend Chart */}
                            <div style={{
                                background: "white",
                                padding: "24px",
                                borderRadius: "8px",
                                border: "1px solid #F2F2F2",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                minWidth: 0,
                                maxWidth: "100%"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                    <h3 style={{ color: "#1F2F57", fontSize: "16px", fontWeight: "600", margin: 0 }}>
                                        {selectedView === "daily" && "Daily Attendance"}
                                        {selectedView === "weekly" && "Weekly Attendance Trend"}
                                        {selectedView === "monthly" && "Monthly Attendance Rate"}
                                        {selectedView === "quarterly" && "Quarterly Comparison"}
                                    </h3>
                                    <div style={{ fontSize: "12px", color: "#BDBDBD" }}>
                                        {selectedView === "daily" && "Last 7 days"}
                                        {selectedView === "weekly" && "This month"}
                                        {selectedView === "monthly" && "This semester"}
                                        {selectedView === "quarterly" && "Academic year"}
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={280}>
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

                            {/* Attendance Distribution Pie Chart */}
                            <div style={{
                                background: "white",
                                padding: "24px",
                                borderRadius: "8px",
                                border: "1px solid #F2F2F2",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                minWidth: 0,
                                maxWidth: "100%"
                            }}>
                                <div style={{ marginBottom: "16px" }}>
                                    <h3 style={{ color: "#1F2F57", fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
                                        Current Semester Summary
                                    </h3>
                                    <p style={{ fontSize: "12px", color: "#BDBDBD", margin: 0 }}>
                                        Breakdown of your {totalDays} total class days
                                    </p>
                                </div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
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
                                <div style={{ marginTop: "16px" }}>
                                    {pieData.map((entry) => (
                                        <div key={entry.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: entry.color }}></div>
                                                <span style={{ fontSize: "14px", color: "#4F4F4F" }}>{entry.name}</span>
                                            </div>
                                            <div style={{ fontSize: "16px", fontWeight: "600", color: "#1F2F57" }}>
                                                {entry.value} days
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Subject-wise Attendance Table */}
                        <div style={{
                            background: "white",
                            padding: "24px",
                            borderRadius: "8px",
                            border: "1px solid #F2F2F2",
                            width: "100%",
                            maxWidth: "100%",
                            overflow: "hidden",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
                        }}>
                            <h3 style={{ color: "#1F2F57", fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>
                                Attendance by Subject
                            </h3>
                            <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "2px solid #F2F2F2" }}>
                                            <th style={{ textAlign: "left", padding: "12px", color: "#1F2F57", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Subject</th>
                                            <th style={{ textAlign: "center", padding: "12px", color: "#1F2F57", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Present</th>
                                            <th style={{ textAlign: "center", padding: "12px", color: "#1F2F57", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Late</th>
                                            <th style={{ textAlign: "center", padding: "12px", color: "#1F2F57", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Absent</th>
                                            <th style={{ textAlign: "center", padding: "12px", color: "#1F2F57", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Attendance Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subjectAttendance.map((subject, index) => (
                                            <tr key={index} style={{ borderBottom: "1px solid #F2F2F2", transition: "background 0.2s ease" }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = "#EAF4FF"}
                                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                                <td style={{ padding: "16px 12px", color: "#4F4F4F", fontSize: "14px", fontWeight: "500" }}>{subject.subject}</td>
                                                <td style={{ padding: "16px 12px", textAlign: "center" }}>
                                                    <span style={{ padding: "4px 12px", background: "rgba(15,157,88,0.15)", color: "#0F9D58", borderRadius: "4px", fontSize: "13px", fontWeight: "500" }}>
                                                        {subject.present}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "16px 12px", textAlign: "center" }}>
                                                    <span style={{ padding: "4px 12px", background: "rgba(244,180,0,0.15)", color: "#F4B400", borderRadius: "4px", fontSize: "13px", fontWeight: "500" }}>
                                                        {subject.late}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "16px 12px", textAlign: "center" }}>
                                                    <span style={{ padding: "4px 12px", background: "rgba(219,68,55,0.15)", color: "#DB4437", borderRadius: "4px", fontSize: "13px", fontWeight: "500" }}>
                                                        {subject.absent}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "16px 12px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                                        <div style={{
                                                            width: "60px",
                                                            height: "6px",
                                                            background: "#F2F2F2",
                                                            borderRadius: "3px",
                                                            overflow: "hidden"
                                                        }}>
                                                            <div style={{
                                                                width: `${subject.percentage}%`,
                                                                height: "100%",
                                                                background: subject.percentage >= 95 ? "#0F9D58" : subject.percentage >= 85 ? "#F4B400" : "#DB4437",
                                                                transition: "width 0.3s ease"
                                                            }}></div>
                                                        </div>
                                                        <span style={{ fontSize: "14px", fontWeight: "600", color: "#1F2F57" }}>
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
                )
            },
            {
                label: "Records",
                Icon: CalendarIcon,
                panels: [],
                content: (
                    <div style={{ padding: "40px", textAlign: "center" }}>
                        <CalendarIcon style={{ width: "64px", height: "64px", color: "#BDBDBD", margin: "0 auto 16px" }} />
                        <h3 style={{ color: "#4F4F4F", fontSize: "18px", fontWeight: "500" }}>Detailed Records Coming Soon</h3>
                        <p style={{ color: "#BDBDBD", fontSize: "14px" }}>View comprehensive attendance history and detailed records</p>
                    </div>
                )
            }
        ]} />
    );
}