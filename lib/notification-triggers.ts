/**
 * Utility functions to trigger push notifications for various events
 */

async function triggerNotification(
  type: 'student_notification' | 'parent_notification' | 'teacher_appeal' | 'attendance_alert',
  userId: string,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  try {
    const response = await fetch('/api/notifications/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        userId,
        title,
        message,
        data
      })
    });

    if (!response.ok) {
      console.error('Failed to trigger notification:', response.statusText);
      return false;
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error triggering notification:', error);
    return false;
  }
}

/**
 * Trigger when a student receives a new notification
 */
export async function notifyStudentNotification(
  studentId: string,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  return triggerNotification(
    'student_notification',
    studentId,
    title,
    message,
    data
  );
}

/**
 * Trigger when a parent receives a notification (related to their child)
 */
export async function notifyParentNotification(
  studentId: string,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  return triggerNotification(
    'parent_notification',
    studentId,
    title,
    message,
    data
  );
}

/**
 * Trigger when a teacher receives an appeal from a student
 */
export async function notifyTeacherAppeal(
  courseId: string,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  return triggerNotification(
    'teacher_appeal',
    '',
    title,
    message,
    {
      ...data,
      courseId
    }
  );
}

/**
 * Trigger attendance alert for student and parents
 */
export async function notifyAttendanceAlert(
  studentId: string,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  return triggerNotification(
    'attendance_alert',
    studentId,
    title,
    message,
    data
  );
}

/**
 * Send a bulk notification to multiple students
 */
export async function notifyMultipleStudents(
  studentIds: string[],
  title: string,
  message: string,
  data?: Record<string, any>
) {
  const promises = studentIds.map(id =>
    notifyStudentNotification(id, title, message, data)
  );

  const results = await Promise.allSettled(promises);
  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const failed = results.length - succeeded;

  return {
    total: results.length,
    succeeded,
    failed
  };
}
