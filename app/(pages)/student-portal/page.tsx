"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import {
  ThickArrowRightIcon,
  CalendarIcon,
  DownloadIcon,
  PersonIcon,
  BookmarkIcon,
  DashboardIcon,
  BellIcon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon
} from "@radix-ui/react-icons";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./styles.css";
import "../teacher-portal/styles.css";
import {
  studentInfo,
  dailyAttendance,
  weeklyTrend,
  monthlyData,
  quarterlyData,
  notifications,
  subjectAttendance,
  chartColors,
  attendanceAppeals,
} from "./constants";

const totalDays = 40;
const presentDays = 37;
const lateDays = 2;
const absentDays = 1;
const warnings = 4;
const attendanceRate = (((presentDays + lateDays) / totalDays) * 100).toFixed(1);
const attendanceAlerts = (presentDays + lateDays);
const totalSubjects = subjectAttendance.length;

function getLateReason(record: any) {
  if (record.status !== "LATE") return "";

  return `Arrival recorded at (${record.recordedTime}), exceeding the 15 minute grace period (${record.classStart}).`;
}


export default function Student() {
  const [selectedView, setSelectedView] = useState<
    "daily" | "weekly" | "monthly" | "quarterly"
  >("weekly");

  const [selectedSubject, setSelectedSubject] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "analytics" | "subjects"
  >("overview");

  // 👉 notifications specific
  const [activeSemester, setActiveSemester] = useState<"first" | "second">("first");

  const [selectedNotification, setSelectedNotification] =
    useState<(typeof notifications)[number] | null>(null);

  // Real data from database
  const [studentData, setStudentData] = useState<{
    username: string;
    grade_level: string;
    section: string;
  } | null>(null);
  
  const [attendanceSummary, setAttendanceSummary] = useState({
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    totalDays: 0,
    attendanceRate: 0,
    totalSubjects: 0
  });

  const [subjectAttendance, setSubjectAttendance] = useState<Array<{
    subject: string;
    present: number;
    late: number;
    absent: number;
    percentage: number;
  }>>([]);

  const [isLoading, setIsLoading] = useState(true);
  
  // Attendance trends data
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  // Student Appeal
  const appealableRecords = dailyAttendance.filter(
    (record) => record.status === "LATE" || record.status === "ABSENT"
  );

  // Appeal stats
  const availableAppealsCount = appealableRecords.length;

  const pendingAppealsCount = attendanceAppeals.filter(
    appeal => appeal.status === "pending"
  ).length;

  const completedAppealsCount = attendanceAppeals.filter(
    appeal => appeal.status === "approved" || appeal.status === "rejected"
  ).length;

  const [selectedRecord, setSelectedRecord] = useState<
    (typeof appealableRecords)[number] | null
  >(null);

  const [appeals, setAppeals] = useState(attendanceAppeals);
  const [records, setRecords] = useState(appealableRecords);
  const [appealReason, setAppealReason] = useState("");

  const handleSubmitAppeal = () => {
    if (!selectedRecord || !appealReason.trim()) return;
    const newAppeal = {
      id: Date.now(),
      subject: selectedRecord.subject,
      date: selectedRecord.date,
      recordedStatus: selectedRecord.status,
      requestedStatus: "Present",
      reason: appealReason,
      status: "pending",
      submittedAt: new Date().toISOString(),
      reviewedBy: null,
      teacherResponse: null,
    };
    // move to RIGHT (history)
    setAppeals(prev => [newAppeal, ...prev]);
    // remove from LEFT (issues)
    setRecords(prev =>
      prev.filter(r =>
        !(r.subject === selectedRecord.subject && 
          r.date === selectedRecord.date)
      )
    );
    // clear form
    setSelectedRecord(null);
    setAppealReason("");
  };

  // Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const [infoRes, summaryRes, subjectsRes] = await Promise.all([
          fetch('/api/student/info'),
          fetch('/api/student/attendance/summary'),
          fetch('/api/student/attendance/subjects')
        ]);

        const [infoData, summaryData, subjectsData] = await Promise.all([
          infoRes.json(),
          summaryRes.json(),
          subjectsRes.json()
        ]);

        if (infoData.success) {
          setStudentData(infoData.data);
        }

        if (summaryData.success) {
          setAttendanceSummary(summaryData.data);
        }

        if (subjectsData.success) {
          setSubjectAttendance(subjectsData.data);
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  // Fetch trends data when view or subject filter changes
  useEffect(() => {
    const fetchTrendsData = async () => {
      setIsLoadingTrends(true);
      try {
        const params = new URLSearchParams({
          view: selectedView
        });
        
        if (selectedSubject && selectedSubject !== 'all') {
          params.append('subject', selectedSubject);
        }
        
        const response = await fetch(`/api/student/attendance/trends?${params}`);
        const data = await response.json();
        
        if (data.success) {
          setTrendsData(data.data);
        }
      } catch (error) {
        console.error('Error fetching trends data:', error);
      } finally {
        setIsLoadingTrends(false);
      }
    };

    fetchTrendsData();
  }, [selectedView, selectedSubject]);

  const { presentDays, lateDays, absentDays, totalDays, attendanceRate, totalSubjects } = attendanceSummary;

  const pieData = [
    { name: "Present", value: presentDays, color: "var(--present)" },
    { name: "Late", value: lateDays, color: "var(--late)" },
    { name: "Absent", value: absentDays, color: "var(--absent)" },
  ];

    // ==========================
    // COLOR LOGIC
    // ==========================
    const getAttendanceStatus = (rate: number) => {
      if (rate >= 80) return "present";
      if (rate >= 50) return "late";
      return "absent";
    };
    const overallStatus = getAttendanceStatus(Number(attendanceRate));

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      alert("Attendance report exported successfully!");
      setIsExporting(false);
    }, 1500);
  };

  return (
    <SamsTemplate
      links={[
        {
          // OVERVIEW
          label: "Overview",
          Icon: DashboardIcon,
          panels: [
            <div key="total-subjects" className="student-panel-card enroll">
              <BookmarkIcon className="student-panel-icon" />
              <div className="student-panel-content">
                <div className="student-panel-label">Total Number of Subjects Enrolled</div>
                <div className="student-panel-value">{totalSubjects}</div>
                <div className="student-panel-sub">Active this semester</div>
              </div>
            </div>,

            <div
              key="attendance-rate"
              className="student-panel-card attendance"
              style={{ background: chartColors[overallStatus],
                ...(attendanceRate < 50 && { color: "black" })
               }}
            >
              <CalendarIcon className="student-panel-icon" />
              <div className="student-panel-content">
                <div className="student-panel-label">Overall Attendance Rate</div>
                <div className="student-panel-value">{attendanceRate}%</div>
                <div className="student-panel-sub">
                  {presentDays + lateDays} out of {totalDays} days
                </div>
              </div>
            </div>,

            <div
              key="present-days"
              className="student-panel-card present"
              style={{ background: chartColors[overallStatus],
                ...(attendanceRate < 50 && { color: "black" })
               }}
            >
              <PersonIcon className="student-panel-icon" />
              <div className="student-panel-content">
                <div className="student-panel-label">Total Number of Days Being Present</div>
                <div className="student-panel-value">{presentDays}</div>
                <div className="student-panel-sub">
                  {((presentDays / totalDays) * 100).toFixed(1)}% present in {totalDays} days
                </div>
              </div>
            </div>,
          ],
          content: (
            <div className="student-main-container">
              <div className="student-split-layout">

                {/* LEFT 40% */}
                <div className="student-subjects-card-left">
                  <div className="student-info-card">
                    <div className="student-info-header">
                      <h3 className="student-info-title">Student Information</h3>
                      <div className="student-info-meta">
                        2nd Semester, S.Y. 2025-2026
                      </div>
                    </div>

                    <div className="student-info-grid">
                      <div>
                        <div className="student-info-field-label">Student Name</div>
                        <div className="student-info-field-value">
                          {isLoading ? "Loading..." : (studentData?.username || studentInfo.name)}
                        </div>
                      </div>
                      <div>
                        <div className="student-info-field-label">Student ID</div>
                        <div className="student-info-field-value">{studentInfo.studentId}</div>
                      </div>
                      <div>
                        <div className="student-info-field-label">Grade Level</div>
                        <div className="student-info-field-value">
                          {isLoading ? "Loading..." : (studentData?.grade_level || studentInfo.grade)}
                        </div>
                      </div>
                      <div>
                        <div className="student-info-field-label">Section</div>
                        <div className="student-info-field-value">
                          {isLoading ? "Loading..." : (studentData?.section || "N/A")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="student-summary-card">
                    <h3 className="student-summary-title">Current Semester Summary</h3>

                    <div className="student-summary-row">
                        {/* LEFT: CHART */}
                        <div className="student-summary-chart">
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
                                {attendanceRate}%
                            </text>
                            </PieChart>
                        </ResponsiveContainer>
                        </div>

                        {/* RIGHT: DETAILS */}
                        <div className="student-summary-legend">
                        {pieData.map((item, index) => (
                            <div key={index} className="student-legend-item">
                            <div className="student-legend-label-group">
                                <span
                                className="student-legend-color"
                                style={{ backgroundColor: item.color }}
                                />
                                <span className="student-legend-label">{item.name}</span>
                            </div>
                            <span className="student-legend-value">{item.value}</span>
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
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="teacher-select"
                      >
                        <option value="all">All Subjects</option>
                        {subjectAttendance.map((subject, index) => (
                          <option key={index} value={subject.subject}>{subject.subject}</option>
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
                      {isLoadingTrends ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                          <p>Loading chart data...</p>
                        </div>
                      ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        {selectedView === "daily" && (
                          <BarChart data={trendsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0]?.payload;
                                  return (
                                    <div style={{ 
                                      backgroundColor: 'white', 
                                      padding: '10px', 
                                      border: '1px solid #ccc',
                                      borderRadius: '4px'
                                    }}>
                                      <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data.date}</p>
                                      <p style={{ color: 'var(--present)' }}>Present: {data.present}</p>
                                      <p style={{ color: 'var(--late)' }}>Late: {data.late}</p>
                                      <p style={{ color: 'var(--absent)' }}>Absent: {data.absent}</p>
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

                        {selectedView === "weekly" && (
                          <BarChart data={trendsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" />
                            <YAxis />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = trendsData.find(d => d.week === label);
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
                          <LineChart data={trendsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = trendsData.find(d => d.month === label);
                                  return (
                                    <div style={{ 
                                      backgroundColor: 'white', 
                                      padding: '10px', 
                                      border: '1px solid #ccc',
                                      borderRadius: '4px'
                                    }}>
                                      <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data?.fullMonth}</p>
                                      <p style={{ color: 'var(--present)' }}>Attendance Rate: {data?.attendanceRate}%</p>
                                      <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>Present: {data?.present}</p>
                                      <p style={{ color: '#666', fontSize: '12px' }}>Late: {data?.late}</p>
                                      <p style={{ color: '#666', fontSize: '12px' }}>Absent: {data?.absent}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="attendanceRate"
                              stroke="var(--present)"
                              strokeWidth={3}
                              name="Attendance Rate (%)"
                            />
                          </LineChart>
                        )}

                        {selectedView === "quarterly" && (
                          <BarChart data={trendsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0]?.payload;
                                  return (
                                    <div style={{ 
                                      backgroundColor: 'white', 
                                      padding: '10px', 
                                      border: '1px solid #ccc',
                                      borderRadius: '4px'
                                    }}>
                                      <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data.label}</p>
                                      <p style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
                                        {data.dateRange}
                                      </p>
                                      <p style={{ color: 'var(--present)' }}>Present: {data.present}</p>
                                      <p style={{ color: 'var(--late)' }}>Late: {data.late}</p>
                                      <p style={{ color: 'var(--absent)' }}>Absent: {data.absent}</p>
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
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT 60% */}
                <div className="student-subjects-card-right">
                  <h3 className="student-subjects-title">Attendance by Subject</h3>
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
                        {isLoading ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                              Loading subjects...
                            </td>
                          </tr>
                        ) : subjectAttendance.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                              No enrolled subjects found
                            </td>
                          </tr>
                        ) : (
                          subjectAttendance.map((subject, index) => (
                            <tr key={index}>
                              <td className="subject-name">{subject.subject}</td>
                              <td className="center">
                                <span className="student-status-badge present">{subject.present}</span>
                              </td>
                              <td className="center">
                                <span className="student-status-badge late">{subject.late}</span>
                              </td>
                              <td className="center">
                                <span className="student-status-badge absent">{subject.absent}</span>
                              </td>
                              <td className="center">
                                <div className="student-progress-container">
                                  <div className="student-progress-bar">
                                    <div
                                      className={`student-progress-fill ${
                                        subject.percentage >= 95
                                          ? "good"
                                          : subject.percentage >= 85
                                          ? "warning"
                                          : "danger"
                                      }`}
                                      style={{ width: `${subject.percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="student-progress-text">
                                    {subject.percentage}%
                                  </span>
                                </div>
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
          // ATTENDANCE APPEAL
          {
            label: "Attendance Appeal",
            Icon: ExclamationTriangleIcon,
            panels: [
            // 1. Available subjects for appeal
            <div key="appeal-available" className="student-panel-card appeal">
              <ExclamationTriangleIcon className="student-panel-icon" />
              <div className="student-panel-content">
                <div className="student-panel-label">Available Appeals</div>
                <div className="student-panel-value">{availableAppealsCount}</div>
                <div className="student-panel-sub">Subjects eligible for appeal</div>
              </div>
            </div>,

            // 2. Pending appeals
            <div key="appeal-pending" className="student-panel-card appeal-status">
              <BookmarkIcon className="student-panel-icon" />
              <div className="student-panel-content">
                <div className="student-panel-label">Pending Requests</div>
                <div className="student-panel-value">{pendingAppealsCount}</div>
                <div className="student-panel-sub">Awaiting professor review</div>
              </div>
            </div>,

            // 3. Completed appeals
            <div key="appeal-completed" className="student-panel-card appeal-status">
              <BookmarkIcon className="student-panel-icon" />
              <div className="student-panel-content">
                <div className="student-panel-label">Completed Appeals</div>
                <div className="student-panel-value">{completedAppealsCount}</div>
                <div className="student-panel-sub">Approved and rejected requests</div>
              </div>
            </div>,
          ],

            content: (
              <div className="appeal-container">

                <div className="appeal-split-layout">

                  {/* LEFT SIDE */}
                  <div className="appeal-list">

                    <div className="appeal-list-title">
                      Attendance Issues
                    </div>

                    <div className="appeal-list-scroll">

                      {records.length === 0 ? (
                        <div className="appeal-empty">
                          No attendance issues today
                        </div>
                      ) : (
                        records.map((record, index) => (
                          <div
                            key={index}
                            className={`appeal-item ${
                              selectedRecord === record ? "active" : ""
                            } ${record.status.toLowerCase()}`}
                            onClick={() => setSelectedRecord(record)}
                          >

                            <div className="appeal-item-header">
                              <div className="appeal-item-subject">
                                {record.subject}
                              </div>

                              <div className="appeal-item-status">
                                {record.status}
                              </div>
                            </div>

                            <div className="appeal-item-prof">
                              {record.prof}
                            </div>

                            <div className="appeal-item-time-range">
                              Class: {record.classStart} – {record.classEnd}
                            </div>

                            {record.status === "LATE" && (
                              <div className="appeal-item-reason">
                                {getLateReason(record)}
                              </div>
                            )}

                            {record.status === "ABSENT" && (
                              <div className="appeal-item-reason">
                                No face recognition detected during class session.
                              </div>
                            )}

                          </div>
                        ))
                      )}

                    </div>

                  </div>

                  {/* RIGHT SIDE */}
                  <div className="appeal-form-container">
                    <div className="appeal-right-layout">
                      {/* Appeal Form */}
                      <div className="appeal-card">
                        <h3 className="appeal-title">
                          Submit Attendance Appeal
                        </h3>

                        <div className="appeal-form">

                          <div className="appeal-field">
                            <label>Date and Time</label>
                            <input
                              type="text"
                              value={
                                selectedRecord
                                  ? `${selectedRecord.date} (${selectedRecord.classStart} – ${selectedRecord.classEnd})`
                                  : ""
                              }
                              readOnly
                            />
                          </div>

                          <div className="appeal-field">
                            <label>Subject</label>
                            <input type="text" value={selectedRecord?.subject || ""} readOnly />
                          </div>

                          <div className="appeal-field">
                            <label>Professor</label>
                            <input
                              type="text"
                              value={selectedRecord?.prof || ""}
                              readOnly
                            />
                          </div>

                          <div className="appeal-field">
                            <label>Recorded Status</label>
                            <input type="text" value={selectedRecord?.status || ""} readOnly />
                          </div>

                          <div className="appeal-field">
                            <label>Reason for Appeal</label>
                            <textarea
                              placeholder="Explain why your attendance should be corrected..."
                              value={appealReason}
                              onChange={(e) => setAppealReason(e.target.value)}
                            />
                          </div>

                          <button
                            className="student-export-btn"
                            onClick={handleSubmitAppeal}
                            disabled={!selectedRecord || !appealReason.trim()}
                          >
                            Submit Appeal
                          </button>

                        </div>
                      </div>

                      {/* Appeal History */}
                      <div className="appeal-history-card">

                        <div className="appeal-history-title">
                          Appeal History
                        </div>

                        <div className="appeal-history-scroll">

                          {appeals.map((appeal) => (
                            <div
                              key={appeal.id}
                              className={`appeal-history-item ${appeal.status}`}
                              style={{ cursor: "default" }}
                            >
                              <div className="appeal-history-header">

                                <div className="appeal-history-subject">
                                  {appeal.subject}
                                </div>

                                <div className="appeal-history-status">
                                  {appeal.status.toUpperCase()}
                                </div>

                              </div>

                              <div className="appeal-history-meta">
                                {appeal.date} • {appeal.recordedStatus} → {appeal.requestedStatus}
                              </div>

                              <div className="appeal-history-reason">
                                <strong>Your reason:</strong> {appeal.reason}
                              </div>

                              {appeal.status !== "pending" && (
                                <div className="appeal-history-teacher-response">

                                  <strong>
                                    {appeal.reviewedBy || "System"} decision:
                                  </strong>

                                  <div>
                                    {appeal.teacherResponse?.trim()
                                      ? appeal.teacherResponse
                                      : `Your attendance appeal has been ${appeal.status}.`}
                                  </div>

                                </div>
                              )}
                            </div>
                          ))}

                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          },
        {
            // NOTIFICATIONS
            label: "Notifications",
            Icon: BellIcon,
            panels: [
                <div key="total-subjects" className="student-panel-card notifications">
                <BookmarkIcon className="student-panel-icon" />
                <div className="student-panel-content">
                    <div className="student-panel-label">Total Unread Notifications</div>
                    <div className="student-panel-value">{totalSubjects}</div>
                    <div className="student-panel-sub">From current semester</div>
                </div>
                </div>,

                <div key="attendance-rate" className="student-panel-card alerts">
                <ExclamationTriangleIcon className="student-panel-icon" />
                <div className="student-panel-content">
                    <div className="student-panel-label">Attendance Alerts</div>
                    <div className="student-panel-value">{attendanceAlerts}</div>
                    <div className="student-panel-sub">Recorded late and absence incidents</div>
                </div>
                </div>,

                <div key="present-days" className="student-panel-card warnings">
                <ExclamationTriangleIcon className="student-panel-icon" />
                <div className="student-panel-content">
                    <div className="student-panel-label">Warnings Messages Recieved</div>
                    <div className="student-panel-value">{warnings}</div>
                    <div className="student-panel-sub">Messages regarding attendance issues</div>
                </div>
                </div>,
            ],
            content: (
                // inside the Notifications link -> content:
                <div className="notifications-container">
                {/* LEFT LIST */}
                <div className="notifications-list">
                    <div className="notifications-tabs">
                    <button
                        className={`notif-tab ${activeSemester === "first" ? "active" : ""}`}
                        onClick={() => setActiveSemester("first")}
                    >
                        1st Sem
                    </button>

                    <button
                        className={`notif-tab ${activeSemester === "second" ? "active" : ""}`}
                        onClick={() => setActiveSemester("second")}
                    >
                        2nd Sem
                    </button>
                    </div>

                    <div className="notifications-scroll">
                    {notifications.filter(n => n.semester === activeSemester).length === 0 ? (
                        <div className="notifications-empty">
                        No notifications for this semester
                        </div>
                    ) : (
                        notifications
                        .filter(n => n.semester === activeSemester)
                        .map((n, i) => (
                            <div
                            key={i}
                            className={`notification-item ${n.type} ${
                                selectedNotification === n ? "active" : ""
                            }`}
                            onClick={() => setSelectedNotification(n)}
                            >
                            <div className="notification-type">
                                {n.type.toUpperCase()}
                            </div>

                            <div className="notification-body">
                                <div className="notification-code">
                                {n.code.replace("_", " ")}
                                </div>

                                <div className="notification-title-row">
                                <span className="notification-title">{n.subject}</span>
                                <span className="notification-prof">{n.prof}</span>
                                </div>

                                <div className="notification-message">
                                {n.message.length > 50
                                    ? n.message.slice(0, 50) + "..."
                                    : n.message}
                                </div>
                            </div>

                            <div className="notification-time">
                                {n.time}
                            </div>
                            </div>
                        ))
                    )}
                    </div>
                </div>

                {/* RIGHT DETAILS */}
                <div
                className={`notification-preview ${
                    !selectedNotification ? "is-empty" : ""
                }`}
                >
                {!selectedNotification ? (
                    <div className="preview-empty">
                    <EnvelopeClosedIcon className="preview-empty-icon" />
                    <div className="preview-empty-text">
                        Select a Notification to View Details
                    </div>
                    </div>
                ) : (
                    <>
                    <div className="preview-time">
                        {selectedNotification.time}
                    </div>

                    <h2 className={`preview-title ${selectedNotification.type}`}>
                        {selectedNotification.type.toUpperCase()}
                    </h2>

                    <div className="preview-subject">
                        {selectedNotification.subject}
                    </div>

                    <div className="preview-prof">
                        {selectedNotification.code} · {selectedNotification.prof}
                    </div>

                    <p className="preview-text">
                        {selectedNotification.message}
                    </p>
                    </>
                )}
                </div>

                </div>
            )
        }
      ]}
    />
  );
}
