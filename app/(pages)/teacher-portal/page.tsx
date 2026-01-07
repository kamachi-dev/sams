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

// Student list with recent attendance
const recentStudents = [
    { id: 1, name: "Juan Dela Cruz", status: "Present", time: "8:00 AM" },
    { id: 2, name: "Maria Santos", status: "Present", time: "8:05 AM" },
    { id: 3, name: "Pedro Reyes", status: "Late", time: "8:25 AM" },
    { id: 4, name: "Ana Garcia", status: "Present", time: "7:55 AM" },
    { id: 5, name: "Carlos Mendoza", status: "Absent", time: "-" },
    { id: 6, name: "Sofia Rodriguez", status: "Present", time: "7:58 AM" },
    { id: 7, name: "Miguel Torres", status: "Present", time: "8:02 AM" },
    { id: 8, name: "Isabella Fernandez", status: "Late", time: "8:30 AM" },
    { id: 9, name: "Diego Martinez", status: "Present", time: "7:52 AM" },
    { id: 10, name: "Valentina Lopez", status: "Present", time: "8:08 AM" },
    { id: 11, name: "Gabriel Ramirez", status: "Absent", time: "-" },
    { id: 12, name: "Camila Gonzalez", status: "Present", time: "7:59 AM" },
    { id: 13, name: "Lucas Sanchez", status: "Present", time: "8:03 AM" },
    { id: 14, name: "Emma Diaz", status: "Late", time: "8:28 AM" },
    { id: 15, name: "Mateo Morales", status: "Present", time: "7:57 AM" },
    { id: 16, name: "Olivia Castro", status: "Present", time: "8:01 AM" },
    { id: 17, name: "Santiago Ramos", status: "Present", time: "8:06 AM" },
    { id: 18, name: "Mia Flores", status: "Absent", time: "-" },
    { id: 19, name: "Sebastian Cruz", status: "Present", time: "7:54 AM" },
    { id: 20, name: "Luna Herrera", status: "Present", time: "8:04 AM" }
];

export default function Teacher() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState("all");
    const [selectedGradeLevel, setSelectedGradeLevel] = useState("all");
    const [selectedSection, setSelectedSection] = useState("all");
    const [selectedQuarter, setSelectedQuarter] = useState("current");

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
                    <div style={{ padding: "24px" }}>
                        
                        {/* Filter and Search Section */}
                        <div style={{ 
                            background: "#FFFFFF",
                            padding: "20px",
                            borderRadius: "8px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                            marginBottom: "24px",
                            border: "1px solid #F2F2F2",
                            transition: "box-shadow 0.2s ease"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"}>
                            <div style={{ 
                                display: "flex", 
                                gap: "12px", 
                                alignItems: "center",
                                flexWrap: "wrap",
                                justifyContent: "space-between"
                            }}>
                                <div style={{ 
                                    display: "flex", 
                                    gap: "12px", 
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    flex: 1
                                }}>
                                <select 
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    style={{ 
                                        padding: "10px 16px",
                                        borderRadius: "6px",
                                        border: "1px solid #BDBDBD",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        minWidth: "130px",
                                        transition: "all 0.2s ease",
                                        background: "#FFFFFF",
                                        color: "#4F4F4F"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#1DA1F2";
                                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(29,161,242,0.1)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "#BDBDBD";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}>
                                    <option value="all">All Subjects</option>
                                    <option value="math">Mathematics</option>
                                    <option value="science">Science</option>
                                    <option value="english">English</option>
                                </select>

                                <select                                     value={selectedGradeLevel}
                                    onChange={(e) => setSelectedGradeLevel(e.target.value)}
                                    style={{ 
                                        padding: "10px 16px",
                                        borderRadius: "6px",
                                        border: "1px solid #BDBDBD",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        minWidth: "130px",
                                        transition: "all 0.2s ease",
                                        background: "#FFFFFF",
                                        color: "#4F4F4F"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#1DA1F2";
                                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(29,161,242,0.1)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "#BDBDBD";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}>
                                    <option value="all">All Grade Levels</option>
                                    <option value="11">Grade 11</option>
                                    <option value="12">Grade 12</option>
                                </select>

                                <select 
                                    value={selectedSection}
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                    style={{ 
                                        padding: "10px 16px",
                                        borderRadius: "6px",
                                        border: "1px solid #BDBDBD",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        minWidth: "130px",
                                        transition: "all 0.2s ease",
                                        background: "#FFFFFF",
                                        color: "#4F4F4F"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#1DA1F2";
                                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(29,161,242,0.1)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "#BDBDBD";
                                        e.currentTarget.style.boxShadow = "none";
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
                                        padding: "10px 16px",
                                        borderRadius: "6px",
                                        border: "1px solid #BDBDBD",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        minWidth: "130px",
                                        transition: "all 0.2s ease",
                                        background: "#FFFFFF",
                                        color: "#4F4F4F"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#1DA1F2";
                                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(29,161,242,0.1)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "#BDBDBD";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}>
                                    <option value="all">All Quarters</option>
                                    <option value="1">1st Quarter</option>
                                    <option value="2">2nd Quarter</option>
                                    <option value="3">3rd Quarter</option>
                                    <option value="4">4th Quarter</option>
                                </select>

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
                                
                                <button 
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    style={{
                                        background: isExporting ? "#BDBDBD" : "#1DA1F2",
                                        color: "white",
                                        border: "none",
                                        padding: "10px 20px",
                                        borderRadius: "6px",
                                        cursor: isExporting ? "not-allowed" : "pointer",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        transition: "all 0.2s ease",
                                        transform: "scale(1)"
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
                                    onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
                                    onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}  
                                >
                                    <DownloadIcon style={{ animation: isExporting ? "spin 1s linear infinite" : "none" }} />
                                    {isExporting ? "Exporting..." : "Export"}
                                </button>
                            </div>
                        </div>

                        {/* Charts Section */}
                        <div style={{ 
                            display: "grid", 
                            gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", 
                            gap: "24px",
                            marginBottom: "32px",
                            width: "100%",
                            maxWidth: "100%",
                            overflow: "hidden"
                        }}>
                            {/* Daily Attendance Trend */}
                            <div style={{ 
                                background: "#FFFFFF", 
                                padding: "24px", 
                                borderRadius: "8px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                border: "1px solid #F2F2F2",
                                transition: "all 0.3s ease",
                                minWidth: 0,
                                maxWidth: "100%"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                                e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
                                e.currentTarget.style.transform = "translateY(0)";
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                    <h3 style={{ 
                                        fontSize: "18px", 
                                        fontWeight: "600", 
                                        color: "#1F2F57",
                                        margin: 0
                                    }}>Daily Attendance Trend</h3>
                                    <span style={{
                                        fontSize: "12px",
                                        color: "#4F4F4F",
                                        padding: "4px 8px",
                                        background: "#F2F2F2",
                                        borderRadius: "6px"
                                    }}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                                </div>
                                <ResponsiveContainer width="100%" height={280}>
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

                            {/* Weekly Comparison */}
                            <div style={{ 
                                background: "#FFFFFF", 
                                padding: "24px", 
                                borderRadius: "8px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                border: "1px solid #F2F2F2",
                                transition: "all 0.3s ease",
                                minWidth: 0,
                                maxWidth: "100%"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                                e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
                                e.currentTarget.style.transform = "translateY(0)";
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                    <h3 style={{ 
                                        fontSize: "18px", 
                                        fontWeight: "600", 
                                        color: "#1F2F57",
                                        margin: 0
                                    }}>Weekly Comparison</h3>
                                    <span style={{
                                        fontSize: "12px",
                                        color: "#4F4F4F",
                                        padding: "4px 8px",
                                        background: "#F2F2F2",
                                        borderRadius: "6px"
                                    }}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                                </div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={weeklyComparison}>
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
                                        <Bar dataKey="present" fill="#0F9D58" radius={[8, 8, 0, 0]} name="Present" />
                                        <Bar dataKey="late" fill="#F4B400" radius={[8, 8, 0, 0]} name="Late" />
                                        <Bar dataKey="absent" fill="#DB4437" radius={[8, 8, 0, 0]} name="Absent" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Recent Attendance Table */}
                        <div style={{ 
                            background: "#FFFFFF", 
                            padding: "24px", 
                            borderRadius: "8px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                            border: "1px solid #F2F2F2",
                            transition: "box-shadow 0.3s ease",
                            width: "100%",
                            maxWidth: "100%",
                            overflow: "hidden"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                <h3 style={{ 
                                    fontSize: "18px", 
                                    fontWeight: "600", 
                                    color: "#1F2F57",
                                    margin: 0
                                }}>Today&apos;s Attendance</h3>
                                <span style={{
                                    fontSize: "12px",
                                    color: "#4F4F4F",
                                    padding: "4px 8px",
                                    background: "#F2F2F2",
                                    borderRadius: "6px"
                                }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div style={{ maxHeight: "400px", overflowY: "auto", overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "2px solid #F2F2F2" }}>
                                            <th style={{ padding: "14px 12px", textAlign: "left", fontSize: "13px", fontWeight: "700", color: "#1F2F57", textTransform: "uppercase", letterSpacing: "0.05em" }}>Student Name</th>
                                            <th style={{ padding: "14px 12px", textAlign: "left", fontSize: "13px", fontWeight: "700", color: "#1F2F57", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                                            <th style={{ padding: "14px 12px", textAlign: "left", fontSize: "13px", fontWeight: "700", color: "#1F2F57", textTransform: "uppercase", letterSpacing: "0.05em" }}>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentStudents.map((student) => (
                                            <tr key={student.id} style={{ 
                                                borderBottom: "1px solid #F2F2F2",
                                                transition: "background 0.15s ease",
                                                cursor: "pointer"
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "#EAF4FF"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                                <td style={{ padding: "16px 12px", fontSize: "14px", color: "#4F4F4F", fontWeight: "500" }}>
                                                    {student.name}
                                                </td>
                                                <td style={{ padding: "16px 12px" }}>
                                                    <span style={{ 
                                                        padding: "6px 14px",
                                                        borderRadius: "16px",
                                                        fontSize: "12px",
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
                                                <td style={{ padding: "16px 12px", fontSize: "14px", color: "#4F4F4F", fontWeight: "500" }}>
                                                    {student.time}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
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