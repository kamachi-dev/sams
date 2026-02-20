// ==========================
// STUDENT INFO
// ==========================
export const studentInfo = {
  name: "Juan Carlos Ilano (MOCK not connected to DB)",
  studentId: "2022-00123",
  grade: "Grade 12",
  section: "STEM-A",
};

// ==========================
// ATTENDANCE DATA
// ==========================
export const dailyAttendance = [
  { date: "Jan 2", status: "Present", time: "7:45 AM" },
  { date: "Jan 3", status: "Present", time: "7:52 AM" },
  { date: "Jan 4", status: "Late", time: "8:15 AM" },
  { date: "Jan 5", status: "Present", time: "7:48 AM" },
  { date: "Jan 6", status: "Present", time: "7:50 AM" },
  { date: "Jan 7", status: "Absent", time: "-" },
  { date: "Jan 8", status: "Present", time: "7:43 AM" },
];

export const weeklyTrend = [
  { week: "Week 1", present: 4, late: 1, absent: 0 },
  { week: "Week 2", present: 5, late: 0, absent: 0 },
  { week: "Week 3", present: 3, late: 1, absent: 1 },
  { week: "Week 4", present: 5, late: 0, absent: 0 },
];

export const monthlyData = [
  { month: "Sep", percentage: 95 },
  { month: "Oct", percentage: 92 },
  { month: "Nov", percentage: 98 },
  { month: "Dec", percentage: 90 },
  { month: "Jan", percentage: 94 },
];

export const quarterlyData = [
  { name: "1st Quarter", present: 180, late: 8, absent: 2 },
  { name: "2nd Quarter", present: 175, late: 10, absent: 5 },
  { name: "3rd Quarter", present: 182, late: 6, absent: 2 },
  { name: "4th Quarter", present: 178, late: 9, absent: 3 },
];

// ==========================
// COURSE ATTENDANCE
// ==========================
export const courseAttendance = [
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
  { subject: "Practical Research", present: 36, late: 3, absent: 1, percentage: 90 },
];

// ==========================
// NOTIFICATIONS
// ==========================
export const notifications = [
  // =========================
  // FIRST SEMESTER 2024-2025
  // =========================
  {
    schoolYear: "2024-2025",
    semester: "first",
    studentName: "Arvin Miguel B. Antonio",
    studentId: 1,

    type: "late",
    course: "Computer Science",
    code: "CS105_P",
    prof: "Prof. Navarro",
    time: "Mon 7:45 AM",
    message: "You have been recorded as late for this Computer Science class session."
  },
  {
    schoolYear: "2024-2025",
    semester: "first",
    studentName: "Ryan Gosling B. Antonio",
    studentId: 2,

    type: "absent",
    course: "Mathematics",
    code: "CIS241_P",
    prof: "Prof. Rizal",
    time: "Tue 9:00 AM",
    message: "You were marked absent during today’s Mathematics class."
  },

  // =========================
  // SECOND SEMESTER 2024-2025
  // =========================
  {
    schoolYear: "2024-2025",
    semester: "second",
    studentName: "Michael Reeves B. Antonio",
    studentId: 3,

    type: "warning",
    course: "Research",
    code: "RES302_P",
    prof: "Prof. Villanueva",
    time: "Wed 11:45 AM",
    message: "Repeated attendance issues have been detected in your Research class."
  },

  // =========================
  // FIRST SEMESTER 2025-2026
  // =========================
  {
    schoolYear: "2025-2026",
    semester: "first",
    studentName: "Sofia Marie B. Antonio",
    studentId: 4,

    type: "late",
    course: "English",
    code: "ENG102_P",
    prof: "Prof. Santos",
    time: "Mon 10:30 AM",
    message: "Late attendance has been recorded for your English class."
  },

  {
    schoolYear: "2025-2026",
    semester: "first",
    studentName: "Lucas John B. Antonio",
    studentId: 5,

    type: "absent",
    course: "Mathematics",
    code: "CIS242_P",
    prof: "Prof. Rizal",
    time: "Thu 9:00 AM",
    message: "You were absent during this Mathematics class."
  },

  // =========================
  // SECOND SEMESTER 2025-2026
  // =========================
  {
    schoolYear: "2025-2026",
    semester: "second",
    studentName: "Ella Rose B. Antonio",
    studentId: 6,

    type: "late",
    course: "Filipino",
    code: "FIL103_P",
    prof: "Prof. Dela Cruz",
    time: "Mon 8:00 AM",
    message: "Late arrival has been noted for your Filipino class."
  },

  {
    schoolYear: "2025-2026",
    semester: "second",
    studentName: "Daniel James B. Antonio",
    studentId: 7,

    type: "warning",
    course: "Physics",
    code: "PHY101_P",
    prof: "Prof. Villanueva",
    time: "Tue 8:00 AM",
    message: "Attendance pattern requires improvement."
  },

  {
    schoolYear: "2025-2026",
    semester: "second",
    studentName: "Ava Nicole B. Antonio",
    studentId: 8,

    type: "absent",
    course: "Arts",
    code: "ART101_P",
    prof: "Prof. Ramirez",
    time: "Wed 11:45 AM",
    message: "You were absent during Arts class."
  },
  // =========================
  // FIRST SEMESTER 2025-2026 (ADDITIONAL 10)
  // =========================

  {
    schoolYear: "2025-2026",
    semester: "first",
    studentName: "Arvin Miguel B. Antonio",
    studentId: 1,
    type: "late",
    course: "Mathematics",
    code: "MATH301_P",
    prof: "Prof. Rizal",
    time: "Mon 7:50 AM",
    message:
      "You arrived late to Mathematics class. Please ensure punctuality to avoid attendance penalties."
  },

  {
    schoolYear: "2025-2026",
    semester: "first",
    studentName: "Ryan Gosling B. Antonio",
    studentId: 2,
    type: "absent",
    course: "English",
    code: "ENG301_P",
    prof: "Prof. Santos",
    time: "Tue 10:30 AM",
    message:
      "You were marked absent in English class. Kindly coordinate with your instructor regarding missed lessons."
  },

  {
    schoolYear: "2025-2026",
    semester: "first",
    studentName: "Michael Reeves B. Antonio",
    studentId: 3,
    type: "warning",
    course: "Computer Science",
    code: "CS301_P",
    prof: "Prof. Navarro",
    time: "Wed 9:15 AM",
    message:
      "Repeated attendance irregularities have been detected in Computer Science. Immediate improvement is required."
  },

  {
    schoolYear: "2025-2026",
    semester: "first",
    studentName: "Sofia Marie B. Antonio",
    studentId: 4,
    type: "late",
    course: "Science",
    code: "SCI301_P",
    prof: "Prof. Ramirez",
    time: "Thu 8:05 AM",
    message:
      "You arrived late to Science class. Please follow the class schedule strictly."
  },

  {
    schoolYear: "2025-2026",
    semester: "first",
    studentName: "Lucas John B. Antonio",
    studentId: 5,
    type: "absent",
    course: "Statistics",
    code: "STAT301_P",
    prof: "Prof. Lim",
    time: "Fri 3:00 PM",
    message:
      "You were absent during Statistics class. Review the missed lesson and consult your instructor if needed."
  },

  {
    schoolYear: "2025-2026",
    semester: "first",
    studentName: "Ella Rose B. Antonio",
    studentId: 6,
    type: "late",
    course: "Filipino",
    code: "FIL301_P",
    prof: "Prof. Dela Cruz",
    time: "Mon 8:10 AM",
    message:
      "Late attendance has been recorded for Filipino class. Please arrive earlier moving forward."
  },

  {
    schoolYear: "2025-2026",
    semester: "first",
    studentName: "Daniel James B. Antonio",
    studentId: 7,
    type: "warning",
    course: "Physics",
    code: "PHY301_P",
    prof: "Prof. Villanueva",
    time: "Tue 8:00 AM",
    message:
      "Your attendance in Physics has raised concerns. Continued violations may affect your academic standing."
  },

  {
    schoolYear: "2025-2026",
    semester: "first",
    studentName: "Ava Nicole B. Antonio",
    studentId: 8,
    type: "absent",
    course: "Arts",
    code: "ART301_P",
    prof: "Prof. Ramirez",
    time: "Wed 11:45 AM",
    message:
      "You were absent during Arts class. Please review missed activities and assignments."
  },

  {
    schoolYear: "2025-2026",
    semester: "first",
    studentName: "Arvin Miguel B. Antonio",
    studentId: 1,
    type: "warning",
    course: "Research",
    code: "RES301_P",
    prof: "Prof. Villanueva",
    time: "Thu 1:00 PM",
    message:
      "Your attendance pattern in Research requires improvement. Please ensure consistent participation."
  },

  {
    schoolYear: "2025-2026",
    semester: "first",
    studentName: "Ryan Gosling B. Antonio",
    studentId: 2,
    type: "late",
    course: "Entrepreneurship",
    code: "ENT301_P",
    prof: "Prof. Bautista",
    time: "Fri 10:00 AM",
    message:
      "You arrived late to Entrepreneurship class. Please observe proper time management."
  },

];

export const children = [
  {
    id: 1,
    name: "Arvin Miguel B. Antonio",
    isAbsentYesterday: "no",
    status: "present",
    present: 10,
    late: 0,
    absent: 0,
    percentage: 100,

    today: {
      statusLabel: "PRESENT",
      classTime: "10:15 AM",
      teacher: "Ms. Mornika",
      course: "Computer Science",
      lastChecked: "10:35 AM",
    },
  },
  {
    id: 2,
    name: "Ryan Gosling B. Antonio",
    isAbsentYesterday: "yes",
    status: "late",
    present: 8,
    late: 1,
    absent: 1,
    percentage: 85,

    today: {
      statusLabel: "LATE",
      classTime: "10:15 AM",
      teacher: "Mr. Rizal",
      course: "Philippine History",
      lastChecked: "10:35 AM",
    },
  },
  {
    id: 3,
    name: "Michael Reeves B. Antonio",
    isAbsentYesterday: "yes",
    status: "absent",
    present: 7,
    late: 0,
    absent: 3,
    percentage: 70,

    today: {
      statusLabel: "ABSENT",
      classTime: "10:15 AM",
      teacher: "Ms. Mornika",
      course: "Computer Science",
      lastChecked: "10:35 AM",
    },
  },
  {
    id: 4,
    name: "Sofia Marie B. Antonio",
    isAbsentYesterday: "no",
    status: "checking",
    present: 9,
    late: 0,
    absent: 1,
    percentage: 90,

    today: {
      statusLabel: "⚠",
      classTime: "9:00 AM",
      teacher: "Ms. Dela Cruz",
      course: "Mathematics",
      lastChecked: "9:20 AM",
    },
  },
  {
    id: 5,
    name: "Lucas John B. Antonio",
    isAbsentYesterday: "no",
    status: "late",
    present: 7,
    late: 2,
    absent: 1,
    percentage: 80,

    today: {
      statusLabel: "LATE",
      classTime: "1:30 PM",
      teacher: "Mr. Santos",
      course: "English",
      lastChecked: "1:50 PM",
    },
  },
  {
    id: 6,
    name: "Ella Rose B. Antonio",
    isAbsentYesterday: "no",
    status: "present",
    present: 8,
    late: 0,
    absent: 2,
    percentage: 85,

    today: {
      statusLabel: "PRESENT",
      classTime: "3:00 PM",
      teacher: "Ms. Navarro",
      course: "Science",
      lastChecked: "3:15 PM",
    },
  },
  {
  id: 7,
  name: "Daniel James B. Antonio",
  isAbsentYesterday: "yes",
  status: "present",
  present: 9,
  late: 1,
  absent: 0,
  percentage: 95,

  today: {
    statusLabel: "PRESENT",
    classTime: "8:00 AM",
    teacher: "Mr. Villanueva",
    course: "Physics",
    lastChecked: "8:20 AM",
  },
  },
  {
    id: 8,
    name: "Ava Nicole B. Antonio",
    isAbsentYesterday: "no",
    status: "checking",
    present: 6,
    late: 1,
    absent: 3,
    percentage: 75,

    today: {
      statusLabel: "⚠",
      classTime: "11:45 AM",
      teacher: "Ms. Ramirez",
      course: "Arts",
      lastChecked: "12:05 PM",
    },
  },
];

export const chartColors = {
  present: "#17a1fa",
  late: "#ffac01",
  absent: "#f92600",
};
