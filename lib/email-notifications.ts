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
	courseName: string;
	status: AttendanceStatus;
	recordedTime: string;
	recordedDate: string;
}) {
	const { studentId, parentIds, teacherId, courseName, status, recordedTime, recordedDate } = options;

	const subjectMap: Record<AttendanceStatus, string> = {
		present: 'Present Attendance Recorded',
		late: 'Late Attendance Recorded',
		absent: 'Absence Recorded',
	};

	const studentText =
		status === 'absent'
			? `You were marked as absent for ${courseName} on ${recordedDate}.`
			: `You were marked as ${status} for ${courseName} at ${recordedTime}.`;

	const parentText =
		status === 'absent'
			? `Your child was marked as absent for ${courseName} on ${recordedDate}.`
			: `Your child was marked as ${status} for ${courseName} at ${recordedTime}.`;

	const teacherText =
		status === 'absent'
			? `Student marked absent for ${courseName} on ${recordedDate}.`
			: `Student marked ${status} for ${courseName} at ${recordedTime}.`;

	const studentHtml = `<p>${studentText}</p>`;
	const parentHtml = `<p>${parentText}</p>`;
	const teacherHtml = `<p>${teacherText}</p>`;

	const targetGroups = [
		{ userIds: [studentId], subject: subjectMap[status], text: studentText, html: studentHtml },
		...(parentIds.length > 0
			? [{ userIds: parentIds, subject: `Child ${status === 'present' ? 'Present' : status === 'late' ? 'Late' : 'Absent'}`, text: parentText, html: parentHtml }]
			: []),
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
		decision === 'approved'
			? `Your appeal for ${courseName} has been approved. The attendance record has been corrected.`
			: `Your appeal for ${courseName} has been rejected. Teacher response: ${teacherResponse || 'No response provided'}`;

	const html = `<p>${text}</p>`;

	return sendToRecipients([studentId], subject, text, html);
}
