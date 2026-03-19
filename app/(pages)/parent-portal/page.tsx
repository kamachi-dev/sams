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
  useEffect,
  useMemo
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
  chartColors,
} from "./constants";
import { useDragScroll } from "./useDragScroll";

// Helper function to calculate weekly trend from daily records
const calculateWeeklyTrend = (daily: any[]) => {
  const weeks: { [key: string]: { present: number; late: number; absent: number } } = {};

  daily.forEach(record => {
    const date = new Date(record.date);
    const week = `Week ${Math.ceil(date.getDate() / 7)}`;

    if (!weeks[week]) {
      weeks[week] = { present: 0, late: 0, absent: 0 };
    }

    if (record.status === 'Present') weeks[week].present++;
    else if (record.status === 'Late') weeks[week].late++;
    else weeks[week].absent++;
  });

  return Object.entries(weeks).map(([week, data]) => ({
    week,
    ...data
  }));
};

const totalDays = 40;
const presentDays = 37;
const lateDays = 2;
const absentDays = 1;
const warnings = 4;
const attendanceRate = (((presentDays + lateDays) / totalDays) * 100).toFixed(1);
const attendanceAlerts = (presentDays + lateDays);

export default function Parent() {
  const dragScroll = useDragScroll<HTMLDivElement>();

  // API-fetched data
  const [children, setChildren] = useState<any[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<any[]>([]);
  const [courseAttendance, setCourseAttendance] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedChildData, setSelectedChildData] = useState<any>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [quarterlyData, setQuarterlyData] = useState<any[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [childDetailsLoading, setChildDetailsLoading] = useState(false);

  const [childRecordFilters, setChildRecordFilters] = useState({
    yesterday: false,
    warning: false
  });
  const [selectedView, setSelectedView] = useState<
    "daily" | "weekly" | "monthly" | "quarterly"
  >("weekly");
  const [view, setView] = useState<"records" | "dashboard">("records");
  const [selectedChild, setSelectedChild] = useState<any>(null);

  const [selectedCourse, setSelectedCourse] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "analytics" | "courses"
  >("overview");

  // 👉 notifications specific
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>("");
  const [activeSemester, setActiveSemester] = useState<"first" | "second">("first");
  const [selectedStudent, setSelectedStudent] = useState("all");

  // Available options derived from notifications
  const [availableSchoolYears, setAvailableSchoolYears] = useState<string[]>([]);
  const [availableSemesters, setAvailableSemesters] = useState<("first" | "second")[]>([]);

  const [selectedNotification, setSelectedNotification] =
  useState<any>(null);

  // Fetch children list on component mount
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/parent/children');
        const result = await response.json();

        if (result.success && result.data) {
          // Transform API data to match UI format
          const transformedChildren = result.data.map((child: any) => ({
            id: child.id,
            name: child.name,
            isAbsentYesterday: "no",
            status: "present",
            present: 0,
            late: 0,
            absent: 0,
            percentage: 0,
            today: {
              statusLabel: "PRESENT",
              classTime: "10:15 AM",
              teacher: "Unknown",
              course: "Unknown",
              lastChecked: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
            }
          }));
          setChildren(transformedChildren);

          // Fetch summary data for each child
          for (const child of transformedChildren) {
            try {
              const summaryRes = await fetch(`/api/parent/children/${child.id}/summary`);
              const summaryData = await summaryRes.json();

              if (summaryData.success && summaryData.data) {
                child.present = summaryData.data.present;
                child.late = summaryData.data.late;
                child.absent = summaryData.data.absent;
                child.percentage = summaryData.data.percentage;
                child.isAbsentYesterday = summaryData.data.absentYesterday ? "yes" : "no";
              }
            } catch (err) {
              console.error('Error fetching child summary:', err);
            }
          }

          setChildren([...transformedChildren]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching children:', error);
        setLoading(false);
      }
    };

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/parent/notifications');
        const result = await response.json();

        if (result.success && result.data) {
          setNotifications(result.data);

          // Extract unique school years and semesters from notifications
          const schoolYears = Array.from(new Set(result.data.map((n: any) => n.schoolYear)));
          const semesters = Array.from(new Set(result.data.map((n: any) => n.semester))) as ("first" | "second")[];

          setAvailableSchoolYears(schoolYears as string[]);
          setAvailableSemesters(semesters);

          // Set first available school year and semester
          if (schoolYears.length > 0) {
            setSelectedSchoolYear(schoolYears[0] as string);
          }
          if (semesters.length > 0) {
            setActiveSemester(semesters[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchChildren();
    fetchNotifications();
  }, []);

  // Fetch detailed data when a child is selected in dashboard view
  useEffect(() => {
    if (view === "dashboard" && selectedChild) {
      const fetchChildDetails = async () => {
        try {
          setChildDetailsLoading(true);

          // Fetch daily records
          const dailyRes = await fetch(`/api/parent/children/${selectedChild.id}/daily`);
          const dailyData = await dailyRes.json();
          if (dailyData.success) {
            setDailyAttendance(dailyData.data || []);
            // Calculate weekly trend from daily data
            setWeeklyTrend(calculateWeeklyTrend(dailyData.data || []));
          }

          // Fetch courses
          const coursesRes = await fetch(`/api/parent/children/${selectedChild.id}/courses`);
          const coursesData = await coursesRes.json();
          if (coursesData.success) {
            setCourseAttendance(coursesData.data || []);
          }

          // Set placeholder data for monthly and quarterly
          setMonthlyData([
            { month: "This Month", percentage: selectedChild.percentage || 0 }
          ]);
          setQuarterlyData([
            { name: "Current Quarter", present: selectedChild.present || 0, late: selectedChild.late || 0, absent: selectedChild.absent || 0 }
          ]);

          // Set selected child data
          setSelectedChildData(selectedChild);

          setChildDetailsLoading(false);
        } catch (error) {
          console.error('Error fetching child details:', error);
          setChildDetailsLoading(false);
        }
      };

      fetchChildDetails();
    }
  }, [view, selectedChild]);

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

  const absentYesterdayCount = children.filter(
    child => child.isAbsentYesterday === "yes"
  ).length

  const overallAttendanceRate =
    totalStudents > 0
      ? (
          children.reduce((sum, child) => sum + child.percentage, 0) /
          totalStudents
        ).toFixed(1)
      : "0.0";

  // For selected child detail view - calculate pie data
  const selectedChildStats = selectedChildData ? {
    present: selectedChildData.present || 0,
    late: selectedChildData.late || 0,
    absent: selectedChildData.absent || 0,
  } : null;

  const pieData = selectedChildStats ? [
    { name: "Present", value: selectedChildStats.present, color: "var(--present)" },
    { name: "Late", value: selectedChildStats.late, color: "var(--late)" },
    { name: "Absent", value: selectedChildStats.absent, color: "var(--absent)" },
  ] : [
    { name: "Present", value: 0, color: "var(--present)" },
    { name: "Late", value: 0, color: "var(--late)" },
    { name: "Absent", value: 0, color: "var(--absent)" },
  ];

  const totalCourses = courseAttendance.length;
  const attendanceAlerts = dailyAttendance.filter(r => r.status === "Late" || r.status === "Absent").length;

  // ==========================
  // COLOR LOGIC
  // ==========================
  const getAttendanceStatus = (rate: number) => {
    if (rate >= 80) return "present";
    if (rate >= 50) return "late";
    return "absent";
  };
  const todayStatus =
  absentYesterdayCount === 0
    ? "present"
    : absentYesterdayCount <= 1
    ? "late"
    : "absent";

  const overallStatus = getAttendanceStatus(Number(overallAttendanceRate));

  const WARNING_THRESHOLD = 50;
  const WARNING_APPROACH = 75; // approaching warning

  const approachingWarningStudents = children.filter(
    child => child.percentage > WARNING_THRESHOLD && child.percentage <= WARNING_APPROACH
  );

  const approachingWarningCount = approachingWarningStudents.length;


  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      alert("Attendance report exported successfully!");
      setIsExporting(false);
    }, 1500);
  };

  // Filters for student records
  const getFilteredChildren = () => {
    let filtered = children;

    if (childRecordFilters.yesterday) {
      filtered = filtered.filter(child => child.isAbsentYesterday === "yes");
    }

    if (childRecordFilters.warning) {
      filtered = filtered.filter(
        child => child.percentage > WARNING_THRESHOLD &&
                child.percentage <= WARNING_APPROACH
      );
    }

    return filtered;
  };

  const filteredChildren = useMemo(() => getFilteredChildren(), [children, childRecordFilters]);

  // Filters for notifications
  const filteredNotifications = useMemo(() => notifications.filter(n =>
    n.schoolYear === selectedSchoolYear &&
    n.semester === activeSemester &&
    (selectedStudent === "all" || n.studentName === selectedStudent)
  ), [notifications, selectedSchoolYear, activeSemester, selectedStudent]);

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
              <div
                key="back"
                className="student-panel-card children"
                style={{
                  background: view === "dashboard"
                    ? "var(--background1)"
                    : undefined
                }}
              >
                <button
                  className="check-info-btn"
                  onClick={() => setView("records")}
                  style={{
                    background: view === "dashboard"
                      ? "var(--background1)"
                      : undefined,

                    color: view === "dashboard"
                      ? "var(--accent1)"
                      : undefined,
                  }}
                >
                  Return to Student Records
                </button>
              </div>


            ]),

        <div
          key="attendance-today"
          className="student-panel-card current"
          style={{
            background: childRecordFilters.yesterday ? "var(--accent1)" : chartColors.absent,
            color: childRecordFilters.yesterday ? "var(--background1)" : "var(--foreground1)",
            border: childRecordFilters.yesterday ? "3px solid white" : "3px solid transparent",
          }}
          onClick={() => setChildRecordFilters(prev => ({ yesterday: !prev.yesterday, warning: false }))}
        >
          <CalendarIcon className="student-panel-icon" />
          <div className="student-panel-content">
            <div className="student-panel-label">Absent Yesterday</div>
            <div className="student-panel-value">{absentYesterdayCount}</div>
            <div className="student-panel-sub">
              Students who were absent yesterday
            </div>
          </div>
        </div>,

        <div
          key="approaching-warning"
          className="student-panel-card overall"
          style={{
            background: childRecordFilters.warning ? "var(--accent1)" : chartColors.late,
            color: childRecordFilters.warning ? "var(--background1)" : "var(--accent1)",
            border: childRecordFilters.warning ? "3px solid white" : "3px solid transparent",
          }}
          onClick={() => setChildRecordFilters(prev => ({ warning: !prev.warning, yesterday: false }))}
        >
          <ExclamationTriangleIcon className="student-panel-icon" />

          <div className="student-panel-content">
            <div className="student-panel-label">
              Students Approaching Warning Level
            </div>

            <div className="student-panel-value">
              {approachingWarningCount}
            </div>

            <div className="student-panel-sub">
              Attendance nearing 50% threshold
            </div>
          </div>
        </div>,
      ],
        content:
          view === "records" ? (
            <div className="parent-records-wrapper">
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>Loading children...</div>
              ) : (
              <div className="parent-records-grid"
                  ref={dragScroll.ref}
                  onMouseDown={dragScroll.onMouseDown}
                  onMouseUp={dragScroll.onMouseUp}
                  onMouseLeave={dragScroll.onMouseLeave}
                  onMouseMove={dragScroll.onMouseMove}
                >
                {filteredChildren.map((child) => (
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
                        <div><strong>Course:</strong> {child.today.course}</div>
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
              )}
            </div>
          ) : (
            <div className="student-main-container">
              {childDetailsLoading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>Loading child details...</div>
              ) : (
              <div className="student-split-layout">

                {/* LEFT */}
                <div className="student-courses-card-left">
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
                          {selectedChildData?.name || 'Loading...'}
                        </div>
                      </div>
                      <div>
                        <div className="student-info-field-label">
                          Student ID
                        </div>
                        <div className="student-info-field-value">
                          {selectedChildData?.id || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="student-info-field-label">
                          Grade Level
                        </div>
                        <div className="student-info-field-value">
                          {selectedChildData?.gradeLevel || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="student-info-field-label">
                          Section
                        </div>
                        <div className="student-info-field-value">
                          {selectedChildData?.section || 'N/A'}
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
                        value={selectedCourse}
                        onChange={(e) =>
                          setSelectedCourse(e.target.value)
                        }
                        className="student-select"
                      >
                        <option value="all">All Courses</option>
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
                <div className="student-courses-card-right">
                  <h3 className="student-courses-title">
                    Attendance by Course
                  </h3>

                  <div className="student-courses-scroll">
                    <table className="student-courses-table">
                      <thead>
                        <tr>
                          <th>Course</th>
                          <th className="center">Present</th>
                          <th className="center">Late</th>
                          <th className="center">Absent</th>
                          <th className="center">Attendance Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseAttendance.map((courseItem, index) => (
                          <tr key={index}>
                            <td className="course-name">
                              {courseItem.course}
                            </td>
                            <td className="center">
                              <span className="student-status-badge present">
                                {courseItem.present}
                              </span>
                            </td>
                            <td className="center">
                              <span className="student-status-badge late">
                                {courseItem.late}
                              </span>
                            </td>
                            <td className="center">
                              <span className="student-status-badge absent">
                                {courseItem.absent}
                              </span>
                            </td>
                            <td className="center">
                              <div className="student-progress-container">
                                <div className="student-progress-bar">
                                  <div
                                    className={`student-progress-fill ${
                                      courseItem.percentage >= 95
                                        ? "good"
                                        : courseItem.percentage >= 85
                                        ? "warning"
                                        : "danger"
                                    }`}
                                    style={{
                                      width: `${courseItem.percentage}%`,
                                    }}
                                  />
                                </div>
                                <span className="student-progress-text">
                                  {courseItem.percentage}%
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
          ),
        },
        {
            label: "Notifications",
            Icon: BellIcon,
            panels: [
                <div key="total-courses" className="student-panel-card notifications">
                <BookmarkIcon className="student-panel-icon" />
                <div className="student-panel-content">
                    <div className="student-panel-label">Total Unread Notifications</div>
                    <div className="student-panel-value">{totalCourses}</div>
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
                      {notifications.length > 0 && (
                      <div className="notifications-tabs">
                        {/* School Year */}
                        <select
                          className="notif-dropdown"
                          value={selectedSchoolYear}
                          onChange={(e) => setSelectedSchoolYear(e.target.value)}
                        >
                          {availableSchoolYears.map((year) => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>

                        {/* Semester */}
                        <select
                          className="notif-dropdown"
                          value={activeSemester}
                          onChange={(e) =>
                            setActiveSemester(e.target.value as "first" | "second")
                          }
                        >
                          {availableSemesters.map((sem) => (
                            <option key={sem} value={sem}>{sem === 'first' ? '1st Semester' : '2nd Semester'}</option>
                          ))}
                        </select>

                        {/* Student */}
                        <select
                          className="notif-dropdown"
                          value={selectedStudent}
                          onChange={(e) => setSelectedStudent(e.target.value)}
                        >
                          <option value="all">All Students</option>

                          {children.map((child) => (
                            <option key={child.id} value={child.name}>
                              {child.name}
                            </option>
                          ))}

                        </select>
                      </div>
                      )}

                    <div className="notifications-scroll">
                    {filteredNotifications.length === 0 ? (
                        <div className="notifications-empty">
                        No notifications for this semester
                        </div>
                    ) : (
                        filteredNotifications.map((n, i) => (
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
                                {n.studentName} - {n.course}
                                </div>

                                <div className="notification-title-row">
                                <span className="notification-title">{n.course}</span>
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

                    <div className="preview-course">
                        {selectedNotification.course}
                    </div>

                    <div className="preview-prof">
                        {selectedNotification.prof}
                    </div>

                    <div className="preview-student">
                      {selectedNotification.studentName}
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
