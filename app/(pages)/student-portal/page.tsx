"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  chartColors,
} from "./constants";

function getLateReason(record: any) {
  if (record.status !== "Late") return "";

  return `Arrival recorded at (${record.recordedTime}), exceeding the 15 minute grace period (${record.classStart}).`;
}

const wanton = 1;
export default function Student() {
  const [selectedView, setSelectedView] = useState<
    "daily" | "weekly" | "monthly" | "quarterly"
  >("daily");

  const [selectedCourse, setSelectedCourse] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [exportMonth, setExportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activeTab, setActiveTab] = useState<
    "overview" | "analytics" | "courses"
  >("overview");

  // 👉 notifications specific
  const [activeSemester, setActiveSemester] = useState<"first" | "second">("first");

  const [selectedNotification, setSelectedNotification] =
    useState<any>(null);

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
    totalCourses: 0
  });

  const [courseAttendance, setCourseAttendance] = useState<Array<{
    courseId: string;
    course: string;
    present: number;
    late: number;
    absent: number;
    percentage: number;
  }>>([]);

  const [isLoading, setIsLoading] = useState(true);
  
  // Attendance trends data
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  // Database-driven data (previously hardcoded constants)
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [dbAppeals, setDbAppeals] = useState<any[]>([]);
  const [isLoadingDynamicData, setIsLoadingDynamicData] = useState(false);

  // Student Appeal - filter records where status is LATE or ABSENT
  const appealableRecords = dailyRecords.filter(
    (record) => record.status === "Late" || record.status === "Absent"
  );

  // Appeal stats
  const availableAppealsCount = appealableRecords.length;

  const pendingAppealsCount = dbAppeals.filter(
    appeal => appeal.status === "pending"
  ).length;

  const completedAppealsCount = dbAppeals.filter(
    appeal => appeal.status === "approved" || appeal.status === "rejected"
  ).length;

  const [selectedRecord, setSelectedRecord] = useState<
    (typeof appealableRecords)[number] | null
  >(null);

  const [appeals, setAppeals] = useState(dbAppeals);
  const [records, setRecords] = useState(appealableRecords);
  const [appealReason, setAppealReason] = useState("");

  const handleSubmitAppeal = async () => {
    if (!selectedRecord || !appealReason.trim()) return;

    try {
      // Find the matching record in dailyRecords to get its ID
      const recordId = selectedRecord.id;

      const response = await fetch('/api/student/appeals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record_id: recordId,
          student_reason: appealReason
        })
      });

      const result = await response.json();

      if (result.success) {
        // Add new appeal to the list
        setAppeals(prev => [result.data, ...prev]);
        // Remove from appealable records
        setRecords(prev =>
          prev.filter(r => r.id !== recordId)
        );
        // Clear form
        setSelectedRecord(null);
        setAppealReason("");
      } else {
        alert(result.error || 'Failed to submit appeal');
      }
    } catch (error) {
      console.error('Error submitting appeal:', error);
      alert('Failed to submit appeal. Please try again.');
    }
  };

  // Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const [infoRes, summaryRes, coursesRes] = await Promise.all([
          fetch('/api/student/info'),
          fetch('/api/student/attendance/summary'),
          fetch('/api/student/attendance/courses')
        ]);

        const [infoData, summaryData, coursesData] = await Promise.all([
          infoRes.json(),
          summaryRes.json(),
          coursesRes.json()
        ]);

        if (infoData.success) {
          setStudentData(infoData.data);
        }

        if (summaryData.success) {
          setAttendanceSummary(summaryData.data);
        }

        if (coursesData.success) {
          setCourseAttendance(coursesData.data);
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

        if (selectedCourse && selectedCourse !== 'all') {
          params.append('course', selectedCourse);
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
  }, [selectedView, selectedCourse]);

  // Fetch dynamic data from new database-driven endpoints
  useEffect(() => {
    const fetchDynamicData = async () => {
      setIsLoadingDynamicData(true);
      try {
        const [dailyRes, notifRes, appealsRes] = await Promise.all([
          fetch('/api/student/attendance/daily'),
          fetch('/api/student/notifications'),
          fetch('/api/student/appeals')
        ]);

        const [dailyData, notifData, appealsData] = await Promise.all([
          dailyRes.json(),
          notifRes.json(),
          appealsRes.json()
        ]);

        if (dailyData.success) {
          setDailyRecords(dailyData.data);
        }

        if (notifData.success) {
          setAllNotifications(notifData.data);
        }

        if (appealsData.success) {
          setDbAppeals(appealsData.data);
        }
      } catch (error) {
        console.error('Error fetching dynamic data:', error);
      } finally {
        setIsLoadingDynamicData(false);
      }
    };

    fetchDynamicData();
  }, []);

  const { presentDays, lateDays, absentDays, totalDays, attendanceRate, totalCourses } = attendanceSummary;

  // Calculate attendance alerts and warnings from notifications
  const attendanceAlerts = allNotifications.filter(n => n.type === 'late' || n.type === 'absent').length;
  const warnings = allNotifications.filter(n => n.type === 'warning').length;

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

  // Helper function to get current semester info (matches teacher portal)
  const getCurrentSemester = () => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    
    if ((month === 6 && day >= 7) || month === 7 || month === 8) {
      return { semester: '1st Semester', quarter: 'Q1', range: 'July 7 - September 30' };
    }
    if (month === 9 || month === 10) {
      return { semester: '1st Semester', quarter: 'Q2', range: 'October 1 - November 30' };
    }
    if (month === 11 || month === 0 || month === 1) {
      return { semester: '2nd Semester', quarter: 'Q3', range: 'December 1 - February 28' };
    }
    if (month === 2 || (month === 3 && day <= 14)) {
      return { semester: '2nd Semester', quarter: 'Q4', range: 'March 1 - April 14' };
    }
    if ((month === 3 && day > 14) || month === 4 || month === 5 || (month === 6 && day < 7)) {
      return { semester: 'Summer Break', quarter: '', range: 'April 15 - July 6' };
    }
    return { semester: '2nd Semester', quarter: 'Q3', range: 'December 1 - February 28' };
  };

  const currentSemesterInfo = getCurrentSemester();

  const handleExport = async (monthOverride?: string, format: 'excel' | 'pdf' = 'excel') => {
    setIsExporting(true);
    setShowExportPicker(false);
    try {
      const picked = monthOverride || exportMonth;
      const [yearStr, monthStr] = picked.split('-');
      const selectedExportMonth = parseInt(monthStr);
      const selectedExportYear = parseInt(yearStr);

      // Fetch SF2-style data from API
      const response = await fetch(
        `/api/student/attendance/sf2?month=${selectedExportMonth}&year=${selectedExportYear}`
      );
      const result = await response.json();

      if (!result.success) {
        alert(result.error || 'Failed to fetch attendance data.');
        return;
      }

      const sf2 = result.data;
      const courses = sf2.courses;
      const schoolDays: number[] = sf2.schoolDays;
      const detectionLog = sf2.detectionLog;
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // All days of the month (1..28/29/30/31) excluding Sundays for fixed column layout
      const daysInMonth = new Date(sf2.year, sf2.monthNum, 0).getDate();
      const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(
        day => new Date(sf2.year, sf2.monthNum - 1, day).getDay() !== 0
      );

      if (format === 'pdf') {
        // ═══════════════════════════════════════════════════
        // ── PDF Export (SF2-style) ──
        // ═══════════════════════════════════════════════════
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const mL = 12, mR = 12;
        const contentW = pageW - mL - mR;
        let curY = 10;

        const navy: [number, number, number] = [31, 47, 87];
        const green: [number, number, number] = [15, 157, 88];
        const yellow: [number, number, number] = [244, 180, 0];
        const red: [number, number, number] = [219, 68, 55];
        const gray: [number, number, number] = [130, 130, 130];
        const darkText: [number, number, number] = [51, 51, 51];
        const lightBg: [number, number, number] = [245, 247, 250];

        // Helper: draw a page footer
        const drawFooter = (pageNum: number, totalPages: number) => {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(170, 170, 170);
          doc.text(`Attendance Report — ${sf2.studentName} — ${sf2.month} ${sf2.year}`, mL, pageH - 6);
          doc.text(`Page ${pageNum} of ${totalPages}`, pageW - mR, pageH - 6, { align: 'right' });
          doc.text('Generated by SAMS (Student Attendance Management System)', pageW / 2, pageH - 6, { align: 'center' });
        };

        // ════════════════════════════════════════════════════
        // ── PAGE 1: Daily Attendance Report ──
        // ════════════════════════════════════════════════════

        // Navy header bar
        doc.setFillColor(...navy);
        doc.rect(0, 0, pageW, 18, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Student Daily Attendance Report', pageW / 2, 11, { align: 'center' });
        curY = 24;

        // Header info — two-column layout
        doc.setFontSize(9);
        const leftPairs: [string, string][] = [
          ['School:', 'Malayan Colleges Laguna'],
          ['Student Name:', sf2.studentName],
          ['Grade & Section:', `${sf2.gradeLevel} — Section ${sf2.section}`],
        ];
        const rightPairs: [string, string][] = [
          ['Report Month:', `${sf2.month} ${sf2.year}`],
          ['Total Courses:', String(sf2.totalCourses)],
          ['Date Generated:', dateStr],
        ];
        const colMid = pageW / 2 + 10;
        leftPairs.forEach(([label, value], idx) => {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...navy);
          doc.text(label, mL, curY + idx * 5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...darkText);
          doc.text(value, mL + 32, curY + idx * 5);
        });
        rightPairs.forEach(([label, value], idx) => {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...navy);
          doc.text(label, colMid, curY + idx * 5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...darkText);
          doc.text(value, colMid + 28, curY + idx * 5);
        });
        curY += leftPairs.length * 5 + 3;

        // ── SF2 Attendance Table (courses as rows, days as columns) ──
        const dayOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const sf2Head = [
          [
            { content: 'No.', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'COURSE', rowSpan: 2, styles: { halign: 'left' as const, valign: 'middle' as const } },
            ...allDays.map(d => ({ content: String(d), styles: { halign: 'center' as const } })),
            { content: 'P', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'L', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'A', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'ND', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: '%', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
          ],
          allDays.map(d => {
            const date = new Date(sf2.year, sf2.monthNum - 1, d);
            return { content: dayOfWeekNames[date.getDay()], styles: { halign: 'center' as const, fontSize: 5.5, textColor: [100, 100, 100] } };
          }),
        ];

        const totalCols = 2 + allDays.length + 5;
        const fixedNameW = Math.min(50, Math.max(35, contentW * 0.18));
        const fixedSumW = 9;
        const fixedNoW = 7;
        const remainingW = contentW - fixedNoW - fixedNameW - fixedSumW * 5;
        const dayCW = Math.max(5, remainingW / allDays.length);

        const sf2Body = courses.map((course: any, i: number) => {
          const totalRecorded = course.actualRecords ?? (course.totalPresent + course.totalLate + course.totalAbsent);
          const pct = totalRecorded > 0 ? ((course.totalPresent / totalRecorded) * 100).toFixed(1) + '%' : 'N/A';
          const nd = course.totalNoDetection ?? 0;
          return [
            { content: String(i + 1), styles: { halign: 'center' as const, textColor: gray } },
            course.courseName,
            ...allDays.map((d: number) => {
              const status = course.dailyStatus[String(d)];
              if (status === 'P') return { content: 'P', styles: { halign: 'center' as const, textColor: green, fontStyle: 'bold' as const } };
              if (status === 'L') return { content: 'L', styles: { halign: 'center' as const, textColor: yellow, fontStyle: 'bold' as const } };
              if (status === 'A') return { content: 'A', styles: { halign: 'center' as const, textColor: red, fontStyle: 'bold' as const } };
              if (status === 'ND') return { content: '-', styles: { halign: 'center' as const, textColor: gray } };
              return { content: '', styles: { halign: 'center' as const } };
            }),
            { content: String(course.totalPresent), styles: { halign: 'center' as const, textColor: green, fontStyle: 'bold' as const } },
            { content: String(course.totalLate), styles: { halign: 'center' as const, textColor: yellow, fontStyle: 'bold' as const } },
            { content: String(course.totalAbsent), styles: { halign: 'center' as const, textColor: red, fontStyle: 'bold' as const } },
            { content: String(nd), styles: { halign: 'center' as const, textColor: gray } },
            { content: pct, styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
          ];
        });

        // Summary rows
        const dailyP: number[] = [], dailyL: number[] = [], dailyA: number[] = [], dailyND: number[] = [];
        let gP = 0, gL = 0, gA = 0, gND = 0;
        for (const day of allDays) {
          let dP = 0, dL = 0, dA = 0, dND = 0;
          for (const c of courses) {
            const st = c.dailyStatus[String(day)];
            if (st === 'P') dP++;
            else if (st === 'L') dL++;
            else if (st === 'A') dA++;
            else if (st === 'ND') dND++;
          }
          dailyP.push(dP); dailyL.push(dL); dailyA.push(dA); dailyND.push(dND);
          gP += dP; gL += dL; gA += dA; gND += dND;
        }

        const summaryFill: [number, number, number] = [235, 239, 244];
        sf2Body.push(
          [
            { content: '', styles: { fillColor: summaryFill } },
            { content: 'Total Present', styles: { fontStyle: 'bold' as const, fillColor: summaryFill } },
            ...dailyP.map(v => ({ content: String(v), styles: { halign: 'center' as const, textColor: green, fontStyle: 'bold' as const, fillColor: summaryFill } })),
            { content: String(gP), styles: { halign: 'center' as const, textColor: green, fontStyle: 'bold' as const, fillColor: [220, 237, 222] as [number, number, number] } },
            { content: '', styles: { fillColor: summaryFill } },
            { content: '', styles: { fillColor: summaryFill } },
            { content: '', styles: { fillColor: summaryFill } },
            { content: '', styles: { fillColor: summaryFill } },
          ],
          [
            { content: '', styles: { fillColor: summaryFill } },
            { content: 'Total Late', styles: { fontStyle: 'bold' as const, fillColor: summaryFill } },
            ...dailyL.map(v => ({ content: String(v), styles: { halign: 'center' as const, textColor: yellow, fontStyle: 'bold' as const, fillColor: summaryFill } })),
            { content: '', styles: { fillColor: summaryFill } },
            { content: String(gL), styles: { halign: 'center' as const, textColor: yellow, fontStyle: 'bold' as const, fillColor: [255, 243, 205] as [number, number, number] } },
            { content: '', styles: { fillColor: summaryFill } },
            { content: '', styles: { fillColor: summaryFill } },
            { content: '', styles: { fillColor: summaryFill } },
          ],
          [
            { content: '', styles: { fillColor: summaryFill } },
            { content: 'Total Absent', styles: { fontStyle: 'bold' as const, fillColor: summaryFill } },
            ...dailyA.map(v => ({ content: String(v), styles: { halign: 'center' as const, textColor: red, fontStyle: 'bold' as const, fillColor: summaryFill } })),
            { content: '', styles: { fillColor: summaryFill } },
            { content: '', styles: { fillColor: summaryFill } },
            { content: String(gA), styles: { halign: 'center' as const, textColor: red, fontStyle: 'bold' as const, fillColor: [255, 228, 230] as [number, number, number] } },
            { content: '', styles: { fillColor: summaryFill } },
            { content: '', styles: { fillColor: summaryFill } },
          ],
          [
            { content: '', styles: { fillColor: summaryFill } },
            { content: 'No Detection', styles: { fontStyle: 'bold' as const, fillColor: summaryFill, textColor: gray } },
            ...dailyND.map(v => ({ content: String(v), styles: { halign: 'center' as const, textColor: gray, fontStyle: 'bold' as const, fillColor: summaryFill } })),
            { content: '', styles: { fillColor: summaryFill } },
            { content: '', styles: { fillColor: summaryFill } },
            { content: '', styles: { fillColor: summaryFill } },
            { content: String(gND), styles: { halign: 'center' as const, textColor: gray, fontStyle: 'bold' as const, fillColor: [232, 232, 232] as [number, number, number] } },
            { content: '', styles: { fillColor: summaryFill } },
          ]
        );

        autoTable(doc, {
          startY: curY,
          head: sf2Head as any,
          body: sf2Body as any,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1.5, lineColor: [180, 180, 180], lineWidth: 0.15 },
          headStyles: { fillColor: navy, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold', halign: 'center', cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: fixedNoW, halign: 'center' },
            1: { cellWidth: fixedNameW },
            ...Object.fromEntries(allDays.map((_, i) => [i + 2, { cellWidth: dayCW }])),
            [2 + allDays.length]: { cellWidth: fixedSumW },
            [3 + allDays.length]: { cellWidth: fixedSumW },
            [4 + allDays.length]: { cellWidth: fixedSumW },
            [5 + allDays.length]: { cellWidth: fixedSumW },
            [6 + allDays.length]: { cellWidth: fixedSumW },
          },
          alternateRowStyles: { fillColor: [248, 250, 253] },
          margin: { left: mL, right: mR },
          tableWidth: contentW,
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.row.index >= courses.length) {
              if (!data.cell.styles.fillColor || (Array.isArray(data.cell.styles.fillColor) && data.cell.styles.fillColor[0] === 248)) {
                data.cell.styles.fillColor = summaryFill;
              }
            }
          },
        });

        curY = (doc as any).lastAutoTable.finalY + 4;

        // Info strip
        doc.setFillColor(...lightBg);
        doc.roundedRect(mL, curY, contentW, 10, 1.5, 1.5, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...navy);
        doc.text(`Total Courses: ${sf2.totalCourses}     |     School Days: ${sf2.totalSchoolDays}     |     Legend:  P = Present    L = Late    A = Absent    - = No Detection`, mL + 4, curY + 6);


        // ════════════════════════════════════════════════════
        // ── PAGE 2: Detection Log ──
        // ════════════════════════════════════════════════════
        if (detectionLog.length > 0) {
          doc.addPage();
          curY = 10;

          // Navy header bar
          doc.setFillColor(...navy);
          doc.rect(0, 0, pageW, 14, 'F');
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('Detection Log', pageW / 2, 9, { align: 'center' });
          curY = 18;

          // Subtitle
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...darkText);
          doc.text(`${sf2.studentName} — ${sf2.month} ${sf2.year}`, pageW / 2, curY, { align: 'center' });
          curY += 6;

          const detHead = [['#', 'Course', 'Date', 'Time', 'Status', 'Confidence']];
          const detBody = detectionLog.map((rec: any, i: number) => {
            const confStr = rec.confidence != null ? `${(rec.confidence * 100).toFixed(1)}%` : 'N/A';
            const statusColor = rec.status === 'Present' ? green : rec.status === 'Late' ? yellow : red;
            return [
              { content: String(i + 1), styles: { halign: 'center' as const, textColor: gray } },
              rec.courseName,
              rec.date,
              rec.time,
              { content: rec.status, styles: { halign: 'center' as const, textColor: statusColor, fontStyle: 'bold' as const } },
              { content: confStr, styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
            ];
          });

          autoTable(doc, {
            startY: curY,
            head: detHead,
            body: detBody as any,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [180, 180, 180], lineWidth: 0.15 },
            headStyles: { fillColor: navy, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center', cellPadding: 2.5 },
            columnStyles: {
              0: { cellWidth: 10, halign: 'center' },
              1: { cellWidth: contentW * 0.30 },
              2: { cellWidth: contentW * 0.16 },
              3: { cellWidth: contentW * 0.16 },
              4: { cellWidth: contentW * 0.13, halign: 'center' },
              5: { cellWidth: contentW * 0.13, halign: 'center' },
            },
            alternateRowStyles: { fillColor: [248, 250, 253] },
            margin: { left: mL, right: mR },
            tableWidth: contentW,
          });
        }

        // Draw footers on all pages
        const totalPages = doc.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
          doc.setPage(p);
          drawFooter(p, totalPages);
        }

        const safeName = sf2.studentName.replace(/[^a-z0-9]/gi, '_');
        doc.save(`Attendance_Report_${safeName}_${sf2.month}_${sf2.year}.pdf`);

      } else {
        // ═══════════════════════════════════════════════════
        // ── Excel Export (SF2-style) ──
        // ═══════════════════════════════════════════════════
        const wb = XLSX.utils.book_new();

        // ── Sheet 1: SF2 Attendance ──
        const ws: XLSX.WorkSheet = {};
        const merges: XLSX.Range[] = [];
        let R = 0;

        const setCell = (r: number, c: number, v: any, s?: any) => {
          const addr = XLSX.utils.encode_cell({ r, c });
          ws[addr] = { v, t: typeof v === 'number' ? 'n' : 's', s };
        };

        const border = {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        };
        const titleStyle = {
          font: { bold: true, sz: 14, color: { rgb: '1F2F57' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
        const headerLabelStyle = { font: { bold: true, sz: 11, color: { rgb: '333333' } } };
        const headerValueStyle = { font: { sz: 11, color: { rgb: '4F4F4F' } } };
        const colHeaderStyle = {
          font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1F2F57' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border,
        };
        const dayOfWeekStyle = {
          font: { italic: true, sz: 8, color: { rgb: '888888' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border,
          fill: { fgColor: { rgb: 'F0F0F0' } },
        };
        const numCellStyle = { alignment: { horizontal: 'center', vertical: 'center' }, border };
        const nameCellStyle = { font: { sz: 10, color: { rgb: '333333' } }, alignment: { vertical: 'center' }, border };
        const presentCellStyle = { font: { bold: true, sz: 10, color: { rgb: '0F9D58' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
        const lateCellStyle = { font: { bold: true, sz: 10, color: { rgb: 'F4B400' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
        const absentCellStyle = { font: { bold: true, sz: 10, color: { rgb: 'DB4437' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
        const noDetectionCellStyle = { font: { sz: 10, color: { rgb: '999999' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
        const emptyCellStyle = { alignment: { horizontal: 'center', vertical: 'center' }, border };
        const summaryHeaderStyle = { font: { bold: true, sz: 10, color: { rgb: '1F2F57' } }, fill: { fgColor: { rgb: 'EBEEF4' } }, alignment: { vertical: 'center' }, border };
        const summaryValueStyle = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: 'EBEEF4' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
        const pctStyle = { font: { bold: true, sz: 10, color: { rgb: '1F2F57' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
        const footerLabelStyle = { font: { bold: true, sz: 10, color: { rgb: '555555' } } };
        const footerValueStyle = { font: { sz: 10, color: { rgb: '333333' } }, border };

        const totalExcelCols = 2 + allDays.length + 5;

        // Row 0: Title
        setCell(R, 0, 'Student Daily Attendance Report', titleStyle);
        merges.push({ s: { r: R, c: 0 }, e: { r: R, c: totalExcelCols - 1 } });
        R += 2;

        // Row 2: Student Name
        setCell(R, 0, 'Student Name:', headerLabelStyle);
        setCell(R, 1, sf2.studentName, headerValueStyle);
        R++;
        // Row 3: Grade & Section
        setCell(R, 0, 'Grade & Section:', headerLabelStyle);
        setCell(R, 1, `${sf2.gradeLevel} — Section ${sf2.section}`, headerValueStyle);
        R++;
        // Row 4: Report Month
        setCell(R, 0, 'Report Month:', headerLabelStyle);
        setCell(R, 1, `${sf2.month} ${sf2.year}`, headerValueStyle);
        R++;
        // Row 5: School
        setCell(R, 0, 'School:', headerLabelStyle);
        setCell(R, 1, 'Malayan Colleges Laguna', headerValueStyle);
        R++;
        // Row 6: Blank
        R++;

        // ── Table Header Row ──
        const headerRowIdx = R;
        setCell(R, 0, 'No.', colHeaderStyle);
        setCell(R, 1, 'COURSE', colHeaderStyle);
        for (let d = 0; d < allDays.length; d++) {
          setCell(R, 2 + d, allDays[d], colHeaderStyle);
        }
        const tpCol = 2 + allDays.length;
        setCell(R, tpCol, 'Total Present', colHeaderStyle);
        setCell(R, tpCol + 1, 'Total Late', colHeaderStyle);
        setCell(R, tpCol + 2, 'Total Absent', colHeaderStyle);
        setCell(R, tpCol + 3, 'No Detection', colHeaderStyle);
        setCell(R, tpCol + 4, '% Attendance', colHeaderStyle);
        R++;

        // ── Day-of-week sub-header ──
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        setCell(R, 0, '', dayOfWeekStyle);
        setCell(R, 1, '', dayOfWeekStyle);
        for (let d = 0; d < allDays.length; d++) {
          const date = new Date(sf2.year, sf2.monthNum - 1, allDays[d]);
          setCell(R, 2 + d, dayNames[date.getDay()], dayOfWeekStyle);
        }
        setCell(R, tpCol, '', dayOfWeekStyle);
        setCell(R, tpCol + 1, '', dayOfWeekStyle);
        setCell(R, tpCol + 2, '', dayOfWeekStyle);
        setCell(R, tpCol + 3, '', dayOfWeekStyle);
        setCell(R, tpCol + 4, '', dayOfWeekStyle);
        R++;

        // ── Course data rows ──
        for (let i = 0; i < courses.length; i++) {
          const course = courses[i];
          const isEven = i % 2 === 0;
          const rowBg = isEven ? 'FFFFFF' : 'F8FAFB';

          const numStyle = { ...numCellStyle, fill: { fgColor: { rgb: rowBg } }, font: { sz: 10, color: { rgb: '828282' } } };
          const nameStyle = { ...nameCellStyle, fill: { fgColor: { rgb: rowBg } } };

          setCell(R, 0, i + 1, numStyle);
          setCell(R, 1, course.courseName, nameStyle);

          for (let d = 0; d < allDays.length; d++) {
            const status = course.dailyStatus[String(allDays[d])];
            if (status === 'P') {
              setCell(R, 2 + d, '✓', { ...presentCellStyle, fill: { fgColor: { rgb: rowBg } } });
            } else if (status === 'L') {
              setCell(R, 2 + d, 'L', { ...lateCellStyle, fill: { fgColor: { rgb: rowBg } } });
            } else if (status === 'A') {
              setCell(R, 2 + d, '✗', { ...absentCellStyle, fill: { fgColor: { rgb: rowBg } } });
            } else if (status === 'ND') {
              setCell(R, 2 + d, '—', { ...noDetectionCellStyle, fill: { fgColor: { rgb: isEven ? 'F0F0F0' : 'E8E8E8' } } });
            } else {
              setCell(R, 2 + d, '', { ...emptyCellStyle, fill: { fgColor: { rgb: rowBg } } });
            }
          }

          const totalRecorded = course.actualRecords ?? (course.totalPresent + course.totalLate + course.totalAbsent);
          const attendancePct = totalRecorded > 0 ? `${((course.totalPresent / totalRecorded) * 100).toFixed(1)}%` : 'N/A';
          const nd = course.totalNoDetection ?? 0;

          setCell(R, tpCol, course.totalPresent, { ...presentCellStyle, fill: { fgColor: { rgb: rowBg } } });
          setCell(R, tpCol + 1, course.totalLate, { ...lateCellStyle, fill: { fgColor: { rgb: rowBg } } });
          setCell(R, tpCol + 2, course.totalAbsent, { ...absentCellStyle, fill: { fgColor: { rgb: rowBg } } });
          setCell(R, tpCol + 3, nd, { ...noDetectionCellStyle, fill: { fgColor: { rgb: rowBg } } });
          setCell(R, tpCol + 4, attendancePct, { ...pctStyle, fill: { fgColor: { rgb: rowBg } } });
          R++;
        }

        // ── Summary rows ──
        R++; // blank separator
        let grandPresent = 0, grandLate = 0, grandAbsent = 0, grandND = 0;
        const xlDailyP: number[] = [], xlDailyL: number[] = [], xlDailyA: number[] = [], xlDailyND: number[] = [];

        for (const day of allDays) {
          let dayP = 0, dayL = 0, dayA = 0, dayND = 0;
          for (const course of courses) {
            const status = course.dailyStatus[String(day)];
            if (status === 'P') dayP++;
            else if (status === 'L') dayL++;
            else if (status === 'A') dayA++;
            else if (status === 'ND') dayND++;
          }
          xlDailyP.push(dayP); xlDailyL.push(dayL); xlDailyA.push(dayA); xlDailyND.push(dayND);
          grandPresent += dayP; grandLate += dayL; grandAbsent += dayA; grandND += dayND;
        }

        // Total Present row
        setCell(R, 0, '', summaryHeaderStyle);
        setCell(R, 1, 'Total Present', summaryHeaderStyle);
        for (let d = 0; d < allDays.length; d++) {
          setCell(R, 2 + d, xlDailyP[d], { ...summaryValueStyle, font: { bold: true, sz: 10, color: { rgb: '0F9D58' } } });
        }
        setCell(R, tpCol, grandPresent, { ...summaryValueStyle, font: { bold: true, sz: 11, color: { rgb: '0F9D58' } } });
        setCell(R, tpCol + 1, '', summaryValueStyle); setCell(R, tpCol + 2, '', summaryValueStyle);
        setCell(R, tpCol + 3, '', summaryValueStyle); setCell(R, tpCol + 4, '', summaryValueStyle);
        R++;

        // Total Late row
        setCell(R, 0, '', summaryHeaderStyle);
        setCell(R, 1, 'Total Late', summaryHeaderStyle);
        for (let d = 0; d < allDays.length; d++) {
          setCell(R, 2 + d, xlDailyL[d], { ...summaryValueStyle, font: { bold: true, sz: 10, color: { rgb: 'F4B400' } } });
        }
        setCell(R, tpCol, '', summaryValueStyle);
        setCell(R, tpCol + 1, grandLate, { ...summaryValueStyle, font: { bold: true, sz: 11, color: { rgb: 'F4B400' } } });
        setCell(R, tpCol + 2, '', summaryValueStyle); setCell(R, tpCol + 3, '', summaryValueStyle);
        setCell(R, tpCol + 4, '', summaryValueStyle);
        R++;

        // Total Absent row
        setCell(R, 0, '', summaryHeaderStyle);
        setCell(R, 1, 'Total Absent', summaryHeaderStyle);
        for (let d = 0; d < allDays.length; d++) {
          setCell(R, 2 + d, xlDailyA[d], { ...summaryValueStyle, font: { bold: true, sz: 10, color: { rgb: 'DB4437' } } });
        }
        setCell(R, tpCol, '', summaryValueStyle); setCell(R, tpCol + 1, '', summaryValueStyle);
        setCell(R, tpCol + 2, grandAbsent, { ...summaryValueStyle, font: { bold: true, sz: 11, color: { rgb: 'DB4437' } } });
        setCell(R, tpCol + 3, '', summaryValueStyle); setCell(R, tpCol + 4, '', summaryValueStyle);
        R++;

        // No Detection row
        setCell(R, 0, '', summaryHeaderStyle);
        setCell(R, 1, 'No Detection', { ...summaryHeaderStyle, font: { bold: true, sz: 10, color: { rgb: '999999' } } });
        for (let d = 0; d < allDays.length; d++) {
          setCell(R, 2 + d, xlDailyND[d], { ...summaryValueStyle, font: { bold: true, sz: 10, color: { rgb: '999999' } } });
        }
        setCell(R, tpCol, '', summaryValueStyle); setCell(R, tpCol + 1, '', summaryValueStyle);
        setCell(R, tpCol + 2, '', summaryValueStyle);
        setCell(R, tpCol + 3, grandND, { font: { bold: true, sz: 11, color: { rgb: '999999' } }, fill: { fgColor: { rgb: 'F0F0F0' } }, alignment: { horizontal: 'center', vertical: 'center' }, border });
        setCell(R, tpCol + 4, '', summaryValueStyle);
        R++;

        // Footer info
        R++;
        setCell(R, 1, 'Total Courses:', footerLabelStyle);
        setCell(R, 2, sf2.totalCourses, footerValueStyle);
        R++;
        setCell(R, 1, 'Total School Days this Month:', footerLabelStyle);
        setCell(R, 2, sf2.totalSchoolDays, footerValueStyle);
        R++;
        R++;

        // Legend
        setCell(R, 0, 'Legend:  ✓ = Present    L = Late    ✗ = Absent    — = No Detection', { font: { sz: 10, italic: true, color: { rgb: '666666' } } });
        R += 2;

        // Sheet config
        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R, c: totalExcelCols - 1 } });
        ws['!merges'] = merges;

        const colWidths: XLSX.ColInfo[] = [
          { wch: 5 },  // No.
          { wch: 32 }, // Course Name
        ];
        for (let i = 0; i < allDays.length; i++) {
          colWidths.push({ wch: 6 });
        }
        colWidths.push({ wch: 14 }); // Total Present
        colWidths.push({ wch: 12 }); // Total Late
        colWidths.push({ wch: 13 }); // Total Absent
        colWidths.push({ wch: 15 }); // No Detection
        colWidths.push({ wch: 14 }); // % Attendance
        ws['!cols'] = colWidths;

        const rowHeights: XLSX.RowInfo[] = [];
        rowHeights[0] = { hpx: 30 };
        rowHeights[headerRowIdx] = { hpx: 32 };
        rowHeights[headerRowIdx + 1] = { hpx: 20 };
        ws['!rows'] = rowHeights;

        XLSX.utils.book_append_sheet(wb, ws, 'SF2');

        // ── Sheet 2: Detection Log ──
        if (detectionLog.length > 0) {
          const ws2: XLSX.WorkSheet = {};
          const merges2: XLSX.Range[] = [];
          let R2 = 0;
          const setCell2 = (r: number, c: number, v: any, s?: any) => {
            const addr = XLSX.utils.encode_cell({ r, c });
            ws2[addr] = { v, t: typeof v === 'number' ? 'n' : 's', s };
          };

          // Title
          setCell2(R2, 0, 'Detection Log', titleStyle);
          merges2.push({ s: { r: R2, c: 0 }, e: { r: R2, c: 5 } });
          R2 += 2;

          // Sub-info
          setCell2(R2, 0, 'Student:', headerLabelStyle);
          setCell2(R2, 1, sf2.studentName, headerValueStyle);
          R2++;
          setCell2(R2, 0, 'Month:', headerLabelStyle);
          setCell2(R2, 1, `${sf2.month} ${sf2.year}`, headerValueStyle);
          R2 += 2;

          // Headers
          const detHeaders = ['#', 'Course', 'Date', 'Time', 'Status', 'Confidence'];
          const detColHdrStyle = { ...colHeaderStyle, alignment: { horizontal: 'center', vertical: 'center' } };
          detHeaders.forEach((h, i) => setCell2(R2, i, h, detColHdrStyle));
          R2++;

          // Data rows
          for (let i = 0; i < detectionLog.length; i++) {
            const rec = detectionLog[i];
            const rowBg = i % 2 === 0 ? 'FFFFFF' : 'F8FAFB';
            const rowFill = { fill: { fgColor: { rgb: rowBg } }, border };
            const cellCtr = { alignment: { horizontal: 'center', vertical: 'center' }, border, fill: { fgColor: { rgb: rowBg } } };

            setCell2(R2, 0, i + 1, { ...cellCtr, font: { sz: 10, color: { rgb: '828282' } } });
            setCell2(R2, 1, rec.courseName, { ...rowFill, font: { sz: 10, color: { rgb: '333333' } }, alignment: { vertical: 'center' } });
            setCell2(R2, 2, rec.date, cellCtr);
            setCell2(R2, 3, rec.time, cellCtr);

            const statusStyle = rec.status === 'Present'
              ? { font: { bold: true, sz: 10, color: { rgb: '0F9D58' } }, ...cellCtr }
              : rec.status === 'Late'
              ? { font: { bold: true, sz: 10, color: { rgb: 'F4B400' } }, ...cellCtr }
              : { font: { bold: true, sz: 10, color: { rgb: 'DB4437' } }, ...cellCtr };
            setCell2(R2, 4, rec.status, statusStyle);

            const confStr = rec.confidence != null ? `${(rec.confidence * 100).toFixed(1)}%` : 'N/A';
            setCell2(R2, 5, confStr, { ...cellCtr, font: { bold: true, sz: 10, color: { rgb: '1F2F57' } } });
            R2++;
          }

          R2++;
          setCell2(R2, 0, `Generated by SAMS — ${dateStr}`, { font: { sz: 9, italic: true, color: { rgb: '999999' } } });
          R2++;

          ws2['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R2, c: 5 } });
          ws2['!merges'] = merges2;
          ws2['!cols'] = [
            { wch: 5 },
            { wch: 35 },
            { wch: 16 },
            { wch: 16 },
            { wch: 12 },
            { wch: 14 },
          ];
          ws2['!rows'] = [{ hpx: 30 }];

          XLSX.utils.book_append_sheet(wb, ws2, 'Detection Log');
        }

        const safeName = sf2.studentName.replace(/[^a-z0-9]/gi, '_');
        XLSX.writeFile(wb, `Attendance_Report_${safeName}_${sf2.month}_${sf2.year}.xlsx`);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export attendance report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SamsTemplate
      links={[
        {
          // OVERVIEW
          label: "Overview",
          Icon: DashboardIcon,
          panels: [
            <div key="total-courses" className="student-panel-card enroll">
              <BookmarkIcon className="student-panel-icon" />
              <div className="student-panel-content">
                <div className="student-panel-label">Total Number of Courses Enrolled</div>
                <div className="student-panel-value">{totalCourses}</div>
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
                        <div className="student-info-field-label">Student Name</div>
                        <div className="student-info-field-value">
                          {isLoading ? "Loading..." : (studentData?.username || "N/A")}
                        </div>
                      </div>
                      <div>
                        <div className="student-info-field-label">Grade Level</div>
                        <div className="student-info-field-value">
                          {isLoading ? "Loading..." : (studentData?.grade_level || "N/A")}
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
                    <h3 className="student-summary-title">
                      Current Semester Summary
                      <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666', marginLeft: '10px' }}>
                        ({currentSemesterInfo.semester} - {currentSemesterInfo.range})
                      </span>
                    </h3>

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
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="teacher-select"
                      >
                        <option value="all">All Courses</option>
                        {courseAttendance.map((courseItem, index) => (
                          <option key={index} value={courseItem.courseId}>{courseItem.course}</option>
                        ))}
                      </select>
                    </div>

                    <div className="teacher-export-wrapper">
                      <button
                        onClick={() => setShowExportPicker(!showExportPicker)}
                        disabled={isExporting}
                        className="teacher-export-btn"
                        title="Download Attendance Report"
                      >
                        <DownloadIcon />
                        {isExporting ? "Exporting..." : "Export"}
                      </button>

                      {showExportPicker && (
                        <div className="teacher-export-popover">
                          <p className="teacher-export-popover-title">Export Attendance Report</p>
                          <label className="teacher-export-popover-label">Select Month</label>
                          <select
                            value={exportMonth}
                            onChange={(e) => setExportMonth(e.target.value)}
                            className="teacher-export-month-select"
                          >
                            {Array.from({ length: 12 }, (_, i) => {
                              const d = new Date();
                              d.setMonth(d.getMonth() - i);
                              const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                              const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                              return <option key={val} value={val}>{label}</option>;
                            })}
                          </select>
                          <label className="teacher-export-popover-label" style={{ marginTop: 6 }}>Select Format</label>
                          <div className="teacher-export-format-btns">
                            <button
                              onClick={() => handleExport(exportMonth, 'excel')}
                              className="teacher-export-popover-confirm teacher-export-excel"
                            >
                              <DownloadIcon /> Excel (.xlsx)
                            </button>
                            <button
                              onClick={() => handleExport(exportMonth, 'pdf')}
                              className="teacher-export-popover-confirm teacher-export-pdf"
                            >
                              <DownloadIcon /> PDF (.pdf)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="teacher-chart-container">
                    <div className="teacher-chart-card">
                      {isLoadingTrends ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                          <p>Loading chart data...</p>
                        </div>
                      ) : (
                      <ResponsiveContainer width="100%" height="80%">
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
                          <BarChart data={trendsData}>
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
                          <BarChart data={trendsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = trendsData.find(d => d.name === label);
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
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT 60% */}
                <div className="student-courses-card-right">
                  <h3 className="student-courses-title">Attendance by Course</h3>
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
                        {isLoading ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                              Loading courses...
                            </td>
                          </tr>
                        ) : courseAttendance.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                              No enrolled courses found
                            </td>
                          </tr>
                        ) : (
                          courseAttendance.map((courseItem, index) => (
                            <tr key={index}>
                              <td className="course-name">{courseItem.course}</td>
                              <td className="center">
                                <span className="student-status-badge present">{courseItem.present}</span>
                              </td>
                              <td className="center">
                                <span className="student-status-badge late">{courseItem.late}</span>
                              </td>
                              <td className="center">
                                <span className="student-status-badge absent">{courseItem.absent}</span>
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
                                      style={{ width: `${courseItem.percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="student-progress-text">
                                    {courseItem.percentage}%
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
                <div className="student-panel-sub">Courses eligible for appeal</div>
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
                              <div className="appeal-item-course">
                                {record.course}
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

                            {record.status === "Late" && (
                              <div className="appeal-item-reason">
                                {getLateReason(record)}
                              </div>
                            )}

                            {record.status === "Absent" && (
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
                            <label>Course</label>
                            <input type="text" value={selectedRecord?.course || ""} readOnly />
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

                                <div className="appeal-history-course">
                                  {appeal.course}
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
                    {allNotifications.filter(n => n.semester === activeSemester).length === 0 ? (
                        <div className="notifications-empty">
                        No notifications for this semester
                        </div>
                    ) : (
                        allNotifications
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
