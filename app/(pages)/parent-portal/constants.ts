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
// SUBJECT ATTENDANCE
// ==========================
export const subjectAttendance = [
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
  // FIRST SEMESTER (10)
  // =========================
  {
    semester: "first",
    type: "late",
    subject: "Computer Science",
    code: "CS105_P",
    prof: "Prof. Navarro",
    time: "Mon 7:45 AM",
    message:
      "You have been recorded as late for this Computer Science class session. Continued tardiness may negatively affect your attendance record and overall academic standing. Please make sure to arrive on time for future classes to avoid further penalties."
  },
  {
    semester: "first",
    type: "absent",
    subject: "Mathematics",
    code: "CIS241_P",
    prof: "Prof. Rizal",
    time: "Tue 9:00 AM",
    message:
      "You were marked absent during today’s Mathematics class. Regular attendance is required to keep up with lessons and assessments. If this absence was unavoidable, please provide a valid excuse or coordinate directly with your instructor."
  },
  {
    semester: "first",
    type: "warning",
    subject: "English",
    code: "ENG101_P",
    prof: "Prof. Santos",
    time: "Wed 10:30 AM",
    message:
      "Multiple attendance issues have been detected in your English class. This serves as a formal warning that continued absences or late arrivals may result in disciplinary action or academic consequences. Immediate improvement is expected."
  },
  {
    semester: "first",
    type: "warning",
    subject: "Physical Education",
    code: "PE101_P",
    prof: "Prof. Garcia",
    time: "Thu 7:15 AM",
    message:
      "Late arrival has been noted for your Physical Education class. Timeliness is important to ensure full participation in activities and proper attendance tracking. Please follow the class schedule strictly moving forward."
  },
  {
    semester: "first",
    type: "warning",
    subject: "Ethics",
    code: "ETH201_P",
    prof: "Prof. Morales",
    time: "Fri 2:00 PM",
    message:
      "You were absent during this Ethics class session. Consistent attendance is expected as discussions and participation are essential parts of the course. Repeated absences may affect your final evaluation."
  },
  {
    semester: "first",
    type: "late",
    subject: "Statistics",
    code: "STAT201_P",
    prof: "Prof. Lim",
    time: "Mon 3:10 PM",
    message:
      "You arrived late to your Statistics class. Please be mindful of punctuality, as repeated late arrivals may disrupt the lesson and impact your attendance standing for this subject."
  },
  {
    semester: "first",
    type: "warning",
    subject: "Research",
    code: "RES301_P",
    prof: "Prof. Villanueva",
    time: "Tue 11:45 AM",
    message:
      "Your attendance pattern in Research has raised concerns. This warning is issued to encourage immediate improvement. Please coordinate with your instructor if you are experiencing difficulties that affect your attendance."
  },
  {
    semester: "first",
    type: "late",
    subject: "Filipino",
    code: "FIL102_P",
    prof: "Prof. Dela Cruz",
    time: "Wed 8:00 AM",
    message:
      "Late attendance has been recorded for your Filipino class. Continued tardiness may result in penalties or affect your participation grade. Kindly ensure punctual attendance in future sessions."
  },
  {
    semester: "first",
    type: "absent",
    subject: "Entrepreneurship",
    code: "ENT101_P",
    prof: "Prof. Bautista",
    time: "Thu 10:00 AM",
    message:
      "You were absent during this Entrepreneurship class. Important topics may have been discussed, so please review the missed material and consult your instructor if necessary."
  },
  {
    semester: "first",
    type: "late",
    subject: "Social Sciences",
    code: "CIS243_P",
    prof: "Prof. Kamachi",
    time: "Fri 12:15 PM",
    message:
      "You have been recorded as late for your Social Sciences class. Continued tardiness may affect your attendance standing and overall performance. Please observe proper time management moving forward."
  },

  // =========================
  // SECOND SEMESTER (10)
  // =========================
  {
    semester: "second",
    type: "late",
    subject: "English",
    code: "ENG102_P",
    prof: "Prof. Santos",
    time: "Mon 10:30 AM",
    message:
      "Late attendance has been recorded for your English class. Arriving on time is important to avoid missing key discussions and instructions. Please ensure punctuality in future sessions."
  },
  {
    semester: "second",
    type: "absent",
    subject: "Computer Science",
    code: "CS205_P",
    prof: "Prof. Navarro",
    time: "Tue 1:15 PM",
    message:
      "You were absent during today’s Computer Science class. Attendance is important to fully understand technical concepts and exercises. Kindly review the missed lesson and consult your instructor if needed."
  },
  {
    semester: "second",
    type: "warning",
    subject: "Research",
    code: "RES302_P",
    prof: "Prof. Villanueva",
    time: "Wed 11:45 AM",
    message:
      "Repeated attendance issues have been detected in your Research class. This serves as a formal warning that continued violations may lead to academic or disciplinary action."
  },
  {
    semester: "second",
    type: "late",
    subject: "Statistics",
    code: "STAT202_P",
    prof: "Prof. Lim",
    time: "Thu 3:00 PM",
    message:
      "You arrived late to your Statistics class. Continued tardiness may affect your academic standing and participation score. Please be mindful of class schedules."
  },
  {
    semester: "second",
    type: "absent",
    subject: "Ethics",
    code: "ETH202_P",
    prof: "Prof. Morales",
    time: "Fri 2:00 PM",
    message:
      "You were absent during this Ethics class session. Important discussions may have been missed. Please ensure regular attendance to avoid academic issues."
  },
  {
    semester: "second",
    type: "late",
    subject: "Filipino",
    code: "FIL103_P",
    prof: "Prof. Dela Cruz",
    time: "Mon 8:00 AM",
    message:
      "Late arrival has been noted for your Filipino class. Please adhere to the scheduled class time to avoid repeated attendance penalties."
  },
  {
    semester: "second",
    type: "warning",
    subject: "Entrepreneurship",
    code: "ENT102_P",
    prof: "Prof. Bautista",
    time: "Tue 10:00 AM",
    message:
      "Your attendance record in Entrepreneurship needs improvement. Consistent participation is required to meet course expectations and learning objectives."
  },
  {
    semester: "second",
    type: "late",
    subject: "Physical Education",
    code: "PE102_P",
    prof: "Prof. Garcia",
    time: "Wed 7:30 AM",
    message:
      "Late attendance has been recorded for your Physical Education class. Timeliness is essential to ensure proper warm-up and safe participation in activities."
  },
  {
    semester: "second",
    type: "absent",
    subject: "Mathematics",
    code: "CIS242_P",
    prof: "Prof. Rizal",
    time: "Thu 9:00 AM",
    message:
      "You were absent during this Mathematics class. Please catch up on the lesson and consult your instructor if you need clarification on missed topics."
  },
  {
    semester: "second",
    type: "late",
    subject: "Social Sciences",
    code: "CIS244_P",
    prof: "Prof. Kamachi",
    time: "Fri 12:30 PM",
    message:
      "You have been recorded as late for your Social Sciences class. Continued tardiness may result in penalties or affect your overall attendance record."
  }
];


export const children = [
  {
    id: 1,
    name: "Arvin Miguel B. Antonio",
    status: "present",
    present: 10,
    late: 0,
    absent: 0,
    percentage: 100,

    today: {
      statusLabel: "PRESENT",
      classTime: "10:15 AM",
      teacher: "Ms. Mornika",
      subject: "Computer Science",
      lastChecked: "10:35 AM",
    },
  },
  {
    id: 2,
    name: "Ryan Gosling B. Antonio",
    status: "late",
    present: 8,
    late: 1,
    absent: 1,
    percentage: 85,

    today: {
      statusLabel: "LATE",
      classTime: "10:15 AM",
      teacher: "Mr. Rizal",
      subject: "Philippine History",
      lastChecked: "10:35 AM",
    },
  },
  {
    id: 3,
    name: "Michael Reeves B. Antonio",
    status: "absent",
    present: 7,
    late: 0,
    absent: 3,
    percentage: 70,

    today: {
      statusLabel: "ABSENT",
      classTime: "10:15 AM",
      teacher: "Ms. Mornika",
      subject: "Computer Science",
      lastChecked: "10:35 AM",
    },
  },
  {
    id: 4,
    name: "Sofia Marie B. Antonio",
    status: "checking",
    present: 9,
    late: 0,
    absent: 1,
    percentage: 90,

    today: {
      statusLabel: "⚠",
      classTime: "9:00 AM",
      teacher: "Ms. Dela Cruz",
      subject: "Mathematics",
      lastChecked: "9:20 AM",
    },
  },
  {
    id: 5,
    name: "Lucas John B. Antonio",
    status: "late",
    present: 7,
    late: 2,
    absent: 1,
    percentage: 80,

    today: {
      statusLabel: "LATE",
      classTime: "1:30 PM",
      teacher: "Mr. Santos",
      subject: "English",
      lastChecked: "1:50 PM",
    },
  },
  {
    id: 6,
    name: "Ella Rose B. Antonio",
    status: "present",
    present: 8,
    late: 0,
    absent: 2,
    percentage: 85,

    today: {
      statusLabel: "PRESENT",
      classTime: "3:00 PM",
      teacher: "Ms. Navarro",
      subject: "Science",
      lastChecked: "3:15 PM",
    },
  },
  {
  id: 7,
  name: "Daniel James B. Antonio",
  status: "present",
  present: 9,
  late: 1,
  absent: 0,
  percentage: 95,

  today: {
    statusLabel: "PRESENT",
    classTime: "8:00 AM",
    teacher: "Mr. Villanueva",
    subject: "Physics",
    lastChecked: "8:20 AM",
  },
  },
  {
    id: 8,
    name: "Ava Nicole B. Antonio",
    status: "checking",
    present: 6,
    late: 1,
    absent: 3,
    percentage: 75,

    today: {
      statusLabel: "⚠",
      classTime: "11:45 AM",
      teacher: "Ms. Ramirez",
      subject: "Arts",
      lastChecked: "12:05 PM",
    },
  },
];

export const chartColors = {
  present: "#17a1fa",
  late: "#ffac01",
  absent: "#f92600",
};
