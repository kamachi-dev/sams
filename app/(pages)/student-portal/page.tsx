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
  studentInfo,
  dailyAttendance,
  weeklyTrend,
  monthlyData,
  quarterlyData,
  notifications,
  courseAttendance,
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
const totalCourses = courseAttendance.length;

function getLateReason(record: any) {
  if (record.status !== "LATE") return "";

  return `Arrival recorded at (${record.recordedTime}), exceeding the 15 minute grace period (${record.classStart}).`;
}


export default function Student() {
  const [selectedView, setSelectedView] = useState<
    "daily" | "weekly" | "monthly" | "quarterly"
  >("daily");

  const [selectedCourse, setSelectedCourse] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "analytics" | "courses"
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
      course: selectedRecord.course,
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
        !(r.course === selectedRecord.course && 
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

  const { presentDays, lateDays, absentDays, totalDays, attendanceRate, totalCourses } = attendanceSummary;

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

  const handleExport = async (format: 'excel' | 'pdf' = 'excel') => {
    setIsExporting(true);
    setShowExportPicker(false);
    try {
      // Gather data already in state
      const name = studentData?.username || 'Student';
      const grade = studentData?.grade_level || 'N/A';
      const section = studentData?.section || 'N/A';
      const { presentDays, lateDays, absentDays, totalDays, attendanceRate } = attendanceSummary;
      const courses = courseAttendance;
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // Fetch detection records from API
      let detectionRecords: { course: string; date: string; time: string; status: string; confidence: number | null }[] = [];
      try {
        const res = await fetch('/api/student/attendance/records');
        const data = await res.json();
        if (data.success) detectionRecords = data.data;
      } catch { /* silently continue without detection data */ }

      if (format === 'pdf') {
        // ═══════════════════════════════════════════════════
        // ── PDF Export ──
        // ═══════════════════════════════════════════════════
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const mL = 14, mR = 14;
        const contentW = pageW - mL - mR;
        let curY = 10;

        const navy: [number, number, number] = [31, 47, 87];
        const green: [number, number, number] = [15, 157, 88];
        const yellow: [number, number, number] = [244, 180, 0];
        const red: [number, number, number] = [219, 68, 55];
        const gray: [number, number, number] = [130, 130, 130];
        const lightBg: [number, number, number] = [245, 247, 250];

        // ── Header Bar ──
        doc.setFillColor(...navy);
        doc.rect(0, 0, pageW, 18, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Student Attendance Report', pageW / 2, 11, { align: 'center' });
        curY = 22;

        // ── Green accent strip ──
        doc.setFillColor(...green);
        doc.rect(0, 18, pageW, 2.5, 'F');
        curY = 24;

        // ── Student Info Section ──
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...navy);
        doc.text('Student Information', mL, curY);
        curY += 2;
        doc.setDrawColor(...green);
        doc.setLineWidth(0.5);
        doc.line(mL, curY, mL + 50, curY);
        curY += 5;

        const infoPairs = [
          ['Student Name:', name],
          ['Grade Level:', grade],
          ['Section:', section],
          ['Semester:', `${currentSemesterInfo.semester} (${currentSemesterInfo.range})`],
          ['Date Generated:', dateStr],
        ];
        doc.setFontSize(9);
        for (const [label, value] of infoPairs) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(80, 80, 80);
          doc.text(label, mL, curY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(50, 50, 50);
          doc.text(value, mL + 38, curY);
          curY += 5;
        }
        curY += 3;

        // ── Attendance Summary Cards ──
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...navy);
        doc.text('Attendance Summary', mL, curY);
        curY += 2;
        doc.setDrawColor(...green);
        doc.line(mL, curY, mL + 50, curY);
        curY += 4;

        const cardW = (contentW - 12) / 4;
        const cardH = 18;
        const cards: { label: string; value: string; color: [number, number, number] }[] = [
          { label: 'Present', value: String(presentDays), color: green },
          { label: 'Late', value: String(lateDays), color: yellow },
          { label: 'Absent', value: String(absentDays), color: red },
          { label: 'Attendance Rate', value: `${attendanceRate}%`, color: navy },
        ];
        for (let i = 0; i < cards.length; i++) {
          const x = mL + i * (cardW + 4);
          doc.setFillColor(...lightBg);
          doc.roundedRect(x, curY, cardW, cardH, 2, 2, 'F');
          doc.setFillColor(...cards[i].color);
          doc.rect(x, curY, 2, cardH, 'F');
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          doc.text(cards[i].label, x + 5, curY + 6);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...cards[i].color);
          doc.text(cards[i].value, x + 5, curY + 14);
        }
        curY += cardH + 6;

        // ── Total Days info strip ──
        doc.setFillColor(235, 239, 244);
        doc.roundedRect(mL, curY, contentW, 8, 1.5, 1.5, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`Total Recorded Days: ${totalDays}     |     Total Courses: ${courses.length}`, mL + 4, curY + 5.5);
        curY += 13;

        // ── Course Attendance Table ──
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...navy);
        doc.text('Attendance by Course', mL, curY);
        curY += 2;
        doc.setDrawColor(...green);
        doc.line(mL, curY, mL + 50, curY);
        curY += 4;

        const courseHead = [['Course', 'Present', 'Late', 'Absent', 'Total', 'Attendance Rate']];
        const courseBody = courses.map(c => {
          const total = c.present + c.late + c.absent;
          return [
            c.course,
            { content: String(c.present), styles: { halign: 'center' as const, textColor: green, fontStyle: 'bold' as const } },
            { content: String(c.late), styles: { halign: 'center' as const, textColor: yellow, fontStyle: 'bold' as const } },
            { content: String(c.absent), styles: { halign: 'center' as const, textColor: red, fontStyle: 'bold' as const } },
            { content: String(total), styles: { halign: 'center' as const } },
            { content: `${c.percentage}%`, styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
          ];
        });

        // Add totals row
        const totalP = courses.reduce((s, c) => s + c.present, 0);
        const totalL = courses.reduce((s, c) => s + c.late, 0);
        const totalA = courses.reduce((s, c) => s + c.absent, 0);
        const totalAll = totalP + totalL + totalA;
        courseBody.push([
          { content: 'TOTAL', styles: { fontStyle: 'bold' as const, fillColor: [235, 239, 244] as [number, number, number] } } as any,
          { content: String(totalP), styles: { halign: 'center' as const, textColor: green, fontStyle: 'bold' as const, fillColor: [235, 239, 244] as [number, number, number] } },
          { content: String(totalL), styles: { halign: 'center' as const, textColor: yellow, fontStyle: 'bold' as const, fillColor: [235, 239, 244] as [number, number, number] } },
          { content: String(totalA), styles: { halign: 'center' as const, textColor: red, fontStyle: 'bold' as const, fillColor: [235, 239, 244] as [number, number, number] } },
          { content: String(totalAll), styles: { halign: 'center' as const, fontStyle: 'bold' as const, fillColor: [235, 239, 244] as [number, number, number] } },
          { content: `${attendanceRate}%`, styles: { halign: 'center' as const, fontStyle: 'bold' as const, fillColor: [235, 239, 244] as [number, number, number] } },
        ]);

        autoTable(doc, {
          startY: curY,
          head: courseHead,
          body: courseBody as any,
          theme: 'grid',
          styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [200, 200, 200], lineWidth: 0.15 },
          headStyles: { fillColor: navy, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center', cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: contentW * 0.35 },
            1: { cellWidth: contentW * 0.11, halign: 'center' },
            2: { cellWidth: contentW * 0.11, halign: 'center' },
            3: { cellWidth: contentW * 0.11, halign: 'center' },
            4: { cellWidth: contentW * 0.12, halign: 'center' },
            5: { cellWidth: contentW * 0.20, halign: 'center' },
          },
          alternateRowStyles: { fillColor: [248, 250, 253] },
          margin: { left: mL, right: mR },
          tableWidth: contentW,
        });

        // Get Y after the course table
        curY = (doc as any).lastAutoTable.finalY + 8;

        // ── Detection Log Table ──
        if (detectionRecords.length > 0) {
          // Check if we need a new page (if less than 40mm left for header + a few rows)
          if (curY > pageH - 50) {
            doc.addPage();
            curY = 14;
          }

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...navy);
          doc.text('Detection Log', mL, curY);
          curY += 2;
          doc.setDrawColor(...green);
          doc.setLineWidth(0.5);
          doc.line(mL, curY, mL + 50, curY);
          curY += 4;

          const detHead = [['#', 'Course', 'Date', 'Time', 'Status', 'Confidence']];
          const detBody = detectionRecords.map((rec, i) => {
            const confStr = rec.confidence != null ? `${(rec.confidence * 100).toFixed(1)}%` : 'N/A';
            const statusColor = rec.status === 'Present' ? green : rec.status === 'Late' ? yellow : red;
            return [
              { content: String(i + 1), styles: { halign: 'center' as const, textColor: gray } },
              rec.course,
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
            styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.15 },
            headStyles: { fillColor: navy, textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', halign: 'center', cellPadding: 2.5 },
            columnStyles: {
              0: { cellWidth: 10, halign: 'center' },
              1: { cellWidth: contentW * 0.28 },
              2: { cellWidth: contentW * 0.18 },
              3: { cellWidth: contentW * 0.18 },
              4: { cellWidth: contentW * 0.13, halign: 'center' },
              5: { cellWidth: contentW * 0.13, halign: 'center' },
            },
            alternateRowStyles: { fillColor: [248, 250, 253] },
            margin: { left: mL, right: mR },
            tableWidth: contentW,
          });
        }

        // ── Footer (on every page) ──
        const totalPages = doc.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
          doc.setPage(p);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(170, 170, 170);
          doc.text(`Student Attendance Report — ${name} — Generated ${dateStr}`, mL, pageH - 6);
          doc.text('Generated by SAMS (Student Attendance Management System)', pageW / 2, pageH - 6, { align: 'center' });
          doc.text(`Page ${p} of ${totalPages}`, pageW - mR, pageH - 6, { align: 'right' });
        }

        const safeName = name.replace(/[^a-z0-9]/gi, '_');
        doc.save(`Attendance_Report_${safeName}.pdf`);

      } else {
        // ═══════════════════════════════════════════════════
        // ── Excel Export ──
        // ═══════════════════════════════════════════════════
        const wb = XLSX.utils.book_new();
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
          alignment: { horizontal: 'center', vertical: 'center' },
          border,
        };
        const cellCenter = {
          alignment: { horizontal: 'center', vertical: 'center' },
          border,
        };
        const greenBold = { font: { bold: true, sz: 10, color: { rgb: '0F9D58' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
        const yellowBold = { font: { bold: true, sz: 10, color: { rgb: 'F4B400' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };
        const redBold = { font: { bold: true, sz: 10, color: { rgb: 'DB4437' } }, alignment: { horizontal: 'center', vertical: 'center' }, border };

        const totalCols = 6; // Course, Present, Late, Absent, Total, %

        // Title
        setCell(R, 0, 'Student Attendance Report', titleStyle);
        merges.push({ s: { r: R, c: 0 }, e: { r: R, c: totalCols - 1 } });
        R += 2;

        // Student info
        setCell(R, 0, 'Student Name:', headerLabelStyle);
        setCell(R, 1, name, headerValueStyle);
        R++;
        setCell(R, 0, 'Grade Level:', headerLabelStyle);
        setCell(R, 1, grade, headerValueStyle);
        R++;
        setCell(R, 0, 'Section:', headerLabelStyle);
        setCell(R, 1, section, headerValueStyle);
        R++;
        setCell(R, 0, 'Semester:', headerLabelStyle);
        setCell(R, 1, `${currentSemesterInfo.semester} (${currentSemesterInfo.range})`, headerValueStyle);
        R++;
        setCell(R, 0, 'Date Generated:', headerLabelStyle);
        setCell(R, 1, dateStr, headerValueStyle);
        R += 2;

        // Summary row
        const summaryBg = { fill: { fgColor: { rgb: 'F5F7FA' } }, border };
        setCell(R, 0, 'Present', { ...colHeaderStyle, fill: { fgColor: { rgb: '0F9D58' } } });
        setCell(R, 1, 'Late', { ...colHeaderStyle, fill: { fgColor: { rgb: 'F4B400' } } });
        setCell(R, 2, 'Absent', { ...colHeaderStyle, fill: { fgColor: { rgb: 'DB4437' } } });
        setCell(R, 3, 'Total Days', colHeaderStyle);
        setCell(R, 4, 'Attendance Rate', colHeaderStyle);
        setCell(R, 5, '', colHeaderStyle);
        R++;
        setCell(R, 0, presentDays, { ...greenBold, fill: { fgColor: { rgb: 'E8F5E9' } } });
        setCell(R, 1, lateDays, { ...yellowBold, fill: { fgColor: { rgb: 'FFF8E1' } } });
        setCell(R, 2, absentDays, { ...redBold, fill: { fgColor: { rgb: 'FFEBEE' } } });
        setCell(R, 3, totalDays, { ...cellCenter, font: { bold: true, sz: 11, color: { rgb: '1F2F57' } } });
        setCell(R, 4, `${attendanceRate}%`, { ...cellCenter, font: { bold: true, sz: 11, color: { rgb: '1F2F57' } } });
        setCell(R, 5, '', cellCenter);
        R += 2;

        // Course table header
        const courseHeaderRow = R;
        const courseHeaders = ['Course', 'Present', 'Late', 'Absent', 'Total', 'Attendance Rate'];
        courseHeaders.forEach((h, i) => setCell(R, i, h, colHeaderStyle));
        R++;

        // Course data rows
        courses.forEach((c, i) => {
          const total = c.present + c.late + c.absent;
          const rowBg = i % 2 === 0 ? 'FFFFFF' : 'F8FAFB';
          const rowStyle = { ...cellCenter, fill: { fgColor: { rgb: rowBg } }, font: { sz: 10, color: { rgb: '333333' } } };
          setCell(R, 0, c.course, { ...rowStyle, alignment: { horizontal: 'left', vertical: 'center' }, border });
          setCell(R, 1, c.present, { ...greenBold, fill: { fgColor: { rgb: rowBg } } });
          setCell(R, 2, c.late, { ...yellowBold, fill: { fgColor: { rgb: rowBg } } });
          setCell(R, 3, c.absent, { ...redBold, fill: { fgColor: { rgb: rowBg } } });
          setCell(R, 4, total, { ...cellCenter, fill: { fgColor: { rgb: rowBg } } });
          setCell(R, 5, `${c.percentage}%`, { ...cellCenter, fill: { fgColor: { rgb: rowBg } }, font: { bold: true, sz: 10, color: { rgb: '1F2F57' } } });
          R++;
        });

        // Total row
        const totalP = courses.reduce((s, c) => s + c.present, 0);
        const totalL = courses.reduce((s, c) => s + c.late, 0);
        const totalA = courses.reduce((s, c) => s + c.absent, 0);
        const totalAll = totalP + totalL + totalA;
        const totBg = { fill: { fgColor: { rgb: 'EBEEF4' } }, border };
        setCell(R, 0, 'TOTAL', { ...totBg, font: { bold: true, sz: 10, color: { rgb: '1F2F57' } }, alignment: { horizontal: 'left', vertical: 'center' } });
        setCell(R, 1, totalP, { ...totBg, font: { bold: true, sz: 10, color: { rgb: '0F9D58' } }, alignment: { horizontal: 'center', vertical: 'center' } });
        setCell(R, 2, totalL, { ...totBg, font: { bold: true, sz: 10, color: { rgb: 'F4B400' } }, alignment: { horizontal: 'center', vertical: 'center' } });
        setCell(R, 3, totalA, { ...totBg, font: { bold: true, sz: 10, color: { rgb: 'DB4437' } }, alignment: { horizontal: 'center', vertical: 'center' } });
        setCell(R, 4, totalAll, { ...totBg, font: { bold: true, sz: 10, color: { rgb: '1F2F57' } }, alignment: { horizontal: 'center', vertical: 'center' } });
        setCell(R, 5, `${attendanceRate}%`, { ...totBg, font: { bold: true, sz: 10, color: { rgb: '1F2F57' } }, alignment: { horizontal: 'center', vertical: 'center' } });
        R += 2;

        // ── Detection Log Section ──
        if (detectionRecords.length > 0) {
          const detTitleRow = R;
          setCell(R, 0, 'Detection Log', { font: { bold: true, sz: 13, color: { rgb: '1F2F57' } }, alignment: { horizontal: 'center', vertical: 'center' } });
          merges.push({ s: { r: R, c: 0 }, e: { r: R, c: totalCols - 1 } });
          R += 2;

          // Detection headers
          const detHeaders = ['#', 'Course', 'Date', 'Time', 'Status', 'Confidence'];
          detHeaders.forEach((h, i) => setCell(R, i, h, colHeaderStyle));
          R++;

          // Detection data rows
          detectionRecords.forEach((rec, i) => {
            const rowBg = i % 2 === 0 ? 'FFFFFF' : 'F8FAFB';
            const rowFill = { fill: { fgColor: { rgb: rowBg } }, border };
            setCell(R, 0, i + 1, { ...cellCenter, fill: { fgColor: { rgb: rowBg } }, font: { sz: 10, color: { rgb: '828282' } } });
            setCell(R, 1, rec.course, { ...rowFill, font: { sz: 10, color: { rgb: '333333' } }, alignment: { horizontal: 'left', vertical: 'center' } });
            setCell(R, 2, rec.date, { ...cellCenter, fill: { fgColor: { rgb: rowBg } } });
            setCell(R, 3, rec.time, { ...cellCenter, fill: { fgColor: { rgb: rowBg } } });

            const statusStyle = rec.status === 'Present'
              ? { ...greenBold, fill: { fgColor: { rgb: rowBg } } }
              : rec.status === 'Late'
              ? { ...yellowBold, fill: { fgColor: { rgb: rowBg } } }
              : { ...redBold, fill: { fgColor: { rgb: rowBg } } };
            setCell(R, 4, rec.status, statusStyle);

            const confStr = rec.confidence != null ? `${(rec.confidence * 100).toFixed(1)}%` : 'N/A';
            setCell(R, 5, confStr, { ...cellCenter, fill: { fgColor: { rgb: rowBg } }, font: { bold: true, sz: 10, color: { rgb: '1F2F57' } } });
            R++;
          });
          R++;
        }

        // Generated note
        setCell(R, 0, `Generated by SAMS (Student Attendance Management System) — ${dateStr}`, { font: { sz: 9, italic: true, color: { rgb: '999999' } } });
        R++;

        // Sheet config
        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R, c: totalCols - 1 } });
        ws['!merges'] = merges;
        ws['!cols'] = [
          { wch: 38 }, // Course
          { wch: 12 }, // Present
          { wch: 10 }, // Late
          { wch: 10 }, // Absent
          { wch: 10 }, // Total
          { wch: 18 }, // Attendance Rate
        ];
        ws['!rows'] = [{ hpx: 30 }]; // Title row height

        XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
        const safeName = name.replace(/[^a-z0-9]/gi, '_');
        XLSX.writeFile(wb, `Attendance_Report_${safeName}.xlsx`);
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
                          {isLoading ? "Loading..." : (studentData?.username || studentInfo.name)}
                        </div>
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
                          <label className="teacher-export-popover-label">Select Format</label>
                          <div className="teacher-export-format-btns">
                            <button
                              onClick={() => handleExport('excel')}
                              className="teacher-export-popover-confirm teacher-export-excel"
                            >
                              <DownloadIcon /> Excel (.xlsx)
                            </button>
                            <button
                              onClick={() => handleExport('pdf')}
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
