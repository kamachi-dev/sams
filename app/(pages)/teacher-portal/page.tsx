"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import { ThickArrowRightIcon, MagnifyingGlassIcon, PersonIcon, DownloadIcon, ExclamationTriangleIcon, BackpackIcon } from "@radix-ui/react-icons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { useState } from "react";

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

    // Calculate totals
    const totalStudents = 34;
    const studentsWithWarnings = 4;
    const classSemesterAttendance = 85; // percentage
    const todayPresent = 29;


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
                    // Number of Students - Enhanced with trend
                    <div key="total" style={{ 
                        background: "#1DA1F2", 
                        color: "white", 
                        padding: "24px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        border: "none",
                        boxShadow: "none",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
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
                        <PersonIcon style={{ width: "48px", height: "48px", opacity: 1 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", opacity: 0.85, marginBottom: "6px", fontWeight: "500" }}>Number of Students</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                                <div style={{ fontSize: "38px", fontWeight: "700" }}>{totalStudents}</div>
                            </div>
                        </div>
                    </div>,
                    
                    // Students with Warnings - Enhanced with trend
                    <div key="warnings" style={{ 
                        background: "#FFAC01", 
                        color: "white", 
                        padding: "24px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        border: "none",
                        boxShadow: "none",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                        cursor: "pointer",
                        position: "relative"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 16px rgba(244,180,0,0.3)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                    }}>
                        <ExclamationTriangleIcon style={{ width: "48px", height: "48px", opacity: 1 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", opacity: 0.85, marginBottom: "6px", fontWeight: "500" }}>Students with Warnings</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                                <div style={{ fontSize: "38px", fontWeight: "700" }}>{studentsWithWarnings}</div>
                            </div>
                        </div>
                    </div>,
                    
                    // Class Semester Attendance - Enhanced with trend
                    <div key="semester" style={{ 
                        background: "#0F9D58", 
                        color: "white", 
                        padding: "24px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        border: "none",
                        boxShadow: "none",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
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
                        <BackpackIcon style={{ width: "48px", height: "48px", opacity: 1 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", opacity: 0.85, marginBottom: "6px", fontWeight: "500" }}>Class Semester Attendance</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                                <div style={{ fontSize: "38px", fontWeight: "700" }}>{classSemesterAttendance}%</div>
                            </div>
                        </div>
                    </div>
                ],
                content: <>
                    <div style={{ padding: "8px" }}>
                        
                        {/* Tab Navigation */}
                        <div style={{
                            display: "flex",
                            gap: "8px",
                            marginBottom: "12px",
                            borderBottom: "2px solid #F2F2F2"
                        }}>
                            <button
                                onClick={() => setActiveTab("overview")}
                                style={{
                                    padding: "12px 24px",
                                    background: "none",
                                    border: "none",
                                    borderBottom: activeTab === "overview" ? "2px solid #1DA1F2" : "2px solid transparent",
                                    color: activeTab === "overview" ? "#1DA1F2" : "#4F4F4F",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    marginBottom: "-2px"
                                }}
                                onMouseEnter={(e) => {
                                    if (activeTab !== "overview") e.currentTarget.style.color = "#1DA1F2";
                                }}
                                onMouseLeave={(e) => {
                                    if (activeTab !== "overview") e.currentTarget.style.color = "#4F4F4F";
                                }}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab("analytics")}
                                style={{
                                    padding: "12px 24px",
                                    background: "none",
                                    border: "none",
                                    borderBottom: activeTab === "analytics" ? "2px solid #1DA1F2" : "2px solid transparent",
                                    color: activeTab === "analytics" ? "#1DA1F2" : "#4F4F4F",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    marginBottom: "-2px"
                                }}
                                onMouseEnter={(e) => {
                                    if (activeTab !== "analytics") e.currentTarget.style.color = "#1DA1F2";
                                }}
                                onMouseLeave={(e) => {
                                    if (activeTab !== "analytics") e.currentTarget.style.color = "#4F4F4F";
                                }}
                            >
                                Analytics
                            </button>
                            <button
                                onClick={() => setActiveTab("records")}
                                style={{
                                    padding: "12px 24px",
                                    background: "none",
                                    border: "none",
                                    borderBottom: activeTab === "records" ? "2px solid #1DA1F2" : "2px solid transparent",
                                    color: activeTab === "records" ? "#1DA1F2" : "#4F4F4F",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    marginBottom: "-2px"
                                }}
                                onMouseEnter={(e) => {
                                    if (activeTab !== "records") e.currentTarget.style.color = "#1DA1F2";
                                }}
                                onMouseLeave={(e) => {
                                    if (activeTab !== "records") e.currentTarget.style.color = "#4F4F4F";
                                }}
                            >
                                Attendance Records
                            </button>
                        </div>

                        {/* Overview Tab */}
                        {activeTab === "overview" && (
                            <div>
                                {/* Quick Summary Statistics */}
                                <div style={{ 
                                    display: "grid", 
                                    gridTemplateColumns: "repeat(3, 1fr)", 
                                    gap: "8px",
                                    width: "100%",
                                    marginBottom: "6px"
                                }}>
                                    {/* Average Attendance Rate */}
                                    <div style={{
                                        background: "linear-gradient(135deg, #0F9D58 0%, #0d8549 100%)",
                                        padding: "16px",
                                        borderRadius: "8px",
                                        color: "white"
                                    }}>
                                        <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "8px" }}>Avg. Attendance Rate</div>
                                        <div style={{ fontSize: "32px", fontWeight: "bold" }}>{classSemesterAttendance}%</div>
                                        <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>This semester</div>
                                    </div>

                                    {/* Today's Present */}
                                    <div style={{
                                        background: "linear-gradient(135deg, #1DA1F2 0%, #1a8cd8 100%)",
                                        padding: "16px",
                                        borderRadius: "8px",
                                        color: "white"
                                    }}>
                                        <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "8px" }}>Today's Present</div>
                                        <div style={{ fontSize: "32px", fontWeight: "bold" }}>{todayPresent}/{totalStudents}</div>
                                        <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>{((todayPresent/totalStudents)*100).toFixed(1)}% attendance</div>
                                    </div>

                                    {/* Late Students */}
                                    <div style={{
                                        background: "linear-gradient(135deg, #F4B400 0%, #d99f00 100%)",
                                        padding: "16px",
                                        borderRadius: "8px",
                                        color: "white"
                                    }}>
                                        <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "8px" }}>Late Today</div>
                                        <div style={{ fontSize: "32px", fontWeight: "bold" }}>{recentStudents.filter(s => s.status === "Late").length}</div>
                                        <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>Students tardy</div>
                                    </div>

                                    {/* Absent Students */}
                                    <div style={{
                                        background: "linear-gradient(135deg, #DB4437 0%, #c23929 100%)",
                                        padding: "16px",
                                        borderRadius: "8px",
                                        color: "white"
                                    }}>
                                        <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "8px" }}>Absent Today</div>
                                        <div style={{ fontSize: "32px", fontWeight: "bold" }}>{recentStudents.filter(s => s.status === "Absent").length}</div>
                                        <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>Students missing</div>
                                    </div>
                                    {/* Perfect Attendance */}
                                    <div style={{
                                        background: "linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",
                                        padding: "16px",
                                        borderRadius: "8px",
                                        color: "white"
                                    }}>
                                        <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "8px" }}>Perfect Attendance</div>
                                        <div style={{ fontSize: "32px", fontWeight: "bold" }}>{recentStudents.filter(s => s.status === "Present").length - recentStudents.filter(s => s.status === "Late").length}</div>
                                        <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>On time today</div>
                                    </div>

                                    {/* Total Classes This Week */}
                                    <div style={{
                                        background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
                                        padding: "16px",
                                        borderRadius: "8px",
                                        color: "white"
                                    }}>
                                        <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "8px" }}>Classes This Week</div>
                                        <div style={{ fontSize: "32px", fontWeight: "bold" }}>5</div>
                                        <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>Days conducted</div>
                                    </div>                                </div>
                            </div>
                        )}

                        {/* Analytics Tab */}
                        {activeTab === "analytics" && (
                            <div>
                                {/* Filters and Export */}
                                <div style={{
                                    background: "white",
                                    padding: "6px 8px",
                                    borderRadius: "6px",
                                    marginBottom: "8px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "8px",
                                    border: "1px solid #F2F2F2",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                    flexWrap: "wrap"
                                }}>
                                    <div style={{ display: "flex", gap: "6px", flex: 1, flexWrap: "wrap", alignItems: "center" }}>
                                        <select 
                                            value={selectedSubject}
                                            onChange={(e) => setSelectedSubject(e.target.value)}
                                            style={{ 
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                border: "1px solid #BDBDBD",
                                                fontSize: "13px",
                                                cursor: "pointer",
                                                minWidth: "110px",
                                                transition: "all 0.2s ease",
                                                background: "#FFFFFF",
                                                color: "#4F4F4F"
                                            }}>
                                            <option value="all">All Subjects</option>
                                            <option value="math">Mathematics</option>
                                            <option value="science">Science</option>
                                            <option value="english">English</option>
                                        </select>

                                        <select value={selectedGradeLevel}
                                            onChange={(e) => setSelectedGradeLevel(e.target.value)}
                                            style={{ 
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                border: "1px solid #BDBDBD",
                                                fontSize: "13px",
                                                cursor: "pointer",
                                                minWidth: "110px",
                                                transition: "all 0.2s ease",
                                                background: "#FFFFFF",
                                                color: "#4F4F4F"
                                            }}>
                                            <option value="all">All Grades</option>
                                            <option value="11">Grade 11</option>
                                            <option value="12">Grade 12</option>
                                        </select>

                                        <select 
                                            value={selectedSection}
                                            onChange={(e) => setSelectedSection(e.target.value)}
                                            style={{ 
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                border: "1px solid #BDBDBD",
                                                fontSize: "13px",
                                                cursor: "pointer",
                                                minWidth: "110px",
                                                transition: "all 0.2s ease",
                                                background: "#FFFFFF",
                                                color: "#4F4F4F"
                                            }}>
                                            <option value="all">All Sections</option>
                                            <option value="a">Section A</option>
                                            <option value="b">Section B</option>
                                            <option value="c">Section C</option>
                                        </select>

                                        <select 
                                            value={selectedQuarter}
                                            onChange={(e) => setSelectedQuarter(e.target.value)}
                                            style={{ 
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                border: "1px solid #BDBDBD",
                                                fontSize: "13px",
                                                cursor: "pointer",
                                                minWidth: "110px",
                                                transition: "all 0.2s ease",
                                                background: "#FFFFFF",
                                                color: "#4F4F4F"
                                            }}>
                                            <option value="current">Current Quarter</option>
                                            <option value="1">1st Quarter</option>
                                            <option value="2">2nd Quarter</option>
                                            <option value="3">3rd Quarter</option>
                                            <option value="4">4th Quarter</option>
                                        </select>

                                        <select
                                            value={selectedView}
                                            onChange={(e) => setSelectedView(e.target.value as any)}
                                            style={{
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                border: "1px solid #BDBDBD",
                                                background: "white",
                                                color: "#4F4F4F",
                                                fontSize: "13px",
                                                cursor: "pointer",
                                                transition: "all 0.2s ease"
                                            }}
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
                                        style={{
                                            background: isExporting ? "#BDBDBD" : "#1DA1F2",
                                            color: "white",
                                            border: "none",
                                            padding: "6px 12px",
                                            borderRadius: "6px",
                                            cursor: isExporting ? "not-allowed" : "pointer",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            transition: "all 0.2s ease",
                                            whiteSpace: "nowrap"
                                        }}>
                                        <DownloadIcon style={{ animation: isExporting ? "spin 1s linear infinite" : "none" }} />
                                        {isExporting ? "Exporting..." : "Export"}
                                    </button>
                                </div>

                                {/* Charts Section */}
                                <div style={{ 
                                    display: "grid", 
                                    gridTemplateColumns: "1fr", 
                                    gap: "12px",
                                    width: "100%",
                                    maxWidth: "100%",
                                    overflow: "hidden"
                                        }}>
                                    {selectedView === "daily" && (
                                    <div style={{ 
                                        background: "#FFFFFF", 
                                padding: "12px", 
                                borderRadius: "8px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                border: "1px solid #F2F2F2",
                                minWidth: 0,
                                maxWidth: "100%"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                    <h3 style={{ 
                                        fontSize: "16px", 
                                        fontWeight: "600", 
                                        color: "#1F2F57",
                                        margin: 0
                                    }}>Daily Attendance Trend</h3>
                                    <span style={{
                                        fontSize: "11px",
                                        color: "#4F4F4F",
                                        padding: "3px 6px",
                                        background: "#F2F2F2",
                                        borderRadius: "4px"
                                    }}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
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
                                    <div style={{ 
                                background: "#FFFFFF", 
                                padding: "12px", 
                                borderRadius: "8px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                border: "1px solid #F2F2F2",
                                minWidth: 0,
                                maxWidth: "100%"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                    <h3 style={{ 
                                        fontSize: "16px", 
                                        fontWeight: "600", 
                                        color: "#1F2F57",
                                        margin: 0
                                    }}>Weekly Attendance Comparison</h3>
                                    <span style={{
                                        fontSize: "11px",
                                        color: "#4F4F4F",
                                        padding: "3px 6px",
                                        background: "#F2F2F2",
                                        borderRadius: "4px"
                                    }}>Last 4 Weeks</span>
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
                                    <div style={{ 
                                background: "#FFFFFF", 
                                padding: "12px", 
                                borderRadius: "8px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                border: "1px solid #F2F2F2",
                                minWidth: 0,
                                maxWidth: "100%"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                    <h3 style={{ 
                                        fontSize: "16px", 
                                        fontWeight: "600", 
                                        color: "#1F2F57",
                                        margin: 0
                                    }}>Monthly Attendance Summary</h3>
                                    <span style={{
                                        fontSize: "11px",
                                        color: "#4F4F4F",
                                        padding: "3px 6px",
                                        background: "#F2F2F2",
                                        borderRadius: "4px"
                                    }}>Last 5 Months</span>
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
                                    <div style={{ 
                                background: "#FFFFFF", 
                                padding: "12px", 
                                borderRadius: "8px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                border: "1px solid #F2F2F2",
                                minWidth: 0,
                                maxWidth: "100%"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                    <h3 style={{ 
                                        fontSize: "16px", 
                                        fontWeight: "600", 
                                        color: "#1F2F57",
                                        margin: 0
                                    }}>Quarterly Attendance Overview</h3>
                                    <span style={{
                                        fontSize: "11px",
                                        color: "#4F4F4F",
                                        padding: "3px 6px",
                                        background: "#F2F2F2",
                                        borderRadius: "4px"
                                    }}>4 Quarters</span>
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
                                <div style={{
                                    background: "white",
                                    padding: "12px 16px",
                                    borderRadius: "8px",
                                    marginBottom: "16px",
                                    border: "1px solid #F2F2F2",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
                                }}>

                                <div style={{ position: "relative", flex: 1, minWidth: "250px" }}>
                                    <MagnifyingGlassIcon style={{ 
                                        position: "absolute", 
                                        left: "14px", 
                                        top: "50%", 
                                        transform: "translateY(-50%)",
                                        color: "#BDBDBD",
                                        width: "18px",
                                        height: "18px",
                                        transition: "color 0.2s ease",
                                        pointerEvents: "none"
                                    }} />
                                    <input 
                                        type="text" 
                                        placeholder="Search student..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ 
                                            width: "100%",
                                            padding: "10px 14px 10px 44px", 
                                            border: "1px solid #BDBDBD",
                                            borderRadius: "6px",
                                            fontSize: "14px",
                                            transition: "all 0.2s ease",
                                            color: "#4F4F4F"
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = "#1DA1F2";
                                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(29,161,242,0.1)";
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = "#BDBDBD";
                                            e.currentTarget.style.boxShadow = "none";
                                        }}
                                    />
                                </div>
                                </div>
                                
                                {/* Recent Attendance Table */}
                                <div style={{ 
                                    background: "#FFFFFF", 
                                    padding: "8px", 
                                    borderRadius: "6px",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                    border: "1px solid #F2F2F2",
                                    transition: "box-shadow 0.3s ease",
                                    width: "100%",
                                    maxWidth: "100%",
                                    overflow: "hidden"
                                }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <h3 style={{ 
                                    fontSize: "14px", 
                                    fontWeight: "600", 
                                    color: "#1F2F57",
                                    margin: 0
                                }}>Today&apos;s Attendance</h3>
                                <span style={{
                                    fontSize: "10px",
                                    color: "#4F4F4F",
                                    padding: "2px 6px",
                                    background: "#F2F2F2",
                                    borderRadius: "4px"
                                }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div style={{ maxHeight: "200px", overflowY: "auto", overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "2px solid #F2F2F2" }}>
                                            <th style={{ padding: "8px 6px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "#1F2F57", textTransform: "uppercase", letterSpacing: "0.05em" }}>Student Name</th>
                                            <th style={{ padding: "8px 6px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "#1F2F57", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                                            <th style={{ padding: "8px 6px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "#1F2F57", textTransform: "uppercase", letterSpacing: "0.05em" }}>Time</th>
                                            <th style={{ padding: "8px 6px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "#1F2F57", textTransform: "uppercase", letterSpacing: "0.05em" }}>Facial Recognition Confidence</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentStudents.filter(student => student.name.toLowerCase().includes(searchQuery.toLowerCase())).map((student) => (
                                            <tr key={student.id} style={{ 
                                                borderBottom: "1px solid #F2F2F2",
                                                transition: "background 0.15s ease",
                                                cursor: "pointer"
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "#EAF4FF"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                                <td style={{ padding: "6px 6px", fontSize: "12px", color: "#4F4F4F" }}>{student.name}</td>
                                                <td style={{ padding: "6px 6px" }}>
                                                    <span style={{ 
                                                        padding: "4px 10px",
                                                        borderRadius: "12px",
                                                        fontSize: "11px",
                                                        fontWeight: "700",
                                                        background: student.status === "Present" ? "rgba(15,157,88,0.15)" : student.status === "Late" ? "rgba(244,180,0,0.15)" : "rgba(219,68,55,0.15)",
                                                        color: student.status === "Present" ? "#0F9D58" : student.status === "Late" ? "#F4B400" : "#DB4437",
                                                        display: "inline-block",
                                                        transition: "transform 0.2s ease"
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
                                                        {student.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "6px 6px", fontSize: "12px", color: "#4F4F4F", fontWeight: "500" }}>
                                                    {student.time}
                                                </td>
                                                <td style={{ padding: "6px 6px", fontSize: "12px", color: student.confidence === "No Detection" ? "#DB4437" : "#0F9D58", fontWeight: "600" }}>
                                                    {student.confidence}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                            </div>
                        )}
                        
                        {/* Add spin animation for export button */}
                        <style>{`
                            @keyframes spin {
                                from { transform: rotate(0deg); }
                                to { transform: rotate(360deg); }
                            }
                        `}</style>

                    </div>
                </>
            },
            {
                label: "Student Data",
                Icon: PersonIcon,
                panels: [],
                content: <>
                    <div style={{ padding: "24px" }}>
                        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px", color: "#1F2F57" }}>Student Data</h2>
                        <p style={{ color: "#4F4F4F" }}>Student data management will be displayed here</p>
                    </div>
                </>
            }
        ]} />
    );
}