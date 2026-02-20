export const attendanceAppeals = [
  {
    id: 1,
    studentName: "Juan Carlos Ilano",
    section: "STEM-A",
    courseId: "CS105",
    course: "Computer Science",

    date: "2026-02-10",
    recordedStatus: "Absent",
    requestedStatus: "Present",

    reason: "I was present but the AI failed to recognize my face.",

    status: "pending",

    submittedAt: "2026-02-10 08:45 AM",

    reviewedBy: null,
    teacherResponse: null,
  },

  {
    id: 2,
    studentName: "Juan Carlos Ilano",
    section: "STEM-A",
    courseId: "CIS241",
    course: "Mathematics",

    date: "2026-02-08",
    recordedStatus: "Late",
    requestedStatus: "Present",

    reason: "I arrived on time but camera detection was delayed.",

    status: "approved",

    submittedAt: "2026-02-08 09:10 AM",

    reviewedBy: "Your",

    teacherResponse:
      "Camera logs confirm student arrival within allowed grace period.",
  },

  {
    id: 3,
    studentName: "Juan Carlos Ilano",
    section: "STEM-A",
    courseId: "ENG101",
    course: "English",

    date: "2026-02-05",
    recordedStatus: "Absent",
    requestedStatus: "Present",

    reason: "System error during attendance capture.",

    status: "rejected",

    submittedAt: "2026-02-05 10:30 AM",

    reviewedBy: "Your",

    teacherResponse:
      "No attendance evidence found.",
  },

  {
    id: 4,
    studentName: "Maria Santos",
    section: "STEM-B",
    courseId: "PHY101",
    course: "Physics",

    date: "2026-02-03",
    recordedStatus: "Late",
    requestedStatus: "Present",

    reason: "Camera delay.",

    status: "pending",

    submittedAt: "2026-02-03 07:50 AM",

    reviewedBy: null,
    teacherResponse: null,
  },

  {
    id: 5,
    studentName: "Carlos Reyes",
    section: "STEM-A",
    courseId: "CHEM101",
    course: "Chemistry",

    date: "2026-02-01",
    recordedStatus: "Absent",
    requestedStatus: "Present",

    reason: "Recognition failed.",

    status: "rejected",

    submittedAt: "2026-02-01 09:20 AM",

    reviewedBy: "Your",

    teacherResponse: null,
  },
];
