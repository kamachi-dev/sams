"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import Image from "next/image";
import { Label, Separator, ToggleGroup, Dialog, Tabs } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import './styles.css';
import { PersonIcon, TrashIcon, CalendarIcon } from "@radix-ui/react-icons";

export default function Admin() {
    type SchoolYearItem = {
        created_at: string;
        school_year: string;
        id: string;
        notes: string;
    };

    type SchoolYearResponse = {
        success: boolean;
        status: number;
        data: SchoolYearItem[];
        error: unknown | null;
    };

    const groupSize = 4;

    const [schoolYearList, setSchoolYearList] = useState<SchoolYearResponse | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
    const [importStatus, setImportStatus] = useState<string | null>(null);

    const [studentCount, setStudentCount] = useState<number | null>(null);
    const [teacherCount, setTeacherCount] = useState<number | null>(null);
    const [classCount, setClassCount] = useState<number | null>(null);

    const [schoolYear, setSchoolYear] = useState<string>('');
    const [schoolYearNotes, setSchoolYearNotes] = useState<string>('');
    const [schoolYearLoading, setSchoolYearLoading] = useState<boolean>(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
    const [schoolYearToDelete, setSchoolYearToDelete] = useState<string | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
    const [activateDialogOpen, setActivateDialogOpen] = useState<boolean>(false);
    const [schoolYearToActivate, setSchoolYearToActivate] = useState<string | null>(null);
    const [activateConfirmText, setActivateConfirmText] = useState<string>('');
    const [activeSchoolYearId, setActiveSchoolYearId] = useState<string | null>(null);

    const studentFileRef = useRef<HTMLInputElement | null>(null);
    const teacherFileRef = useRef<HTMLInputElement | null>(null);
    const [students, setStudents] = useState<{ id: string; username?: string; email?: string; pfp?: string }[]>([]);
    const [teachers, setTeachers] = useState<{ id: string; username?: string; email?: string; pfp?: string }[]>([]);
    const [usersLoading, setUsersLoading] = useState<boolean>(false);
    const [userDeleteDialogOpen, setUserDeleteDialogOpen] = useState<boolean>(false);
    const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);
    const [userToDeleteType, setUserToDeleteType] = useState<'student' | 'teacher' | null>(null);
    const [userDeleteConfirmText, setUserDeleteConfirmText] = useState<string>('');
    const [userSearch, setUserSearch] = useState<string>('');

    // Courses management state
    const [courseName, setCourseName] = useState<string>('');
    const [courseSchedule, setCourseSchedule] = useState<string>('');
    const [selectedCourseStudents, setSelectedCourseStudents] = useState<string[]>([]);
    const [creatingCourse, setCreatingCourse] = useState<boolean>(false);
    const [courseStudentSearch, setCourseStudentSearch] = useState<string>('');

    // Course viewer state
    type Course = { id: string; name: string; schedule?: string; teacher?: string };
    type EnrolledStudent = { id: string; name?: string; email?: string; section?: string };
    const [coursesList, setCoursesList] = useState<Course[]>([]);
    const [coursesLoading, setCoursesLoading] = useState<boolean>(false);
    const [courseViewerSearch, setCourseViewerSearch] = useState<string>('');
    const [selectedViewCourse, setSelectedViewCourse] = useState<Course | null>(null);
    const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
    const [enrolledLoading, setEnrolledLoading] = useState<boolean>(false);
    const [enrolledSearch, setEnrolledSearch] = useState<string>('');

    // Course deletion state
    const [courseDeleteDialogOpen, setCourseDeleteDialogOpen] = useState<boolean>(false);
    const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
    const [courseDeleteConfirmText, setCourseDeleteConfirmText] = useState<string>('');

    // Add students to course state
    const [addStudentsDialogOpen, setAddStudentsDialogOpen] = useState<boolean>(false);
    const [addStudentsSearch, setAddStudentsSearch] = useState<string>('');
    const [studentsToAdd, setStudentsToAdd] = useState<string[]>([]);

    // Student schedule view state
    type TimeSlot = { start: string; end: string };
    type ScheduleCourse = { id: string; name: string; schedule?: Record<string, TimeSlot> | string };
    const [scheduleDialogOpen, setScheduleDialogOpen] = useState<boolean>(false);
    const [scheduleStudent, setScheduleStudent] = useState<{ id: string; username?: string; email?: string } | null>(null);
    const [studentSchedule, setStudentSchedule] = useState<ScheduleCourse[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState<boolean>(false);

    async function handleCsvUpload(file: File, endpoint: string) {
        try {
            setImportStatus("Uploading...");
            const form = new FormData();
            form.append('file', file);
            const res = await fetch(endpoint, { method: 'POST', body: form });
            const json = await res.json();
            if (!res.ok || json?.success === false) {
                setImportStatus(`Import failed: ${json?.error ?? res.statusText}`);
                return;
            }
            const imported = Array.isArray(json?.data)
                ? json.data.length
                : (json?.data?.imported ?? 0);
            const invalid = Array.isArray(json?.data?.invalid)
                ? json.data.invalid.length
                : (json?.data?.invalid?.length ?? 0);
            setImportStatus(`Import complete: ${imported} rows, ${invalid} invalid`);
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (err instanceof Error) {
                const error = err as Error;
                message = error.message
            };
            Error(message);
            setImportStatus(`Import error: ${message}`);
        } finally {
            setTimeout(() => setImportStatus(null), 5000);
        }
    }

    async function handleCreateSchoolYear() {
        if (!schoolYear.trim() || !schoolYearNotes.trim()) {
            setImportStatus('School year and notes are required');
            setTimeout(() => setImportStatus(null), 5000);
            return;
        }

        try {
            setSchoolYearLoading(true);
            const form = new FormData();
            form.append('school_year', schoolYear);
            form.append('notes', schoolYearNotes);

            const res = await fetch('/api/school_year', { method: 'POST', body: form });
            const json = await res.json();

            if (!res.ok || json?.success === false) {
                setImportStatus(`School year creation failed: ${json?.error ?? res.statusText}`);
                setTimeout(() => setImportStatus(null), 5000);
                return;
            }

            setImportStatus('School year created successfully');
            setSchoolYear('');
            setSchoolYearNotes('');
            setTimeout(() => setImportStatus(null), 5000);

            // Refresh school year list
            const schoolYearRes: SchoolYearResponse = await fetch('/api/school_year').then(res => res.json());
            setSchoolYearList(schoolYearRes);
            if (schoolYearRes?.data?.length) {
                setSelectedGroup(0);
            }
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (err instanceof Error) {
                const error = err as Error;
                message = error.message;
            }
            setImportStatus(`School year creation error: ${message}`);
            setTimeout(() => setImportStatus(null), 5000);
        } finally {
            setSchoolYearLoading(false);
        }
    }

    function openDeleteDialog(schoolYearId: string) {
        setSchoolYearToDelete(schoolYearId);
        setDeleteConfirmText('');
        setDeleteDialogOpen(true);
    }

    function openActivateDialog(schoolYearId: string) {
        setSchoolYearToActivate(schoolYearId);
        setActivateConfirmText('');
        setActivateDialogOpen(true);
    }

    function closeDeleteDialog() {
        setDeleteDialogOpen(false);
        setSchoolYearToDelete(null);
        setDeleteConfirmText('');
    }

    function closeUserDeleteDialog() {
        setUserDeleteDialogOpen(false);
        setUserToDeleteId(null);
        setUserToDeleteType(null);
        setUserDeleteConfirmText('');
    }

    async function handleDeleteUser() {
        if (!userToDeleteId || userDeleteConfirmText !== 'delete' || !userToDeleteType) {
            return;
        }

        try {
            const form = new FormData();
            form.append('id', userToDeleteId);

            const endpoint = userToDeleteType === 'student' ? '/api/students' : '/api/teachers';
            const res = await fetch(endpoint, { method: 'DELETE', body: form });
            const json = await res.json();

            if (!res.ok || json?.success === false) {
                setImportStatus(`Delete failed: ${json?.error ?? res.statusText}`);
                setTimeout(() => setImportStatus(null), 4000);
                closeUserDeleteDialog();
                return;
            }

            if (userToDeleteType === 'student') {
                setStudents(prev => prev.filter(p => p.id !== userToDeleteId));
                setStudentCount((c) => (c ? c - 1 : null));
            } else {
                setTeachers(prev => prev.filter(p => p.id !== userToDeleteId));
                setTeacherCount((c) => (c ? c - 1 : null));
            }

            setImportStatus('User deleted successfully');
            setTimeout(() => setImportStatus(null), 4000);
            closeUserDeleteDialog();
        } catch (err: unknown) {
            console.error(err);
            let message = 'Unknown error';
            if (err instanceof Error) message = err.message;
            setImportStatus(`Delete error: ${message}`);
            setTimeout(() => setImportStatus(null), 4000);
            closeUserDeleteDialog();
        }
    }

    function toggleCourseStudent(id: string) {
        setSelectedCourseStudents(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    }

    async function handleSelectViewCourse(course: Course) {
        setSelectedViewCourse(course);
        setEnrolledStudents([]);
        setEnrolledSearch('');
        try {
            setEnrolledLoading(true);
            const res = await fetch(`/api/camera/courses?courseId=${encodeURIComponent(course.id)}`).then(r => r.json()).catch(() => null);
            if (res?.success && res.data?.enrolled_students && Array.isArray(res.data.enrolled_students)) {
                setEnrolledStudents(res.data.enrolled_students);
            }
        } finally {
            setEnrolledLoading(false);
        }
    }

    function openCourseDeleteDialog(course: Course) {
        setCourseToDelete(course);
        setCourseDeleteConfirmText('');
        setCourseDeleteDialogOpen(true);
    }

    function closeCourseDeleteDialog() {
        setCourseDeleteDialogOpen(false);
        setCourseToDelete(null);
        setCourseDeleteConfirmText('');
    }

    async function handleDeleteCourse() {
        if (!courseToDelete || courseDeleteConfirmText !== 'delete') return;
        try {
            const form = new FormData();
            form.append('id', courseToDelete.id);
            const res = await fetch('/api/courses', { method: 'DELETE', body: form });
            const json = await res.json();
            if (!res.ok || json?.success === false) {
                setImportStatus(`Delete course failed: ${json?.error ?? res.statusText}`);
                setTimeout(() => setImportStatus(null), 4000);
                closeCourseDeleteDialog();
                return;
            }
            setImportStatus('Course deleted');
            setCoursesList(prev => prev.filter(c => c.id !== courseToDelete.id));
            if (selectedViewCourse?.id === courseToDelete.id) {
                setSelectedViewCourse(null);
                setEnrolledStudents([]);
            }
            setClassCount(c => (c ? c - 1 : null));
            setTimeout(() => setImportStatus(null), 4000);
            closeCourseDeleteDialog();
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (err instanceof Error) message = err.message;
            setImportStatus(`Delete course error: ${message}`);
            setTimeout(() => setImportStatus(null), 4000);
            closeCourseDeleteDialog();
        }
    }

    function openAddStudentsDialog() {
        setAddStudentsSearch('');
        setStudentsToAdd([]);
        setAddStudentsDialogOpen(true);
    }

    function closeAddStudentsDialog() {
        setAddStudentsDialogOpen(false);
        setAddStudentsSearch('');
        setStudentsToAdd([]);
    }

    function toggleStudentToAdd(id: string) {
        setStudentsToAdd(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    }

    async function handleAddStudentsToCourse() {
        if (!selectedViewCourse || !studentsToAdd.length) return;
        try {
            const form = new FormData();
            form.append('courseId', selectedViewCourse.id);
            form.append('students', studentsToAdd.join(','));
            const res = await fetch('/api/courses/enrollments', { method: 'POST', body: form });
            const json = await res.json();
            if (!res.ok || json?.success === false) {
                setImportStatus(`Add students failed: ${json?.error ?? res.statusText}`);
                setTimeout(() => setImportStatus(null), 4000);
                closeAddStudentsDialog();
                return;
            }
            setImportStatus('Students added to course');
            setTimeout(() => setImportStatus(null), 4000);
            closeAddStudentsDialog();
            // Refresh enrolled students
            handleSelectViewCourse(selectedViewCourse);
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (err instanceof Error) message = err.message;
            setImportStatus(`Add students error: ${message}`);
            setTimeout(() => setImportStatus(null), 4000);
            closeAddStudentsDialog();
        }
    }

    async function handleRemoveStudentFromCourse(studentId: string) {
        if (!selectedViewCourse) return;
        try {
            const form = new FormData();
            form.append('courseId', selectedViewCourse.id);
            form.append('studentId', studentId);
            const res = await fetch('/api/courses/enrollments', { method: 'DELETE', body: form });
            const json = await res.json();
            if (!res.ok || json?.success === false) {
                setImportStatus(`Remove student failed: ${json?.error ?? res.statusText}`);
                setTimeout(() => setImportStatus(null), 4000);
                return;
            }
            setEnrolledStudents(prev => prev.filter(s => s.id !== studentId));
            setImportStatus('Student removed from course');
            setTimeout(() => setImportStatus(null), 4000);
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (err instanceof Error) message = err.message;
            setImportStatus(`Remove student error: ${message}`);
            setTimeout(() => setImportStatus(null), 4000);
        }
    }

    async function openScheduleDialog(student: { id: string; username?: string; email?: string }) {
        setScheduleStudent(student);
        setStudentSchedule([]);
        setScheduleDialogOpen(true);
        try {
            setScheduleLoading(true);
            const res = await fetch(`/api/student/schedule?studentId=${encodeURIComponent(student.id)}`).then(r => r.json()).catch(() => null);
            if (res?.success && Array.isArray(res.data)) {
                setStudentSchedule(res.data);
            }
        } finally {
            setScheduleLoading(false);
        }
    }

    function closeScheduleDialog() {
        setScheduleDialogOpen(false);
        setScheduleStudent(null);
        setStudentSchedule([]);
    }

    // Schedule grid constants
    const SCHEDULE_START = 7 * 60; // 7:00 AM in minutes
    const SCHEDULE_END = 21 * 60; // 9:00 PM in minutes
    const TIME_SLOT_INTERVAL = 75; // 1 hour 15 minutes

    // Generate time slot labels (7:00, 8:15, 9:30, etc.)
    function getTimeSlots(): string[] {
        const slots: string[] = [];
        for (let t = SCHEDULE_START; t <= SCHEDULE_END; t += TIME_SLOT_INTERVAL) {
            const hours = Math.floor(t / 60);
            const mins = t % 60;
            const h12 = hours > 12 ? hours - 12 : hours;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            slots.push(`${h12}:${mins.toString().padStart(2, '0')} ${ampm}`);
        }
        return slots;
    }

    // Helper to parse schedule times and detect conflicts
    function getScheduleGrid(courses: ScheduleCourse[]) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const grid: Record<string, { course: string; time: string; start: number; end: number; conflictsWith?: string[] }[]> = {};
        days.forEach(d => grid[d] = []);

        // Parse time string like "1:15", "2:30", "13:00", etc.
        // If hour < 7, assume PM (school hours)
        const parseTime = (t: string): number => {
            const parts = t.split(':');
            let hours = parseInt(parts[0]) || 0;
            const mins = parseInt(parts[1]) || 0;
            // If hour is less than 7, it's likely PM (e.g., 1:15 = 13:15)
            if (hours < 7) {
                hours += 12;
            }
            return hours * 60 + mins;
        };

        courses.forEach(c => {
            if (!c.schedule || typeof c.schedule === 'string') return;
            Object.entries(c.schedule).forEach(([day, slot]) => {
                const d = day.toLowerCase();
                if (grid[d] && slot && typeof slot === 'object' && 'start' in slot && 'end' in slot) {
                    // Helper to format time in 12-hour format
                    const format12Hour = (t: string) => {
                        const [h, m] = t.split(':').map(Number);
                        let hour = h;
                        let ampm = 'AM';
                        if (hour === 0) {
                            hour = 12;
                        } else if (hour === 12) {
                            ampm = 'PM';
                        } else if (hour > 12) {
                            hour = hour - 12;
                            ampm = 'PM';
                        }
                        return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
                    };
                    const timeStr = `${format12Hour(slot.start)} - ${format12Hour(slot.end)}`;
                    grid[d].push({
                        course: c.name,
                        time: timeStr,
                        start: parseTime(slot.start),
                        end: parseTime(slot.end)
                    });
                }
            });
        });

        // Detect conflicts (same day, overlapping times)
        days.forEach(d => {
            const slots = grid[d];
            for (let i = 0; i < slots.length; i++) {
                for (let j = i + 1; j < slots.length; j++) {
                    if (slots[i].start < slots[j].end && slots[j].start < slots[i].end) {
                        const ciArr = slots[i].conflictsWith ?? (slots[i].conflictsWith = []);
                        const cjArr = slots[j].conflictsWith ?? (slots[j].conflictsWith = []);
                        ciArr.push(slots[j].course);
                        cjArr.push(slots[i].course);
                    }
                }
            }
        });

        return grid;
    }

    // Calculate position and height for a course block
    function getCourseStyle(start: number, end: number): React.CSSProperties {
        const totalMinutes = SCHEDULE_END - SCHEDULE_START;
        const topPercent = ((start - SCHEDULE_START) / totalMinutes) * 100;
        const heightPercent = ((end - start) / totalMinutes) * 100;
        return {
            position: 'absolute',
            top: `${topPercent}%`,
            height: `${heightPercent}%`,
            left: '2px',
            right: '2px',
        };
    }

    async function handleCreateCourse() {
        if (!courseName.trim()) {
            setImportStatus('Course name is required');
            setTimeout(() => setImportStatus(null), 4000);
            return;
        }

        try {
            setCreatingCourse(true);
            const form = new FormData();
            form.append('name', courseName.trim());
            form.append('schedule', courseSchedule.trim());
            if (selectedCourseStudents.length) form.append('students', selectedCourseStudents.join(','));

            const res = await fetch('/api/courses', { method: 'POST', body: form });
            const json = await res.json();
            if (!res.ok || json?.success === false) {
                setImportStatus(`Create course failed: ${json?.error ?? res.statusText}`);
                setTimeout(() => setImportStatus(null), 4000);
                return;
            }

            setImportStatus('Course created');
            setCourseName('');
            setCourseSchedule('');
            setSelectedCourseStudents([]);
            setTimeout(() => setImportStatus(null), 4000);

            // refresh class count
            try {
                const classCountRes = await fetch('/api/classes/count').then(r => r.json()).catch(() => null);
                if (classCountRes?.success) setClassCount(Number(classCountRes.data.count));
            } catch {
                // ignore
            }
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (err instanceof Error) message = err.message;
            setImportStatus(`Create course error: ${message}`);
            setTimeout(() => setImportStatus(null), 4000);
        } finally {
            setCreatingCourse(false);
        }
    }

    async function handleDeleteSchoolYear() {
        if (!schoolYearToDelete || deleteConfirmText !== 'delete') {
            return;
        }

        try {
            const form = new FormData();
            form.append('id', schoolYearToDelete);

            const res = await fetch('/api/school_year', {
                method: 'DELETE',
                body: form
            });
            const json = await res.json();

            if (!res.ok || json?.success === false) {
                setImportStatus(`School year deletion failed: ${json?.error ?? res.statusText}`);
                setTimeout(() => setImportStatus(null), 5000);
                closeDeleteDialog();
                return;
            }

            setImportStatus('School year deleted successfully');
            setTimeout(() => setImportStatus(null), 5000);

            if (schoolYearToDelete === activeSchoolYearId) setActiveSchoolYearId(null);
            // Refresh school year list
            const schoolYearRes: SchoolYearResponse = await fetch('/api/school_year').then(res => res.json());
            setSchoolYearList(schoolYearRes);
            if (schoolYearRes?.data?.length) setSelectedGroup(Math.max(0, (selectedGroup ?? 0) - 1));
            else setSelectedGroup(null);

            closeDeleteDialog();
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (err instanceof Error) {
                const error = err as Error;
                message = error.message;
            }
            setImportStatus(`School year deletion error: ${message}`);
            setTimeout(() => setImportStatus(null), 5000);
            closeDeleteDialog();
        }
    }

    async function handleSetActiveSchoolYear() {
        if (!schoolYearToActivate || activateConfirmText !== 'activate') {
            return;
        }

        try {
            const form = new FormData();
            form.append('id', schoolYearToActivate);

            const res = await fetch('/api/school_year/active', {
                method: 'POST',
                body: form
            });
            const json = await res.json();

            if (!res.ok || json?.success === false) {
                setImportStatus(`Set active failed: ${json?.error ?? res.statusText}`);
                setTimeout(() => setImportStatus(null), 5000);
                setActivateDialogOpen(false);
                return;
            }

            setImportStatus('Active school year set successfully');
            setActiveSchoolYearId(schoolYearToActivate);
            setTimeout(() => setImportStatus(null), 5000);

            // Refresh school year list
            const schoolYearRes: SchoolYearResponse = await fetch('/api/school_year').then(res => res.json());
            setSchoolYearList(schoolYearRes);

            setActivateDialogOpen(false);
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (err instanceof Error) {
                const error = err as Error;
                message = error.message;
            }
            setImportStatus(`Set active error: ${message}`);
            setTimeout(() => setImportStatus(null), 5000);
            setActivateDialogOpen(false);
        }
    }
    useEffect(() => {
        (async () => {
            const res: SchoolYearResponse = await fetch('/api/school_year').then(res => res.json());
            setSchoolYearList(res);
            // Set first group as selected
            if (res?.data?.length) {
                setSelectedGroup(0);
            }
            const studentCountRes = await fetch('/api/students/count').then(res => res.json());
            if (studentCountRes?.success) setStudentCount(Number(studentCountRes.data.count));
            const teacherCountRes = await fetch('/api/teachers/count').then(res => res.json());
            if (teacherCountRes?.success) setTeacherCount(Number(teacherCountRes.data.count));
            const classCountRes = await fetch('/api/classes/count').then(res => res.json());
            if (classCountRes?.success) setClassCount(Number(classCountRes.data.count));
            try {
                const activeRes = await fetch('/api/school_year/active').then(res => res.json());
                if (activeRes?.success && Array.isArray(activeRes.data) && activeRes.data[0]) {
                    setActiveSchoolYearId(String(activeRes.data[0].active_school_year));
                }
            } catch {
                // ignore
            }
            // fetch initial user lists for import section
            try {
                setUsersLoading(true);
                const [sRes, tRes] = await Promise.all([
                    fetch('/api/students').then(r => r.json()).catch(() => null),
                    fetch('/api/teachers').then(r => r.json()).catch(() => null),
                ]);
                if (sRes?.success && Array.isArray(sRes.data)) setStudents(sRes.data);
                if (tRes?.success && Array.isArray(tRes.data)) setTeachers(tRes.data);
            } finally {
                setUsersLoading(false);
            }
            // Fetch courses
            try {
                setCoursesLoading(true);
                const cRes = await fetch('/api/courses').then(r => r.json()).catch(() => null);
                if (cRes?.success && Array.isArray(cRes.data)) setCoursesList(cRes.data);
            } finally {
                setCoursesLoading(false);
            }
        })();
    }, []);
    return (
        <>
            <SamsTemplate links={[
                {
                    label: "User Management",
                    Icon: () => <PersonIcon width={20} height={20} />,
                    panels: [
                        <div key={1} className="stats-card">
                            <Image src="/icons/people.svg" alt="" width={40} height={40} />
                            <div className="stats-icon-group">
                                <Label.Root className="font-bold">Total Num of Students</Label.Root>
                                <span>{studentCount ?? 'Loading...'}</span>
                            </div>
                        </div>,
                        <div key={2} className="stats-card">
                            <Image src="/icons/people.svg" alt="" width={40} height={40} />
                            <div className="stats-icon-group">
                                <Label.Root className="font-bold">Total Num of Teachers</Label.Root>
                                <span>{teacherCount ?? 'Loading...'}</span>
                            </div>
                        </div>,
                        <div key={3} className="stats-card">
                            <Image src="/icons/notebook.svg" alt="" width={40} height={40} />
                            <div className="stats-icon-group">
                                <Label.Root className="font-bold">Total Num of Classes</Label.Root>
                                <span>{classCount ?? 'Loading...'}</span>
                            </div>
                        </div>
                    ],
                    content: <section className="import-section">
                        <div className="import-header">
                            <Label.Root className="import-section-title">Import</Label.Root>
                            <div className="import-actions">
                                <button className="import-button" onClick={() => studentFileRef.current?.click()}>
                                    <Label.Root>Students</Label.Root>
                                </button>
                                <button className="import-button" onClick={() => teacherFileRef.current?.click()}>
                                    <Label.Root>Teachers</Label.Root>
                                </button>
                                <button className="import-button">
                                    <Label.Root>Schedule</Label.Root>
                                </button>
                            </div>
                            <input
                                ref={studentFileRef}
                                type="file"
                                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleCsvUpload(f, '/api/students');
                                    e.currentTarget.value = '';
                                }}
                            />
                            <input
                                ref={teacherFileRef}
                                type="file"
                                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleCsvUpload(f, '/api/teachers');
                                    e.currentTarget.value = '';
                                }}
                            />
                        </div>
                        {importStatus && (
                            <div className="import-status">{importStatus}</div>
                        )}

                        <Tabs.Root defaultValue="students" className="user-tabs">
                            <Tabs.List className="tab-list" aria-label="User tabs">
                                <Tabs.Trigger value="students" className="tab-trigger">Students</Tabs.Trigger>
                                <Tabs.Trigger value="teachers" className="tab-trigger">Teachers</Tabs.Trigger>
                            </Tabs.List>

                            <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="school-year-input"
                                    placeholder="Search by name or email..."
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <Tabs.Content value="students" className="tab-content">
                                <div className="user-list">
                                    {usersLoading ? <div>Loading...</div> : (() => {
                                        const filtered = students
                                            .filter(s => {
                                                const q = userSearch.toLowerCase();
                                                return !q || (s.username?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
                                            })
                                            .sort((a, b) => (a.username ?? a.email ?? '').localeCompare(b.username ?? b.email ?? ''));
                                        return filtered.length ? filtered.map((s) => (
                                            <div key={s.id} className="user-item">
                                                <div className="user-left">
                                                    {((s.pfp ?? '/icons/placeholder-pfp.png').startsWith('http')) ? (
                                                        // external host - use native img to avoid next/image host config
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={s.pfp ?? '/icons/placeholder-pfp.png'} alt="" width={40} height={40} className="user-avatar" />
                                                    ) : (
                                                        <Image src={s.pfp ?? '/icons/placeholder-pfp.png'} alt="" width={40} height={40} className="user-avatar" />
                                                    )}
                                                    <div className="user-meta">
                                                        <div className="user-name">{s.username ?? s.email}</div>
                                                        <div className="user-email">{s.email}</div>
                                                    </div>
                                                </div>
                                                <div className="user-actions">
                                                    <button
                                                        className="user-schedule-button"
                                                        onClick={() => openScheduleDialog(s)}
                                                        title="View schedule"
                                                    >
                                                        <CalendarIcon />
                                                    </button>
                                                    <button
                                                        className="user-delete-button"
                                                        onClick={() => {
                                                            setUserToDeleteId(s.id);
                                                            setUserToDeleteType('student');
                                                            setUserDeleteConfirmText('');
                                                            setUserDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                </div>
                                            </div>
                                        )) : <div className="user-empty">No students found</div>;
                                    })()}
                                </div>
                            </Tabs.Content>

                            <Tabs.Content value="teachers" className="tab-content">
                                <div className="user-list">
                                    {usersLoading ? <div>Loading...</div> : (() => {
                                        const filtered = teachers
                                            .filter(t => {
                                                const q = userSearch.toLowerCase();
                                                return !q || (t.username?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q));
                                            })
                                            .sort((a, b) => (a.username ?? a.email ?? '').localeCompare(b.username ?? b.email ?? ''));
                                        return filtered.length ? filtered.map((t) => (
                                            <div key={t.id} className="user-item">
                                                <div className="user-left">
                                                    {((t.pfp ?? '/icons/placeholder-pfp.png').startsWith('http')) ? (
                                                        // external host - use native img to avoid next/image host config
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={t.pfp ?? '/icons/placeholder-pfp.png'} alt="" width={40} height={40} className="user-avatar" />
                                                    ) : (
                                                        <Image src={t.pfp ?? '/icons/placeholder-pfp.png'} alt="" width={40} height={40} className="user-avatar" />
                                                    )}
                                                    <div className="user-meta">
                                                        <div className="user-name">{t.username ?? t.email}</div>
                                                        <div className="user-email">{t.email}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    className="user-delete-button"
                                                    onClick={() => {
                                                        setUserToDeleteId(t.id);
                                                        setUserToDeleteType('teacher');
                                                        setUserDeleteConfirmText('');
                                                        setUserDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        )) : <div className="user-empty">No teachers found</div>;
                                    })()}
                                </div>
                            </Tabs.Content>
                        </Tabs.Root>

                        <Separator.Root orientation="horizontal" className="sams-separator" />
                    </section>
                },
                {
                    label: "School year",
                    Icon: () => <Image src="/icons/sheet.svg" alt="" width={20} height={20} style={{ filter: "brightness(0)" }} />,
                    panels: [
                        <div key={1} className="stats-card">
                            <Image src="/icons/people.svg" alt="" width={40} height={40} />
                            <div className="stats-icon-group">
                                <Label.Root className="font-bold">Total Num of Students</Label.Root>
                                <span>{studentCount ?? 'Loading...'}</span>
                            </div>
                        </div>,
                        <div key={2} className="stats-card">
                            <Image src="/icons/people.svg" alt="" width={40} height={40} />
                            <div className="stats-icon-group">
                                <Label.Root className="font-bold">Total Num of Teachers</Label.Root>
                                <span>{teacherCount ?? 'Loading...'}</span>
                            </div>
                        </div>,
                        <div key={3} className="stats-card">
                            <Image src="/icons/notebook.svg" alt="" width={40} height={40} />
                            <div className="stats-icon-group">
                                <Label.Root className="font-bold">Total Num of Classes</Label.Root>
                                <span>{classCount ?? 'Loading...'}</span>
                            </div>
                        </div>
                    ],
                    content: <>
                        <div className="admin-content">
                            <div className="school-year-form">
                                <Label.Root className="school-year-form-title">Create School Year</Label.Root>
                                <div className="school-year-form-container w-full">
                                    <div className="form-field-group">
                                        <Label.Root className="form-field-label">School Year</Label.Root>
                                        <input
                                            type="text"
                                            placeholder="e.g., 2024"
                                            value={schoolYear}
                                            onChange={(e) => setSchoolYear(e.target.value)}
                                            className="school-year-input"
                                        />
                                    </div>
                                    <div className="form-field-group">
                                        <Label.Root className="form-field-label">Notes</Label.Root>
                                        <textarea
                                            placeholder="Add notes about this school year..."
                                            value={schoolYearNotes}
                                            onChange={(e) => setSchoolYearNotes(e.target.value)}
                                            className="school-year-notes-textarea"
                                            rows={3}
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreateSchoolYear}
                                        disabled={schoolYearLoading}
                                        className="import-button" style={{ marginTop: '0.5rem' }}
                                    >
                                        <Label.Root>{schoolYearLoading ? 'Creating...' : 'Create School Year'}</Label.Root>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <section>
                                    <ToggleGroup.Root
                                        type="single"
                                        className="school-year-group"
                                        value={selectedGroup?.toString() ?? ''}
                                        onValueChange={(val) => setSelectedGroup(val ? parseInt(val) : null)}
                                    >
                                        {(() => {
                                            const totalSchoolYears = schoolYearList?.data?.length ?? 0;
                                            const numGroups = Math.ceil(totalSchoolYears / groupSize);
                                            return Array.from({ length: numGroups }, (_, i) => (
                                                <ToggleGroup.Item key={i} value={i.toString()} className="school-year-group-item">
                                                    {i + 1}
                                                </ToggleGroup.Item>
                                            ));
                                        })()}
                                    </ToggleGroup.Root>
                                </section>
                                <section>
                                    <div className="school-year">
                                        {(() => {
                                            const allSchoolYears = schoolYearList?.data
                                                ?.sort((a, b) => {
                                                    // First sort by school year (descending)
                                                    if (a.school_year !== b.school_year) {
                                                        return parseInt(b.school_year) - parseInt(a.school_year);
                                                    }
                                                    // Then sort by creation date (descending)
                                                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                                                });
                                            if (!allSchoolYears?.length || selectedGroup === null) return null;

                                            // Divide school years into groups of 6
                                            const startIdx = selectedGroup * groupSize;
                                            const endIdx = startIdx + groupSize;
                                            const selectedSchoolYears = allSchoolYears.slice(startIdx, endIdx);

                                            return selectedSchoolYears.map((selected) => (
                                                <div
                                                    key={selected.id}
                                                    className="school-year-item"
                                                    style={{
                                                        border: selected.id === activeSchoolYearId ? '2px solid #059669' : undefined,
                                                        backgroundColor: selected.id === activeSchoolYearId ? '#ecfdf5' : undefined
                                                    }}
                                                >
                                                    <div className="school-year-item-header">
                                                        <div className="school-year-metadata">
                                                            <span className="school-year-year-info">School Year: {selected.school_year} - {parseInt(selected.school_year) + 1}</span>
                                                            <span className="school-year-created-info">Created: {new Date(selected.created_at).toLocaleString()}</span>
                                                        </div>
                                                        <div className="school-year-item-actions">
                                                            {selected.id === activeSchoolYearId ? (
                                                                <button className="school-year-active-indicator import-button" disabled style={{ backgroundColor: '#059669' }}>
                                                                    <Label.Root>Active</Label.Root>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => openActivateDialog(selected.id)}
                                                                    className="school-year-activate-button"
                                                                >
                                                                    <Label.Root>Inactive</Label.Root>
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => openDeleteDialog(selected.id)}
                                                                className="school-year-delete-button"
                                                            >
                                                                <TrashIcon />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="school-year-item-content">
                                                        {selected.notes}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </>
                },
                {
                    label: "Courses",
                    Icon: () => <Image src="/icons/notebook.svg" alt="" width={20} height={20} style={{ filter: "brightness(0)" }} />,
                    panels: [
                        <div key={1} className="stats-card">
                            <Image src="/icons/people.svg" alt="" width={40} height={40} />
                            <div className="stats-icon-group">
                                <Label.Root className="font-bold">Total Num of Students</Label.Root>
                                <span>{studentCount ?? 'Loading...'}</span>
                            </div>
                        </div>,
                        <div key={2} className="stats-card">
                            <Image src="/icons/notebook.svg" alt="" width={40} height={40} />
                            <div className="stats-icon-group">
                                <Label.Root className="font-bold">Total Num of Classes</Label.Root>
                                <span>{classCount ?? 'Loading...'}</span>
                            </div>
                        </div>
                    ],
                    content: <section className="import-section">
                        {importStatus && <div className="import-status">{importStatus}</div>}

                        <Tabs.Root defaultValue="view" className="user-tabs" style={{ width: '100%' }}>
                            <Tabs.List className="tab-list" aria-label="Course tabs">
                                <Tabs.Trigger value="view" className="tab-trigger">View Courses</Tabs.Trigger>
                                <Tabs.Trigger value="create" className="tab-trigger">Create Course</Tabs.Trigger>
                            </Tabs.List>

                            <Tabs.Content value="view" className="tab-content">
                                <div className="course-viewer">
                                    <div className="course-viewer-left">
                                        <Label.Root className="form-field-label">Search Courses</Label.Root>
                                        <input
                                            type="text"
                                            value={courseViewerSearch}
                                            onChange={(e) => setCourseViewerSearch(e.target.value)}
                                            className="school-year-input"
                                            placeholder="Search by name..."
                                            style={{ marginBottom: '0.5rem', width: '100%' }}
                                        />
                                        <div className="course-select-list">
                                            {coursesLoading ? <div>Loading courses...</div> : (
                                                (() => {
                                                    const filtered = coursesList.filter(c => c.name.toLowerCase().includes(courseViewerSearch.toLowerCase()));
                                                    return filtered.length ? (
                                                        filtered.map(c => (
                                                            <button
                                                                key={c.id}
                                                                className={`course-select-item ${selectedViewCourse?.id === c.id ? 'selected' : ''}`}
                                                                onClick={() => handleSelectViewCourse(c)}
                                                            >
                                                                <span className="course-select-name">{c.name}</span>
                                                                {c.schedule && <span className="course-select-schedule">{typeof c.schedule === 'string' ? c.schedule : Object.keys(c.schedule).join(', ')}</span>}
                                                            </button>
                                                        ))
                                                    ) : <div className="user-empty">No courses found</div>;
                                                })()
                                            )}
                                        </div>
                                    </div>
                                    <div className="course-viewer-right">
                                        {selectedViewCourse ? (
                                            <>
                                                <div className="course-header-row">
                                                    <Label.Root className="archive-form-title">{selectedViewCourse.name}</Label.Root>
                                                    <button className="archive-delete-button" onClick={() => openCourseDeleteDialog(selectedViewCourse)} title="Delete course">
                                                        <TrashIcon />
                                                    </button>
                                                </div>
                                                {selectedViewCourse.schedule && <div className="course-schedule-info">{typeof selectedViewCourse.schedule === 'string' ? selectedViewCourse.schedule : Object.keys(selectedViewCourse.schedule).join(', ')}</div>}
                                                <Separator.Root orientation="horizontal" className="sams-separator" style={{ margin: '0.75rem 0' }} />
                                                <Label.Root className="form-field-label">Enrolled Students</Label.Root>
                                                <input
                                                    type="text"
                                                    value={enrolledSearch}
                                                    onChange={(e) => setEnrolledSearch(e.target.value)}
                                                    className="school-year-input"
                                                    placeholder="Search enrolled students..."
                                                    style={{ marginBottom: '0.5rem', width: '100%' }}
                                                />
                                                <div className="enrolled-students-list">
                                                    {enrolledLoading ? <div>Loading students...</div> : (
                                                        (() => {
                                                            const q = enrolledSearch.toLowerCase();
                                                            const filtered = enrolledStudents.filter(s => (s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)));
                                                            return filtered.length ? (
                                                                filtered.map(s => (
                                                                    <div key={s.id} className="enrolled-student-item">
                                                                        <div className="enrolled-student-info">
                                                                            <div className="enrolled-student-name">{s.name ?? s.email}</div>
                                                                            {s.section && <div className="enrolled-student-section">Section: {s.section}</div>}
                                                                        </div>
                                                                        <button className="student-remove-button" onClick={() => handleRemoveStudentFromCourse(s.id)} title="Remove from course">
                                                                            <TrashIcon />
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            ) : <div className="user-empty">No enrolled students{enrolledStudents.length ? ' matching search' : ''}</div>;
                                                        })()
                                                    )}
                                                </div>
                                                <button className="import-button" onClick={openAddStudentsDialog} style={{ marginTop: '0.75rem', alignSelf: 'flex-start' }}>
                                                    <Label.Root>Add Students</Label.Root>
                                                </button>
                                            </>
                                        ) : (
                                            <div className="user-empty" style={{ textAlign: 'center', padding: '2rem' }}>Select a course to view enrolled students</div>
                                        )}
                                    </div>
                                </div>
                            </Tabs.Content>

                            <Tabs.Content value="create" className="tab-content">
                                <div className="archive-form full-form">
                                    <Label.Root className="archive-form-title">Create Course</Label.Root>
                                    <div className="archive-form-container w-full">
                                        <div className="form-field-group">
                                            <Label.Root className="form-field-label">Course Name</Label.Root>
                                            <input type="text" value={courseName} onChange={(e) => setCourseName(e.target.value)} className="school-year-input" placeholder="e.g., Algebra 1" />
                                        </div>
                                        <div className="form-field-group">
                                            <Label.Root className="form-field-label">Schedule (optional)</Label.Root>
                                            <input type="text" value={courseSchedule} onChange={(e) => setCourseSchedule(e.target.value)} className="school-year-input" placeholder="e.g., Mon/Wed/Fri 9:00-10:00" />
                                        </div>

                                        <div className="form-field-group">
                                            <Label.Root className="form-field-label">Assign Students</Label.Root>
                                            <input
                                                type="text"
                                                value={courseStudentSearch}
                                                onChange={(e) => setCourseStudentSearch(e.target.value)}
                                                className="school-year-input"
                                                placeholder="Search students..."
                                                style={{ marginBottom: '0.5rem' }}
                                            />
                                            <div className="student-checkbox-list">
                                                {usersLoading ? <div>Loading students...</div> : (
                                                    (() => {
                                                        const filtered = students
                                                            .filter(s => {
                                                                const q = courseStudentSearch.toLowerCase();
                                                                return (s.username?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
                                                            })
                                                            .sort((a, b) => (a.username ?? a.email ?? '').localeCompare(b.username ?? b.email ?? ''));
                                                        return filtered.length ? (
                                                            filtered.map(s => (
                                                                <label key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                    <input type="checkbox" checked={selectedCourseStudents.includes(s.id)} onChange={() => toggleCourseStudent(s.id)} />
                                                                    <span style={{ fontSize: 14 }}>{s.username ?? s.email}</span>
                                                                </label>
                                                            ))
                                                        ) : <div className="user-empty">No students found</div>;
                                                    })()
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            <button className="import-button" onClick={() => { setCourseName(''); setCourseSchedule(''); setSelectedCourseStudents([]); }} style={{ backgroundColor: '#6b7280' }}>
                                                <Label.Root>Clear</Label.Root>
                                            </button>
                                            <button className="import-button" onClick={async () => { await handleCreateCourse(); const cRes = await fetch('/api/courses').then(r => r.json()).catch(() => null); if (cRes?.success && Array.isArray(cRes.data)) setCoursesList(cRes.data); }} disabled={creatingCourse}>
                                                <Label.Root>{creatingCourse ? 'Creating...' : 'Create Course'}</Label.Root>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Tabs.Content>
                        </Tabs.Root>
                    </section>
                }
            ]} />
            <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content">
                        <Dialog.Title className="dialog-title">Confirm School Year Deletion</Dialog.Title>
                        <Dialog.Description className="dialog-description">
                            This action cannot be undone. Type <strong>delete</strong> to confirm.
                        </Dialog.Description>
                        <div className="form-field-group" style={{ marginTop: '1rem' }}>
                            <Label.Root className="form-field-label">Type &apos;delete&apos; to confirm</Label.Root>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="school-year-input"
                                placeholder="delete"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={closeDeleteDialog}
                                className="import-button"
                                style={{ backgroundColor: '#6b7280' }}
                            >
                                <Label.Root>Cancel</Label.Root>
                            </button>
                            <button
                                onClick={handleDeleteSchoolYear}
                                disabled={deleteConfirmText !== 'delete'}
                                className="import-button"
                                style={{
                                    backgroundColor: deleteConfirmText === 'delete' ? '#ef4444' : '#9ca3af',
                                    opacity: deleteConfirmText === 'delete' ? 1 : 0.5,
                                    cursor: deleteConfirmText === 'delete' ? 'pointer' : 'not-allowed'
                                }}
                            >
                                <Label.Root>Delete School Year</Label.Root>
                            </button>
                        </div>
                        <Dialog.Close asChild>
                            <button className="dialog-close" aria-label="Close">
                                ×
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
            <Dialog.Root open={userDeleteDialogOpen} onOpenChange={setUserDeleteDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content">
                        <Dialog.Title className="dialog-title">Confirm User Deletion</Dialog.Title>
                        <Dialog.Description className="dialog-description">
                            This action cannot be undone. Type <strong>delete</strong> to confirm deleting the selected user.
                        </Dialog.Description>
                        <div className="form-field-group" style={{ marginTop: '1rem' }}>
                            <Label.Root className="form-field-label">Type &apos;delete&apos; to confirm</Label.Root>
                            <input
                                type="text"
                                value={userDeleteConfirmText}
                                onChange={(e) => setUserDeleteConfirmText(e.target.value)}
                                className="school-year-input"
                                placeholder="delete"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={closeUserDeleteDialog}
                                className="import-button"
                                style={{ backgroundColor: '#6b7280' }}
                            >
                                <Label.Root>Cancel</Label.Root>
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={userDeleteConfirmText !== 'delete'}
                                className="import-button"
                                style={{
                                    backgroundColor: userDeleteConfirmText === 'delete' ? '#ef4444' : '#9ca3af',
                                    opacity: userDeleteConfirmText === 'delete' ? 1 : 0.5,
                                    cursor: userDeleteConfirmText === 'delete' ? 'pointer' : 'not-allowed'
                                }}
                            >
                                <Label.Root>Delete User</Label.Root>
                            </button>
                        </div>
                        <Dialog.Close asChild>
                            <button className="dialog-close" aria-label="Close">
                                ×
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
            <Dialog.Root open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content">
                        <Dialog.Title className="dialog-title">Confirm Set Active School Year</Dialog.Title>
                        <Dialog.Description className="dialog-description">
                            This will mark the selected school year as the active school year. Type <strong>activate</strong> to confirm.
                        </Dialog.Description>
                        <div className="form-field-group" style={{ marginTop: '1rem' }}>
                            <Label.Root className="form-field-label">Type &apos;activate&apos; to confirm</Label.Root>
                            <input
                                type="text"
                                value={activateConfirmText}
                                onChange={(e) => setActivateConfirmText(e.target.value)}
                                className="school-year-input"
                                placeholder="activate"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setActivateDialogOpen(false)}
                                className="import-button"
                                style={{ backgroundColor: '#6b7280' }}
                            >
                                <Label.Root>Cancel</Label.Root>
                            </button>
                            <button
                                onClick={handleSetActiveSchoolYear}
                                disabled={activateConfirmText !== 'activate'}
                                className="import-button"
                                style={{
                                    backgroundColor: activateConfirmText === 'activate' ? '#059669' : '#9ca3af',
                                    opacity: activateConfirmText === 'activate' ? 1 : 0.5,
                                    cursor: activateConfirmText === 'activate' ? 'pointer' : 'not-allowed'
                                }}
                            >
                                <Label.Root>Set Active</Label.Root>
                            </button>
                        </div>
                        <Dialog.Close asChild>
                            <button className="dialog-close" aria-label="Close">
                                ×
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
            <Dialog.Root open={courseDeleteDialogOpen} onOpenChange={setCourseDeleteDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content">
                        <Dialog.Title className="dialog-title">Confirm Course Deletion</Dialog.Title>
                        <Dialog.Description className="dialog-description">
                            This will delete the course <strong>{courseToDelete?.name}</strong> and all its enrollments. Type <strong>delete</strong> to confirm.
                        </Dialog.Description>
                        <div className="form-field-group" style={{ marginTop: '1rem' }}>
                            <Label.Root className="form-field-label">Type &apos;delete&apos; to confirm</Label.Root>
                            <input
                                type="text"
                                value={courseDeleteConfirmText}
                                onChange={(e) => setCourseDeleteConfirmText(e.target.value)}
                                className="school-year-input"
                                placeholder="delete"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={closeCourseDeleteDialog}
                                className="import-button"
                                style={{ backgroundColor: '#6b7280' }}
                            >
                                <Label.Root>Cancel</Label.Root>
                            </button>
                            <button
                                onClick={handleDeleteCourse}
                                disabled={courseDeleteConfirmText !== 'delete'}
                                className="import-button"
                                style={{
                                    backgroundColor: courseDeleteConfirmText === 'delete' ? '#ef4444' : '#9ca3af',
                                    opacity: courseDeleteConfirmText === 'delete' ? 1 : 0.5,
                                    cursor: courseDeleteConfirmText === 'delete' ? 'pointer' : 'not-allowed'
                                }}
                            >
                                <Label.Root>Delete Course</Label.Root>
                            </button>
                        </div>
                        <Dialog.Close asChild>
                            <button className="dialog-close" aria-label="Close">
                                ×
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
            <Dialog.Root open={addStudentsDialogOpen} onOpenChange={setAddStudentsDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content" style={{ maxWidth: '32rem' }}>
                        <Dialog.Title className="dialog-title">Add Students to {selectedViewCourse?.name}</Dialog.Title>
                        <Dialog.Description className="dialog-description">
                            Select students to add to this course.
                        </Dialog.Description>
                        <div className="form-field-group" style={{ marginTop: '1rem' }}>
                            <Label.Root className="form-field-label">Search Students</Label.Root>
                            <input
                                type="text"
                                value={addStudentsSearch}
                                onChange={(e) => setAddStudentsSearch(e.target.value)}
                                className="school-year-input"
                                placeholder="Search by name or email..."
                                style={{ marginBottom: '0.5rem' }}
                            />
                            <div className="student-checkbox-list" style={{ maxHeight: '16rem' }}>
                                {(() => {
                                    const enrolledIds = new Set(enrolledStudents.map(s => s.id));
                                    const available = students
                                        .filter(s => !enrolledIds.has(s.id))
                                        .filter(s => {
                                            const q = addStudentsSearch.toLowerCase();
                                            return (s.username?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
                                        })
                                        .sort((a, b) => (a.username ?? a.email ?? '').localeCompare(b.username ?? b.email ?? ''));
                                    return available.length ? (
                                        available.map(s => (
                                            <label key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <input type="checkbox" checked={studentsToAdd.includes(s.id)} onChange={() => toggleStudentToAdd(s.id)} />
                                                <span style={{ fontSize: 14 }}>{s.username ?? s.email}</span>
                                            </label>
                                        ))
                                    ) : <div className="user-empty">No available students</div>;
                                })()}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={closeAddStudentsDialog}
                                className="import-button"
                                style={{ backgroundColor: '#6b7280' }}
                            >
                                <Label.Root>Cancel</Label.Root>
                            </button>
                            <button
                                onClick={handleAddStudentsToCourse}
                                disabled={!studentsToAdd.length}
                                className="import-button"
                                style={{
                                    opacity: studentsToAdd.length ? 1 : 0.5,
                                    cursor: studentsToAdd.length ? 'pointer' : 'not-allowed'
                                }}
                            >
                                <Label.Root>Add {studentsToAdd.length ? `(${studentsToAdd.length})` : ''}</Label.Root>
                            </button>
                        </div>
                        <Dialog.Close asChild>
                            <button className="dialog-close" aria-label="Close">
                                ×
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Student Schedule Dialog */}
            <Dialog.Root open={scheduleDialogOpen} onOpenChange={(open) => { if (!open) closeScheduleDialog(); }}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content schedule-dialog">
                        <Dialog.Title className="dialog-title">
                            Schedule for {scheduleStudent?.username ?? scheduleStudent?.email ?? 'Student'}
                        </Dialog.Title>
                        <Dialog.Description className="dialog-description">
                            Weekly schedule showing all enrolled courses.
                        </Dialog.Description>
                        {scheduleLoading ? (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading schedule...</div>
                        ) : studentSchedule.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                No enrolled courses with schedules.
                            </div>
                        ) : (
                            <div className="schedule-grid-container">
                                {/* Time labels column */}
                                <div className="schedule-time-column">
                                    <div className="schedule-time-header"></div>
                                    <div className="schedule-time-labels">
                                        {getTimeSlots().map((time, idx) => {
                                            const totalMinutes = SCHEDULE_END - SCHEDULE_START;
                                            const slotMinutes = idx * TIME_SLOT_INTERVAL;
                                            const topPercent = (slotMinutes / totalMinutes) * 100;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="schedule-time-label"
                                                    style={{ top: `${topPercent}%` }}
                                                >
                                                    {time}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {/* Day columns */}
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIdx) => {
                                    const fullDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayIdx];
                                    const grid = getScheduleGrid(studentSchedule);
                                    const slots = grid[fullDay] || [];
                                    const totalMinutes = SCHEDULE_END - SCHEDULE_START;
                                    return (
                                        <div key={day} className="schedule-day-column">
                                            <div className="schedule-day-header">{day}</div>
                                            <div className="schedule-day-body">
                                                {/* Grid lines */}
                                                {getTimeSlots().map((_, idx) => {
                                                    const slotMinutes = idx * TIME_SLOT_INTERVAL;
                                                    const topPercent = (slotMinutes / totalMinutes) * 100;
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="schedule-grid-line"
                                                            style={{ top: `${topPercent}%` }}
                                                        />
                                                    );
                                                })}
                                                {/* Course blocks */}
                                                {slots.map((slot, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`schedule-course-block ${slot.conflictsWith?.length ? 'schedule-conflict' : ''}`}
                                                        style={getCourseStyle(slot.start, slot.end)}
                                                        title={slot.conflictsWith?.length ? `Conflicts with: ${slot.conflictsWith.join(', ')}` : slot.time}
                                                    >
                                                        <div className="schedule-course-name">{slot.course}</div>
                                                        <div className="schedule-course-time">{slot.time}</div>
                                                        {slot.conflictsWith?.length ? (
                                                            <div className="schedule-conflict-badge">⚠</div>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={closeScheduleDialog} className="import-button">
                                <Label.Root>Close</Label.Root>
                            </button>
                        </div>
                        <Dialog.Close asChild>
                            <button className="dialog-close" aria-label="Close">
                                ×
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    );
}