import nodemailer from 'nodemailer';

// Email utility — Nodemailer integration

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (process.env.NODE_ENV === 'test') return;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM || 'Jobyt <no-reply@jobyt.in>';

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log(`\n📧 [DEV EMAIL] SMTP config missing or incomplete. Email not sent.`);
    console.log(`   To:      ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    
    // Extract links for password reset / email verification
    const links = options.html.match(/href="([^"]+)"/g);
    if (links) links.forEach((l) => console.log(`   Link:    ${l.replace(/href="|"/g, '')}`));

    // Extract OTP if present (typically 6 digits in this app)
    const otpMatch = options.html.match(/>(\d{6})</);
    if (otpMatch) {
      console.log(`   OTP:     ${otpMatch[1]}`);
    } else {
      // Print a clean version of the HTML body so developers can read any other notifications
      const cleanBody = options.html.replace(/<[^>]*>?/gm, '').trim();
      console.log(`   Body:    ${cleanBody.substring(0, 500)}${cleanBody.length > 500 ? '...' : ''}`);
    }
    
    console.log(`────────────────────────────────────────────────\n`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: emailFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log(`\n📧 [NODEMAILER] ──────────────────────────────`);
    console.log(`   To:      ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   MessageId: ${info.messageId}`);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log(`   Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    console.log(`────────────────────────────────────────────────\n`);
  } catch (err) {
    console.error('\n📧 [NODEMAILER ERROR] Email delivery failed');
    console.error(err);
  }
};

export const verificationEmailHtml = (name: string, token: string): string => `
  <h2>Welcome to Hiring Platform, ${name}!</h2>
  <p>Please verify your email by clicking the link below:</p>
  <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}">Verify Email</a>
  <p>This link expires in 24 hours.</p>
`;

export const passwordResetEmailHtml = (name: string, token: string): string => `
  <h2>Password Reset Request</h2>
  <p>Hi ${name}, click below to reset your password:</p>
  <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Reset Password</a>
  <p>This link expires in 1 hour. Ignore this email if you didn't request a reset.</p>
`;

export const oauthEmailVerificationHtml = (email: string, token: string): string => `
  <h2>Verify your email address</h2>
  <p>Hi ${email}, please verify your email to continue using protected features.</p>
  <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}">Verify Email</a>
  <p>This link expires in 15 minutes.</p>
`;

export const otpEmailHtml = (code: string, expiryMins: number = 5): string => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #333;">Your Verification Code</h2>
    <p>Please use the following One-Time Password (OTP) to verify your account:</p>
    <div style="background-color: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 4px; margin: 20px 0;">
      ${code}
    </div>
    <p style="color: #666; font-size: 14px;">This code will expire in ${expiryMins} minutes. If you did not request this, please ignore this email.</p>
  </div>
`;

export const autoApplyDigestEmailHtml = (
  name: string,
  summary: Record<string, number>,
  date: string,
): string => {
  const submitted = summary.submitted || 0;
  const pending = summary.pending_approval || 0;
  const failed = summary.failed || 0;
  const skipped = summary.skipped || 0;

  return `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #0b1120;">Your Auto-Apply Daily Summary</h2>
    <p>Hi ${name},</p>
    <p>Here's what Jobyt Auto-Apply did on ${date}:</p>
    <ul>
      <li><strong>${submitted}</strong> applications submitted</li>
      <li><strong>${pending}</strong> awaiting your approval</li>
      <li><strong>${skipped}</strong> skipped</li>
      <li><strong>${failed}</strong> failed</li>
    </ul>
    <a href="${process.env.FRONTEND_URL || 'https://jobyt.in'}/auto-apply" style="display: inline-block; background-color: #c3ff3d; color: #0b1120; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: bold;">View Auto-Apply Dashboard</a>
    <p style="color: #666; font-size: 12px; margin-top: 20px;">Manage preferences in Auto-Apply settings.</p>
  </div>`;
};

export const dailyRecommendationEmailHtml = (name: string, jobs: any[]): string => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #333;">Daily Job Recommendations</h2>
    <p>Hi ${name},</p>
    <p>Here are some top job matches for you based on your profile:</p>
    ${jobs.map(job => `
      <div style="background-color: #f9f9f9; padding: 15px; margin-bottom: 15px; border-radius: 6px; border-left: 4px solid #0056b3;">
        <h3 style="margin: 0 0 5px 0; color: #0056b3;">${job.title}</h3>
        <p style="margin: 0 0 5px 0; color: #555;"><strong>${job.companyName || 'Unknown Company'}</strong> - ${job.location || 'Remote/Anywhere'}</p>
        <p style="margin: 0 0 10px 0; color: #777; font-size: 14px;">Match Score: ${job.score}%</p>
        <a href="${process.env.FRONTEND_URL}/jobs/${job.id}" style="display: inline-block; background-color: #0056b3; color: #fff; text-decoration: none; padding: 8px 12px; border-radius: 4px; font-size: 14px;">View Job</a>
      </div>
    `).join('')}
    <p style="color: #666; font-size: 12px; margin-top: 20px;">You are receiving this because you have Email Alerts enabled. You can manage your preferences in your account settings.</p>
  </div>
`;

export const applicationSubmittedApplicantEmailHtml = (name: string, jobTitle: string) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Application Submitted</h2>
    <p>Hi ${name},</p>
    <p>Your application for the position of <strong>${jobTitle}</strong> has been successfully submitted!</p>
    <p>We will notify you when there is an update on your application status.</p>
    <br/>
    <p>Best regards,</p>
    <p>The Jobyt Team</p>
  </div>
`;

export const applicationSubmittedRecruiterEmailHtml = (jobTitle: string, applicantName: string) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>New Application Received</h2>
    <p>A new candidate, <strong>${applicantName}</strong>, has applied for the position of <strong>${jobTitle}</strong>.</p>
    <p>Log in to your dashboard to review their application.</p>
    <br/>
    <p>Best regards,</p>
    <p>The Jobyt Team</p>
  </div>
`;

export const statusUpdatedEmailHtml = (name: string, jobTitle: string, newStatus: string) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Application Status Update</h2>
    <p>Hi ${name},</p>
    <p>The status of your application for <strong>${jobTitle}</strong> has been updated to: <strong style="text-transform: capitalize;">${newStatus.replace('_', ' ')}</strong>.</p>
    <p>Log in to your Jobyt dashboard for more details.</p>
    <br/>
    <p>Best regards,</p>
    <p>The Jobyt Team</p>
  </div>
`;

export const interviewInviteEmailHtml = (name: string, jobTitle: string, scheduledAt: string, locationOrLink: string, notes?: string) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Interview Invitation: ${jobTitle}</h2>
    <p>Hi ${name},</p>
    <p>You have been invited to an interview for the <strong>${jobTitle}</strong> position.</p>
    <p><strong>Date & Time:</strong> ${new Date(scheduledAt).toLocaleString()}</p>
    <p><strong>Location / Link:</strong> ${locationOrLink}</p>
    ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
    <p>Please log in to your dashboard to confirm or view more details.</p>
    <br/>
    <p>Best regards,</p>
    <p>The Jobyt Team</p>
  </div>
`;

export const interviewReminderEmailHtml = (name: string, jobTitle: string, scheduledAt: string, locationOrLink: string) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Interview Reminder: ${jobTitle}</h2>
    <p>Hi ${name},</p>
    <p>This is a reminder for your upcoming interview for the <strong>${jobTitle}</strong> position.</p>
    <p><strong>Date & Time:</strong> ${new Date(scheduledAt).toLocaleString()}</p>
    <p><strong>Location / Link:</strong> ${locationOrLink}</p>
    <br/>
    <p>Good luck!</p>
    <p>The Jobyt Team</p>
  </div>
`;
