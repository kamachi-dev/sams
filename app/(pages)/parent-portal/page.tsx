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
import { 
  useState,
  useEffect
} from "react";
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
import {
  studentInfo,
  dailyAttendance,
  weeklyTrend,
  monthlyData,
  quarterlyData,
  subjectAttendance,
  notifications,
  children,
  chartColors,
} from "./constants";
import { useDragScroll } from "./useDragScroll";

const totalDays = 40;
const presentDays = 37;
const lateDays = 2;
const absentDays = 1;
const warnings = 4;
const attendanceRate = (((presentDays + lateDays) / totalDays) * 100).toFixed(1);
const attendanceAlerts = (presentDays + lateDays);
const totalSubjects = subjectAttendance.length;

const pieData = [
  { name: "Present", value: presentDays, color: "var(--present)" },
  { name: "Late", value: lateDays, color: "var(--late)" },
  { name: "Absent", value: absentDays, color: "var(--absent)" },
];

export default function Parent() {
  const dragScroll = useDragScroll<HTMLDivElement>();
  const [selectedView, setSelectedView] = useState<
    "daily" | "weekly" | "monthly" | "quarterly"
  >("weekly");
  const [view, setView] = useState<"records" | "dashboard">("records");
  const [selectedChild, setSelectedChild] = useState<any>(null);

  const [selectedSubject, setSelectedSubject] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "analytics" | "subjects"
  >("overview");

    // 👉 notifications specific
    const [activeSemester, setActiveSemester] = useState<"first" | "second">("first");

    const [selectedNotification, setSelectedNotification] =
    useState<(typeof notifications)[number] | null>(null);

  // ==========================
  // ATTENDANCE CALCULATIONS
  // ==========================
  const totalStudents = children.length;

  const todayPresentCount = children.filter(
    (child) =>
      child.today.statusLabel === "PRESENT" ||
      child.today.statusLabel === "LATE"
  ).length;


  const todayAttendanceRate =
    totalStudents > 0
      ? ((todayPresentCount / totalStudents) * 100).toFixed(1)
      : "0.0";

  const overallAttendanceRate =
    totalStudents > 0
      ? (
          children.reduce((sum, child) => sum + child.percentage, 0) /
          totalStudents
        ).toFixed(1)
      : "0.0";

    // ==========================
    // COLOR LOGIC
    // ==========================
    const getAttendanceStatus = (rate: number) => {
      if (rate >= 80) return "present";
      if (rate >= 50) return "late";
      return "absent";
    };
    const todayStatus = getAttendanceStatus(Number(todayAttendanceRate));
    const overallStatus = getAttendanceStatus(Number(overallAttendanceRate));

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
        label: "Student Record",
        Icon: PersonIcon,
        panels: [
          (view === "records"
          ? [
              <div key="children" className="student-panel-card enroll">
                <PersonIcon className="student-panel-icon" />
                <div className="student-panel-content">
                  <div className="student-panel-label">
                    Total Number of Children
                  </div>
                  <div className="student-panel-value">{children.length}</div>
                  <div className="student-panel-sub">
                    Registered in current school year
                  </div>
                </div>
              </div>,
            ]
          : [
              <div key="back" className="student-panel-card children">
                <button
                  className="check-info-btn"
                  onClick={() => setView("records")}
                >
                  ← Return to Student Records
                </button>
              </div>,
            ]),

        <div key="attendance-today" 
          className="student-panel-card current"
          style={{ background: chartColors[todayStatus] }}
        > 
          <CalendarIcon className="student-panel-icon" />
          <div className="student-panel-content">
            <div className="student-panel-label">Today’s Average Attendance</div>
            <div className="student-panel-value">{todayAttendanceRate}%</div>
            <div className="student-panel-sub">
              {todayPresentCount} out of {totalStudents} students are present
            </div>
          </div>
        </div>,

        <div key="attendance-overall"
          className="student-panel-card overall"
          style={{ background: chartColors[overallStatus] }}
        >
          <CalendarIcon className="student-panel-icon" />
          <div className="student-panel-content">
            <div className="student-panel-label">Total Average Attendance</div>
            <div className="student-panel-value">{overallAttendanceRate}%</div>
            <div className="student-panel-sub">
              Average attendance across all students
            </div>
          </div>
        </div>,
      ],
        content:
          view === "records" ? (
            <div className="parent-records-wrapper">
              <div className="parent-records-grid"
                  ref={dragScroll.ref}
                  onMouseDown={dragScroll.onMouseDown}
                  onMouseUp={dragScroll.onMouseUp}
                  onMouseLeave={dragScroll.onMouseLeave}
                  onMouseMove={dragScroll.onMouseMove}
                >
                {children.map((child) => (
                  <div key={child.id} className="parent-student-card">
                    <div className="parent-avatar" />

                    <h3>{child.name}</h3>
                    <hr className="card-divider" />

                    <div className="today-attendance-title">Today’s Attendance</div>

                    <div className="today-attendance-row">
                      {/* LEFT */}
                      <div className="today-info">
                        <div><strong>Class:</strong> {child.today.classTime}</div>
                        <div><strong>Teacher:</strong> {child.today.teacher}</div>
                        <div><strong>Subject:</strong> {child.today.subject}</div>
                        <div><strong>Last Checked:</strong> {child.today.lastChecked}</div>
                      </div>

                      {/* RIGHT */}
                      <div className="status-tooltip-wrapper">
                        <div className={`today-status ${child.status}`}>
                          {child.today.statusLabel}
                        </div>

                        {child.status === "checking" && (
                          <div className="status-tooltip">
                            The Student has appraised<br />their attendance for today.<br />Please wait for confirmation.
                          </div>
                        )}
                      </div>
                    </div>

                    <hr className="card-divider" />

                    <div className="daily-attendance-title">Daily Attendance</div>


                    <div className="daily-attendance-row">
                      {/* LEFT – Donut */}
                      <div className="daily-donut">
                        <ResponsiveContainer width={120} height={120}>
                          <PieChart>
                            <Pie
                              data={[
                                { value: child.present },
                                { value: child.late },
                                { value: child.absent },
                              ]}
                              innerRadius={40}
                              outerRadius={55}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill="var(--present)" />
                              <Cell fill="var(--late)" />
                              <Cell fill="var(--absent)" />
                            </Pie>

                            <text
                              x="50%"
                              y="50%"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              style={{ fontSize: "14px", fontWeight: 700 }}
                            >
                              {child.percentage}%
                            </text>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* RIGHT – Stats */}
                      <div className="daily-attendance-stats">
                        <div className="stat present">
                          <strong>Present</strong>
                          <span>{child.present}</span>
                        </div>
                        <div className="stat late">
                          <strong>Late</strong>
                          <span>{child.late}</span>
                        </div>
                        <div className="stat absent">
                          <strong>Absent</strong>
                          <span>{child.absent}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      className="check-info-btn"
                      onClick={() => {
                        setSelectedChild(child);
                        setView("dashboard");
                      }}
                    >
                      Check Info
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="student-main-container">
              <div className="student-split-layout">

                {/* LEFT */}
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
                        <div className="student-info-field-label">
                          Student Name
                        </div>
                        <div className="student-info-field-value">
                          {studentInfo.name}
                        </div>
                      </div>
                      <div>
                        <div className="student-info-field-label">
                          Student ID
                        </div>
                        <div className="student-info-field-value">
                          {studentInfo.studentId}
                        </div>
                      </div>
                      <div>
                        <div className="student-info-field-label">
                          Grade Level
                        </div>
                        <div className="student-info-field-value">
                          {studentInfo.grade}
                        </div>
                      </div>
                      <div>
                        <div className="student-info-field-label">
                          Section
                        </div>
                        <div className="student-info-field-value">
                          {studentInfo.section}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="student-summary-card">
                    <h3 className="student-summary-title">
                      Current Semester Summary
                    </h3>

                    <div className="student-summary-row">
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

                      <div className="student-summary-legend">
                        {pieData.map((item, index) => (
                          <div key={index} className="student-legend-item">
                            <div className="student-legend-label-group">
                              <span
                                className="student-legend-color"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="student-legend-label">
                                {item.name}
                              </span>
                            </div>
                            <span className="student-legend-value">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="student-filters">
                    <div className="student-filters-group">
                      <select className="student-select">
                        <option>1st Semester</option>
                        <option>2nd Semester</option>
                      </select>

                      <select
                        value={selectedView}
                        onChange={(e) =>
                          setSelectedView(e.target.value as any)
                        }
                        className="student-select"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>

                      <select
                        value={selectedSubject}
                        onChange={(e) =>
                          setSelectedSubject(e.target.value)
                        }
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
                      <DownloadIcon />
                      {isExporting ? "Exporting..." : ""}
                    </button>
                  </div>

                  <div className="student-chart-container">
                    <div className="student-chart-card">
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

                {/* RIGHT */}
                <div className="student-subjects-card-right">
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
                            <td className="subject-name">
                              {subject.subject}
                            </td>
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
                                    className={`student-progress-fill ${
                                      subject.percentage >= 95
                                        ? "good"
                                        : subject.percentage >= 85
                                        ? "warning"
                                        : "danger"
                                    }`}
                                    style={{
                                      width: `${subject.percentage}%`,
                                    }}
                                  />
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
            </div>
          ),
        },
        {
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
