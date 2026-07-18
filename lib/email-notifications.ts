import nodemailer from 'nodemailer';
import db from '@/app/services/database';

type Recipient = {
	userId: string;
	email: string;
	username: string | null;
};

type AttendanceStatus = 'present' | 'late' | 'absent';
type AppealDecision = 'approved' | 'rejected';

const smtpPort = Number(process.env.SMTP_PORT || 465);
const APP_URL = process.env.SAMS_API_URL || '';

function escapeHtml(value: string) {
	return value.replace(/[&<>'"]/g, (character) => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		"'": '&#39;',
		'"': '&quot;',
	}[character] || character));
}

function createTransporter() {
	const host = process.env.SMTP_HOST;
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;

	if (!host || !user || !pass) {
		return null;
	}

	return nodemailer.createTransport({
		host,
		port: smtpPort,
		secure: smtpPort === 465,
		auth: {
			user,
			pass,
		},
	});
}

async function hasEmailEnabled(userId: string) {
	const result = await db.query(
		`SELECT COALESCE(email_enabled, true) AS email_enabled
		 FROM notification_preferences
		 WHERE user_id = $1
		 LIMIT 1`,
		[userId]
	);

	return result.rows.length === 0 || result.rows[0].email_enabled !== false;
}

async function resolveRecipients(userIds: string[]) {
	if (userIds.length === 0) {
		return [] as Recipient[];
	}

	console.log(`🔍 Resolving ${userIds.length} recipient(s): ${userIds.join(', ')}`);

	const result = await db.query(
		`SELECT a.id AS user_id, a.email, a.username
		 FROM account a
		 WHERE a.id = ANY($1::text[])
			 AND a.email IS NOT NULL`,
		[userIds]
	);

	console.log(`✓ Found ${result.rows.length} account(s) with email addresses`);

	const recipients: Recipient[] = [];

	for (const row of result.rows) {
		if (await hasEmailEnabled(row.user_id)) {
			console.log(`  → ${row.username || 'Unknown'} (${row.user_id}): ${row.email}`);
			recipients.push({
				userId: row.user_id,
				email: row.email,
				username: row.username,
			});
		} else {
			console.log(`  ✗ ${row.username || 'Unknown'} (${row.user_id}): Email disabled`);
		}
	}

	return recipients;
}

async function sendEmail(to: string, subject: string, text: string, html: string) {
	const transporter = createTransporter();

	if (!transporter) {
		console.warn('SMTP is not configured; skipping email notification.');
		return false;
	}

	try {
		const info = await transporter.sendMail({
			from: process.env.SMTP_FROM || process.env.SMTP_USER,
			to,
			subject,
			text,
			html,
		});
		console.log(`✅ Email sent successfully to ${to}: ${info.messageId}`);
		return true;
	} catch (error) {
		console.error(`❌ Failed to send email to ${to}:`, error);
		return false;
	}
}

async function sendToRecipients(userIds: string[], subject: string, text: string, html: string) {
	const recipients = await resolveRecipients(userIds);

	if (recipients.length === 0) {
		console.warn(`⚠️  No recipients found for ${userIds.length} user ID(s)`);
		return { sent: 0, skipped: userIds.length };
	}

	console.log(`📧 Sending "${subject}" email to ${recipients.length} recipient(s): ${recipients.map(r => r.email).join(', ')}`);

	const results = await Promise.allSettled(
		recipients.map((recipient) => sendEmail(recipient.email, subject, text, html))
	);

	const sent = results.filter((result) => result.status === 'fulfilled' && result.value).length;

	return {
		sent,
		skipped: recipients.length - sent,
	};
}

export async function sendAttendanceUpdateEmail(options: {
	studentId: string;
	parentIds: string[];
	teacherId?: string | null;
	studentName: string;
	courseName: string;
	teacherName?: string | null;
	roomId?: string | null;
	classTime?: string | null;
	status: AttendanceStatus;
	recordedTime: string;
	recordedDate: string;
}) {
	const {
		studentId,
		parentIds,
		teacherId,
		studentName,
		courseName,
		teacherName,
		roomId,
		classTime,
		status,
		recordedTime,
		recordedDate,
	} = options;

	const subjectMap: Record<AttendanceStatus, string> = {
		present: 'Present Attendance Recorded',
		late: 'Late Attendance Recorded',
		absent: 'Absence Recorded',
	};

	const attendanceDescription = status === 'absent'
		? `was marked absent on ${recordedDate}`
		: `was marked ${status} at ${recordedTime} on ${recordedDate}`;
	const details = [
		`Student: ${studentName}`,
		`Subject: ${courseName}`,
		`Teacher: ${teacherName || 'Not assigned'}`,
		`Room: ${roomId || 'Not specified'}`,
		`Class time: ${classTime || 'Not specified'}`,
	].join('\n');
	const htmlDetails = [
		['Student', studentName],
		['Subject', courseName],
		['Teacher', teacherName || 'Not assigned'],
		['Room', roomId || 'Not specified'],
		['Class time', classTime || 'Not specified'],
	].map(([label, value]) => `<tr><td style="padding:6px 12px 6px 0;font-weight:600">${escapeHtml(label)}</td><td style="padding:6px 0">${escapeHtml(value)}</td></tr>`).join('');
	const emailHtml = (message: string) => `<p>${escapeHtml(message)}</p><table style="border-collapse:collapse">${htmlDetails}</table>`;

	const studentText = `${studentName}, you ${attendanceDescription} for ${courseName}.\n\n${details}\n\nView details: ${APP_URL}/student-portal`;
	const teacherText = `${studentName} ${attendanceDescription} for ${courseName}.\n\n${details}\n\nView details: ${APP_URL}/teacher-portal`;

	const studentHtml = emailHtml(studentText.split('\n\n')[0]) + `<p><a href="${APP_URL}/student-portal" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:6px">View in Student Portal</a></p>`;
	const teacherHtml = emailHtml(teacherText.split('\n\n')[0]) + `<p><a href="${APP_URL}/teacher-portal" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:6px">View in Teacher Portal</a></p>`;

	const targetGroups = [
		{ userIds: [studentId], subject: `${subjectMap[status]} — ${courseName}`, text: studentText, html: studentHtml },
		// Parents receive a consolidated daily summary instead of individual real-time emails
		...(teacherId
			? [{ userIds: [teacherId], subject: `Attendance: ${status === 'present' ? 'Present' : status === 'late' ? 'Late' : 'Absent'}`, text: teacherText, html: teacherHtml }]
			: []),
	];

	console.log(`\n📬 ========== ATTENDANCE EMAIL NOTIFICATION ==========`);
	console.log(`Course: ${courseName} | Status: ${status} | Time: ${recordedTime}`);
	console.log(`Sending to:`);
	console.log(`  • Student: ${studentId}`);
	if (parentIds.length > 0) console.log(`  • Parents: ${parentIds.join(', ')}`);
	if (teacherId) console.log(`  • Teacher: ${teacherId}`);
	console.log(`====================================================\n`);

	const results = await Promise.allSettled(
		targetGroups.map((group) => sendToRecipients(group.userIds, group.subject, group.text, group.html))
	);

	return {
		sent: results.filter((result) => result.status === 'fulfilled').length,
		failed: results.filter((result) => result.status === 'rejected').length,
	};
}

export async function sendAppealDecisionEmail(options: {
	studentId: string;
	courseName: string;
	decision: AppealDecision;
	teacherResponse?: string | null;
}) {
	const { studentId, courseName, decision, teacherResponse } = options;

	const subject = `Appeal ${decision === 'approved' ? 'Approved' : 'Rejected'}`;
	const text =
		(decision === 'approved'
			? `Your appeal for ${courseName} has been approved. The attendance record has been corrected.`
			: `Your appeal for ${courseName} has been rejected. Teacher response: ${teacherResponse || 'No response provided'}`) +
		`\n\nView details: ${APP_URL}/student-portal`;

	const html = `<p>${escapeHtml(text.split('\n\n')[0])}</p><p><a href="${APP_URL}/student-portal" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:6px">View in Student Portal</a></p>`;

	return sendToRecipients([studentId], subject, text, html);
}

export async function sendAppealNotificationToTeacher(options: {
	teacherId: string;
	studentName: string;
	courseName: string;
	recordedStatus: string;
	reason: string;
}) {
	const { teacherId, studentName, courseName, recordedStatus, reason } = options;

	const subject = `New Student Appeal — ${courseName}`;
	const text = `${studentName} has submitted an appeal for their ${recordedStatus} attendance in ${courseName}.\n\nReason: ${reason}\n\nReview: ${APP_URL}/teacher-portal`;
	const html = `<p><strong>${escapeHtml(studentName)}</strong> has submitted an appeal for their <strong>${escapeHtml(recordedStatus)}</strong> attendance in <strong>${escapeHtml(courseName)}</strong>.</p><p><strong>Reason:</strong> ${escapeHtml(reason)}</p><p><a href="${APP_URL}/teacher-portal" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Review in Teacher Portal</a></p>`;

		return sendToRecipients([teacherId], subject, text, html);
}

export async function sendParentAppealDecisionEmail(options: {
	parentId: string;
	studentName: string;
	courseName: string;
	finalAttendance: string;
	decision: AppealDecision;
	teacherResponse?: string | null;
}) {
	const { parentId, studentName, courseName, finalAttendance, decision, teacherResponse } = options;

	const subject = `Attendance Update: ${studentName} — ${courseName}`;

	const text =
		`${studentName}'s attendance appeal for ${courseName} has been reviewed.\n\n` +
		`Decision: ${decision === 'approved' ? 'Approved' : 'Rejected'}\n` +
		`Final attendance: ${finalAttendance}\n` +
		`${teacherResponse ? `Teacher's response: ${teacherResponse}` : ''}\n\n` +
		`View details: ${APP_URL}/parent-portal`;

	const html =
		`<p><strong>${escapeHtml(studentName)}</strong>'s attendance appeal for <strong>${escapeHtml(courseName)}</strong> has been reviewed.</p>` +
		`<table style="border-collapse:collapse;margin:12px 0">` +
		`<tr><td style="padding:6px 12px 6px 0;font-weight:600">Decision</td><td style="padding:6px 0">${decision === 'approved' ? '✅ Approved' : '❌ Rejected'}</td></tr>` +
		`<tr><td style="padding:6px 12px 6px 0;font-weight:600">Final Attendance</td><td style="padding:6px 0">${escapeHtml(finalAttendance)}</td></tr>` +
		`${teacherResponse ? `<tr><td style="padding:6px 12px 6px 0;font-weight:600">Teacher's Response</td><td style="padding:6px 0">${escapeHtml(teacherResponse)}</td></tr>` : ''}` +
		`</table>` +
		`<p><a href="${APP_URL}/parent-portal" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:6px">View in Parent Portal</a></p>`;

	return sendToRecipients([parentId], subject, text, html);
}

export async function sendParentDailySummary(options: {
	parentId: string;
	date: string;
	records: {
		studentName: string;
		courseName: string;
		scheduledTime: string | null;
		originalAttendance: string;
		finalAttendance: string;
		appealStatus: string | null;
	}[];
}) {
	const { parentId, date, records } = options;

	if (records.length === 0) return { sent: 0, skipped: 0 };

	const subject = `Attendance Summary — ${date}`;

	const recordLines = records.map((r, i) =>
		`${i + 1}. ${r.studentName} — ${r.courseName}${r.scheduledTime ? ` (${r.scheduledTime})` : ''}: ${r.finalAttendance}${r.appealStatus ? ` (appeal ${r.appealStatus})` : ''}`
	).join('\n');
	const text =
		`Daily Attendance Summary for ${date}\n\n` +
		recordLines +
		`\n\nView details: ${APP_URL}/parent-portal`;

	const htmlRows = records.map(r =>
		`<tr>` +
		`<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(r.studentName)}</td>` +
		`<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(r.courseName)}</td>` +
		`<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.scheduledTime ? escapeHtml(r.scheduledTime) : '—'}</td>` +
		`<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(r.finalAttendance)}</td>` +
		`${r.appealStatus ? `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(r.appealStatus)}</td>` : ''}` +
		`</tr>`
	).join('');
	const html =
		`<p><strong>Daily Attendance Summary for ${escapeHtml(date)}</strong></p>` +
		`<table style="border-collapse:collapse;width:100%;max-width:600px">` +
		`<thead><tr style="background-color:#f3f4f6">` +
		`<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #d1d5db">Student</th>` +
		`<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #d1d5db">Course</th>` +
		`<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #d1d5db">Time</th>` +
		`<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #d1d5db">Attendance</th>` +
		`<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #d1d5db">Status</th>` +
		`</tr></thead>` +
		`<tbody>${htmlRows}</tbody>` +
		`</table>` +
		`<p><a href="${APP_URL}/parent-portal" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:6px">View in Parent Portal</a></p>`;

	return sendToRecipients([parentId], subject, text, html);
}
