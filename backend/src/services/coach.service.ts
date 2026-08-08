import pool from '../config/database';
import { CoachModel, CoachSession, CoachMessage } from '../models/coach.model';
import { ResumeModel } from '../models/resume.model';
import { ResumeService } from './resume.service';
import { ApplicantProfileModel } from '../models/applicantProfile.model';
import { CreditService } from './credit.service';
import { CREDIT_COSTS } from '../config/creditCosts';
import { AIService } from './ai.service';
import { PromptTemplatesService } from './promptTemplates.service';
import { AppError, forbidden, notFound, badRequest } from '../utils/appError';
import { UserModel } from '../models/user.model';
import { parseResumeLocalFromText } from '../utils/resumeParser';

const LOG_PREFIX = '[CoachService]';

function extractSection(text: string, keywords: string[]): string {
  if (!text) return '';
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const idx = lines.findIndex(line =>
    keywords.some(keyword => {
      const cleanLine = line.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      return cleanLine === keyword || cleanLine.startsWith(keyword + ' ') || cleanLine.endsWith(' ' + keyword);
    })
  );
  if (idx < 0) return '';

  const sectionLines: string[] = [];
  const nextHeaders = [
    'skills', 'technical skills', 'experience', 'work experience', 'professional experience',
    'education', 'academic background', 'projects', 'personal projects', 'certifications',
    'awards', 'languages', 'interests', 'hobbies', 'summary', 'about me'
  ];

  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = line.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    if (nextHeaders.some(header => {
      return cleanLine === header || cleanLine.startsWith(header + ' ') || cleanLine.endsWith(' ' + header);
    })) {
      break;
    }
    sectionLines.push(line);
    if (sectionLines.length >= 10) break;
  }
  return sectionLines.join('\n').substring(0, 1000);
}

export const CoachService = {
  async _assertActiveStudent(studentId: string): Promise<void> {
    const student = await UserModel.findById(studentId);
    if (!student) {
      throw notFound('Student');
    }
    if (student.banned_at) {
      throw forbidden('Student account is banned');
    }
  },

  async loadStudentContext(studentId: string, session?: CoachSession): Promise<string> {
    // 1. Profile Summary
    const profile = await ApplicantProfileModel.findByUserId(studentId);
    const bioText = profile?.bio ? profile.bio.substring(0, 150) : 'None';
    const profileSummary = {
      name: profile?.name || 'Anonymous Student',
      bio: bioText,
      experience: Array.isArray(profile?.experience)
        ? profile.experience.map((item: any) => `${item.role || 'Role'} at ${item.company || 'Company'} (${item.dates || 'Dates'})`).slice(0, 3)
        : [],
      education: Array.isArray(profile?.education)
        ? profile.education.map((item: any) => `${item.degree || 'Degree'} at ${item.institution || 'Institution'} (${item.dates || 'Dates'})`).slice(0, 2)
        : []
    };

    // 2. Structured Resume Summary
    let resumeSummary = 'No default resume uploaded.';
    let parsedSkills: string[] = [];

    if (session && session.uploaded_resume_text) {
      const rawText = session.uploaded_resume_text;
      try {
        const parsed = parseResumeLocalFromText(rawText);
        parsedSkills = Array.isArray(parsed?.skills) ? parsed.skills : [];
        const projectText = extractSection(rawText, ['projects', 'personal projects', 'key projects', 'academic projects']);
        const certText = extractSection(rawText, ['certifications', 'licenses', 'awards', 'certificates']);

        resumeSummary = JSON.stringify({
          experience: Array.isArray(parsed?.experience)
            ? parsed.experience.map((item: any) => `${item.role || 'Role'} at ${item.company || 'Company'}`).slice(0, 3)
            : [],
          education: Array.isArray(parsed?.education)
            ? parsed.education.map((item: any) => `${item.degree || 'Degree'} at ${item.institution || 'Institution'}`).slice(0, 2)
            : [],
          projects: projectText || 'None extracted',
          certifications: certText || 'None extracted'
        });
      } catch (err) {
        console.warn(`${LOG_PREFIX} Failed to parse uploaded resume context:`, err);
      }
    } else {
      try {
        const defaultResume = await ResumeModel.findDefaultByUserId(studentId);
        if (defaultResume) {
          const details = await ResumeService.getUserResumeById(studentId, defaultResume.id);
          const parsed = details.parsed;
          parsedSkills = Array.isArray(parsed?.skills) ? parsed.skills : [];
          const rawText = await ResumeService.getResumeTextForUserResume(studentId, defaultResume.id).catch(() => '');

          const projectText = extractSection(rawText, ['projects', 'personal projects', 'key projects', 'academic projects']);
          const certText = extractSection(rawText, ['certifications', 'licenses', 'awards', 'certificates']);

          resumeSummary = JSON.stringify({
            experience: Array.isArray(parsed?.experience)
              ? parsed.experience.map((item: any) => `${item.role || 'Role'} at ${item.company || 'Company'} (${item.dates || 'Dates'})`).slice(0, 3)
              : [],
            education: Array.isArray(parsed?.education)
              ? parsed.education.map((item: any) => `${item.degree || 'Degree'} at ${item.institution || 'Institution'} (${item.dates || 'Dates'})`).slice(0, 2)
              : [],
            projects: projectText || 'None extracted',
            certifications: certText || 'None extracted'
          });
        }
      } catch (err) {
        console.warn(`${LOG_PREFIX} Failed to load resume summary context:`, err);
      }
    }

    // 3. Skills Summary (Profile + Resume deduplicated)
    const profileSkills = Array.isArray(profile?.skills) ? profile.skills : [];
    const skillsList = Array.from(new Set([...profileSkills, ...parsedSkills])).filter(Boolean);

    // 4. Application Summary (Last 3)
    let applicationSummary: string[] = [];
    try {
      const { rows } = await pool.query(
        `SELECT j.title, j.company_name, a.status FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE a.applicant_id = $1
         ORDER BY a.created_at DESC LIMIT 3`,
        [studentId]
      );
      applicationSummary = rows.map((r: any) => `${r.title} at ${r.company_name} - Status: ${r.status}`);
    } catch (err) {
      console.warn(`${LOG_PREFIX} Failed to load applications summary:`, err);
    }

    // 5. Interview Summary & Readiness Summary
    let interviewSummary = 'No completed interviews.';
    let readinessScore = 'None';
    let readinessTrend = 'stable';
    try {
      const [interviewsRes, readinessRes] = await Promise.all([
        pool.query(
          `SELECT overall_score, role_title, completed_at FROM ai_interview_sessions
           WHERE student_id = $1 AND status = 'report_generated'
           ORDER BY completed_at DESC`,
          [studentId]
        ),
        pool.query(`SELECT current_score, trend FROM student_readiness_scores WHERE student_id = $1`, [studentId])
      ]);

      const finished = interviewsRes.rows;
      if (finished.length > 0) {
        const scores = finished.map((r: any) => r.overall_score).filter((s: any) => s !== null);
        const avg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
        interviewSummary = `Average Score: ${avg}/100. Latest: ${finished[0].role_title} (Score: ${finished[0].overall_score})`;
      }

      if (readinessRes.rows.length > 0) {
        readinessScore = String(readinessRes.rows[0].current_score);
        readinessTrend = readinessRes.rows[0].trend;
      }
    } catch (err) {
      console.warn(`${LOG_PREFIX} Failed to load interview metrics:`, err);
    }

    return JSON.stringify({
      profile: profileSummary,
      resume: resumeSummary,
      skills: skillsList,
      applications: applicationSummary,
      interviews: interviewSummary,
      readiness: {
        score: readinessScore,
        trend: readinessTrend
      }
    });
  },

  async getSession(studentId: string, sessionId: string): Promise<CoachSession> {
    await this._assertActiveStudent(studentId);
    const session = await CoachModel.findSessionById(sessionId);
    if (!session) {
      throw notFound('Coach session');
    }
    if (session.student_id !== studentId) {
      throw forbidden('Forbidden: You do not own this session');
    }
    return session;
  },

  async startSession(
    studentId: string,
    title: string,
    mode: CoachSession['mode'],
    uploadedResumeName?: string | null,
    uploadedResumeText?: string | null
  ): Promise<CoachSession> {
    await this._assertActiveStudent(studentId);
    const trimmedTitle = title?.trim() || `Career Coach - ${mode.replace('_', ' ')}`;
    return CoachModel.createSession(studentId, trimmedTitle, mode, uploadedResumeName, uploadedResumeText);
  },

  async listSessions(studentId: string): Promise<CoachSession[]> {
    await this._assertActiveStudent(studentId);
    return CoachModel.findSessionsByStudent(studentId);
  },

  async sendMessage(
    studentId: string,
    sessionId: string,
    messageText: string
  ): Promise<CoachMessage> {
    await this._assertActiveStudent(studentId);
    const session = await CoachModel.findSessionById(sessionId);
    if (!session) {
      throw notFound('Coach session');
    }
    if (session.student_id !== studentId) {
      throw forbidden('Forbidden: You do not own this session');
    }

    const trimmedMsg = messageText?.trim();
    if (!trimmedMsg) {
      throw badRequest('Message text is required');
    }

    // 1. Credit Check & Gating
    const isAdvanced = session.mode !== 'general';
    const cost = isAdvanced ? CREDIT_COSTS.COACH_MESSAGE_ADVANCED : CREDIT_COSTS.COACH_MESSAGE_GENERAL;

    const balance = await CreditService.getBalance(studentId);
    if (balance < cost) {
      throw Object.assign(new Error('Insufficient credits'), {
        statusCode: 402,
        error: 'INSUFFICIENT_CREDITS',
        required: cost,
        available: balance,
      });
    }

    // 2. Summary Caching Logic
    const latestTimestamp = await CoachModel.getLatestUpdateTimestamps(studentId);
    let studentContext = session.context_summary;

    if (!studentContext || !session.context_updated_at || latestTimestamp > new Date(session.context_updated_at)) {
      console.log(`${LOG_PREFIX} Context summary cache stale or missing. Regenerating for session ${sessionId}...`);
      studentContext = await this.loadStudentContext(studentId, session);
      await CoachModel.updateSessionContext(sessionId, studentContext);
    } else {
      console.log(`${LOG_PREFIX} Reusing cached context summary for session ${sessionId}.`);
    }

    // 3. Prompt setup based on mode
    let modeInstruction = '';
    switch (session.mode) {
      case 'general':
        modeInstruction = 'Provide general career support, help them brainstorm career goals, or answer general job search questions.';
        break;
      case 'resume_review':
        modeInstruction = "Critically review the student's resume. Identify missing sections, weak bullet points, spelling/grammar issues, and suggest concrete wording improvements.";
        break;
      case 'interview_prep':
        modeInstruction = 'Act as a technical or behavioral mock interviewer. Generate a practice question based on their target role/skills, evaluate their answers constructively, and guide them on structuring responses using STAR method.';
        break;
      case 'career_advice':
        modeInstruction = 'Help the student identify optimal career paths, recommend technical skills to acquire next, suggest relevant certifications, and outline a realistic 6-month upskilling plan.';
        break;
      case 'salary_negotiation':
        modeInstruction = 'Provide guidance on salary bands for their target roles, write email/verbal negotiation scripts, and coach them on responding to low-ball offers or navigating salary disclosure questions.';
        break;
    }

    // Get message history
    const pastMessages = await CoachModel.getMessagesBySessionId(sessionId);
    const chatHistory = pastMessages
      .slice(-10) // Last 10 turns
      .map(m => `${m.sender === 'user' ? 'User' : 'Coach'}: ${m.message_text}`)
      .join('\n');

    const prompt = await PromptTemplatesService.renderTemplate('coach_chat', {
      studentContext,
      mode: session.mode,
      modeInstruction,
      chatHistory,
      userMessage: trimmedMsg
    });

    // 4. Claude Call
    console.log(`${LOG_PREFIX} Calling Claude provider for message response...`);
    const aiText = await AIService.generateText(prompt, { provider: 'claude' });

    if (!aiText) {
      throw new AppError(
        'The AI Career Coach is currently unavailable. Please verify API configuration or try again later.',
        500,
        'COACH_AI_FAILED'
      );
    }

    // 5. Save and deduct credits on success
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userMsg = await CoachModel.createMessage(sessionId, 'user', trimmedMsg, client);
      const aiMsg = await CoachModel.createMessage(sessionId, 'ai', aiText, client);

      await CreditService.deductCredits(
        studentId,
        cost,
        `AI Career Coach interaction - ${session.mode}`,
        aiMsg.id,
        client
      );

      await client.query('COMMIT');
      return aiMsg;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async generateNudges(studentId: string): Promise<any[]> {
    const nudges: any[] = [];

    try {
      const profile = await ApplicantProfileModel.findByUserId(studentId);
      const profileSkills = Array.isArray(profile?.skills) ? profile.skills : [];
      const defaultResume = await ResumeModel.findDefaultByUserId(studentId);

      // 1. Profile Skills check
      if (profileSkills.length === 0) {
        nudges.push({
          id: 'nudge-profile',
          text: "Your skills profile is empty! Let's update it to get better job recommendations.",
          type: 'warning',
          actionLabel: 'Edit Profile',
          actionUrl: '/profile'
        });
      }

      // 2. Default Resume check
      if (!defaultResume) {
        nudges.push({
          id: 'nudge-resume',
          text: "You don't have a default resume uploaded yet. Upload one to start matching with internships!",
          type: 'warning',
          actionLabel: 'Upload Resume',
          actionUrl: '/profile'
        });
      }

      // 3. Applications check
      const { rows: appCount } = await pool.query(
        'SELECT COUNT(*)::int as count FROM applications WHERE applicant_id = $1',
        [studentId]
      );
      if (appCount[0].count === 0) {
        nudges.push({
          id: 'nudge-apply',
          text: 'Ready to start your search? Check out our latest internship listings!',
          type: 'info',
          actionLabel: 'Browse Jobs',
          actionUrl: '/dashboard'
        });
      }

      // 4. Readiness score check
      const readiness = await pool.query(
        'SELECT current_score FROM student_readiness_scores WHERE student_id = $1',
        [studentId]
      );
      if (readiness.rows.length === 0) {
        nudges.push({
          id: 'nudge-interview',
          text: 'Hone your interview skills! Take a mock interview session to evaluate your readiness.',
          type: 'info',
          actionLabel: 'Mock Interviews',
          actionUrl: '/interviews'
        });
      } else if (readiness.rows[0].current_score < 60) {
        nudges.push({
          id: 'nudge-readiness',
          text: 'Your Job Readiness Score is below 60. Try a Career Coach session to practice and improve!',
          type: 'info',
          actionLabel: 'Ask Coach',
          actionUrl: '/coach'
        });
      }

      // 5. Default Nudge if no other conditions triggered
      if (nudges.length === 0) {
        nudges.push({
          id: 'nudge-default',
          text: 'Keep pushing forward! Check your customized learning roadmaps to acquire top in-demand skills.',
          type: 'success',
          actionLabel: 'My Roadmaps',
          actionUrl: '/roadmaps'
        });
      }
    } catch (err) {
      console.warn(`${LOG_PREFIX} Failed to calculate dynamic nudges:`, err);
    }

    return nudges;
  },

  async submitFeedback(
    studentId: string,
    messageId: string,
    feedback: 'up' | 'down',
    comment?: string
  ): Promise<CoachMessage> {
    await this._assertActiveStudent(studentId);
    
    const { rows } = await pool.query(
      `SELECT m.*, s.student_id 
       FROM coach_messages m
       JOIN coach_sessions s ON m.session_id = s.id
       WHERE m.id = $1`,
      [messageId]
    );
    const msg = rows[0];
    if (!msg) {
      throw notFound('Coach message');
    }
    if (msg.student_id !== studentId) {
      throw forbidden('Forbidden: You do not own this session message');
    }

    const updated = await CoachModel.updateMessageFeedback(messageId, feedback, comment);
    if (!updated) {
      throw notFound('Coach message');
    }
    return updated;
  }
};
