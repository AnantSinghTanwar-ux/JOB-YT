import { ResumeDeleteResult, ResumeListItem, ResumeModel } from '../models/resume.model';
import { ApplicantProfileModel } from '../models/applicantProfile.model';
import { StorageService } from './storage.service';
import { PromptTemplatesService } from './promptTemplates.service';
import { AIService } from './ai.service';
import { aiConfig } from '../config/ai.config';
import { withTransaction } from '../utils/transaction';
import fs from 'fs/promises';
import path from 'path';
import { parseResume } from '../utils/resumeParser';
import pool from '../config/database';
import { extractSkillsFromText } from '../config/skillTaxonomy';

export interface ATSResult {
  score: number;
  missingKeywords: string[];
  semanticSimilarityScore: number;
  sectionScores: {
    skillsScore: number;
    experienceScore: number;
    achievementsScore: number;
    keywordsScore: number;
    educationScore?: number;
    completenessScore?: number;
    projectsScore?: number;
    certificationsScore?: number;
  };
  keywordDensity: Record<string, number>;
  explanation: string;
  feedback: {
    missingSections: string[];
    weakAreas: string[];
    improvements: string[];
  };
  qualityScore: number;
  rolePrediction: string;
  experience: string;
}

export interface ResumeBuilderContact {
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  github?: string | null;
  portfolio?: string | null;
}

export interface ResumeBuilderExperience {
  company?: string | null;
  role?: string | null;
  dates?: string | null;
  description?: string | null;
}

export interface ResumeBuilderEducation {
  institution?: string | null;
  degree?: string | null;
  dates?: string | null;
  description?: string | null;
}

export interface ResumeDraft {
  summary: string;
  skills: string[];
  experience: ResumeBuilderExperience[];
  education: ResumeBuilderEducation[];
  contact: ResumeBuilderContact;
}

function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function escapeLatex(value: unknown): string {
  return safeString(value)
    .replace(/([%#$&_{}\\^~])/g, '\\$1')
    .replace(/\n{2,}/g, '\\par\\par\n')
    .replace(/\n/g, '\\newline\n');
}

function normalizeExperienceItem(item: Record<string, unknown>): ResumeBuilderExperience {
  return {
    company: safeString(item.company ?? item.companyName ?? item.organization ?? null) || null,
    role: safeString(item.role ?? item.title ?? null) || null,
    dates:
      safeString(item.dates ?? item.period ?? item.duration ?? item.date ?? null) ||
      [safeString(item.startDate ?? null), safeString(item.endDate ?? null)]
        .filter(Boolean)
        .join(' - ') ||
      null,
    description:
      safeString(item.description ?? item.summary ?? item.details ?? item.responsibilities ?? null) || null,
  };
}

function normalizeEducationItem(item: Record<string, unknown>): ResumeBuilderEducation {
  return {
    institution: safeString(item.institution ?? item.school ?? item.college ?? null) || null,
    degree: safeString(item.degree ?? item.program ?? item.field ?? null) || null,
    dates:
      safeString(item.dates ?? item.period ?? item.year ?? item.graduationYear ?? null) || null,
    description: safeString(item.description ?? item.notes ?? item.summary ?? null) || null,
  };
}

function renderLatexBulletList(items: string[]): string {
  if (!items.length) return '';
  return ['\\begin{itemize}[leftmargin=*]']
    .concat(items.map((item) => `  \\item ${escapeLatex(item)}`))
    .concat('\\end{itemize}')
    .join('\n');
}

function renderLatexParagraph(text: string): string {
  const escaped = escapeLatex(text);
  if (!escaped) return '';
  return escaped.split('\\newline').join('\\\\\n');
}

export const ResumeService = {
  audit(event: string, payload: Record<string, unknown>) {
    console.info('[AUDIT]', event, payload);
  },

  buildResumePromptPayload(profile: Awaited<ReturnType<typeof ApplicantProfileModel.findByUserId>>): {
    name: string;
    bio: string;
    skills: string;
    experience: string;
    education: string;
    links: string;
  } {
    const skills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean).join(', ') : '';
    const experience = Array.isArray(profile?.experience)
      ? profile.experience.map((item) => {
          const normalized = normalizeExperienceItem(item as Record<string, unknown>);
          return [normalized.role, normalized.company, normalized.dates, normalized.description]
            .filter(Boolean)
            .join(' | ');
        }).filter(Boolean).join(' ; ')
      : '';
    const education = Array.isArray(profile?.education)
      ? profile.education.map((item) => {
          const normalized = normalizeEducationItem(item as Record<string, unknown>);
          return [normalized.degree, normalized.institution, normalized.dates, normalized.description]
            .filter(Boolean)
            .join(' | ');
        }).filter(Boolean).join(' ; ')
      : '';
    const links = [profile?.linkedin_url, profile?.github_url, profile?.portfolio_url]
      .filter(Boolean)
      .join(' | ');

    return {
      name: safeString(profile?.name),
      bio: safeString(profile?.bio),
      skills,
      experience,
      education,
      links,
    };
  },

  buildFallbackDraft(profile: Awaited<ReturnType<typeof ApplicantProfileModel.findByUserId>>): ResumeDraft {
    const skills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean) : [];
    const experience = Array.isArray(profile?.experience)
      ? profile.experience.map((item) => normalizeExperienceItem(item as Record<string, unknown>))
      : [];
    const education = Array.isArray(profile?.education)
      ? profile.education.map((item) => normalizeEducationItem(item as Record<string, unknown>))
      : [];

    return {
      summary:
        safeString(profile?.bio) ||
        `Experienced candidate with ${skills.length} skill${skills.length === 1 ? '' : 's'} and a strong foundation in modern hiring requirements.`,
      skills,
      experience,
      education,
      contact: {
        email: null,
        phone: null,
        linkedin: safeString(profile?.linkedin_url) || null,
        github: safeString(profile?.github_url) || null,
        portfolio: safeString(profile?.portfolio_url) || null,
      },
    };
  },

  async generateResumeDraft(userId: string): Promise<ResumeDraft> {
    const profile = await ApplicantProfileModel.findByUserId(userId);
    if (!profile) {
      throw Object.assign(new Error('Applicant profile not found'), {
        statusCode: 404,
        code: 'PROFILE_NOT_FOUND',
      });
    }

    const promptPayload = ResumeService.buildResumePromptPayload(profile);
    if (aiConfig.xaiConfigured) {
      try {
        const prompt = await PromptTemplatesService.renderTemplate('resume_generation', promptPayload);
        const aiDraft = await AIService.generateJSON<ResumeDraft>(prompt, { provider: 'grok' });
        if (aiDraft && typeof aiDraft.summary === 'string' && Array.isArray(aiDraft.skills)) {
          return {
            summary: safeString(aiDraft.summary) || safeString(profile.bio) || 'Resume draft generated from profile.',
            skills: Array.isArray(aiDraft.skills) ? aiDraft.skills.filter(Boolean) : [],
            experience: Array.isArray(aiDraft.experience)
              ? aiDraft.experience.map((item) => ({
                  company: safeString(item.company),
                  role: safeString(item.role),
                  dates: safeString(item.dates),
                  description: safeString(item.description),
                }))
              : [],
            education: Array.isArray(aiDraft.education)
              ? aiDraft.education.map((item) => ({
                  institution: safeString(item.institution),
                  degree: safeString(item.degree),
                  dates: safeString(item.dates),
                  description: safeString(item.description),
                }))
              : [],
            contact: {
              email: safeString(aiDraft.contact?.email) || null,
              phone: safeString(aiDraft.contact?.phone) || null,
              linkedin: safeString(aiDraft.contact?.linkedin) || null,
              github: safeString(aiDraft.contact?.github) || null,
              portfolio: safeString(aiDraft.contact?.portfolio) || null,
            },
          };
        }
      } catch (err) {
        console.warn('[ResumeService] AI resume draft generation failed:', err);
      }
    }

    return ResumeService.buildFallbackDraft(profile);
  },

  renderResumeLatex(draft: ResumeDraft): string {
    const contactLines = [
      draft.contact.email ? `Email: ${escapeLatex(draft.contact.email)}` : null,
      draft.contact.phone ? `Phone: ${escapeLatex(draft.contact.phone)}` : null,
      draft.contact.linkedin ? `LinkedIn: ${escapeLatex(draft.contact.linkedin)}` : null,
      draft.contact.github ? `GitHub: ${escapeLatex(draft.contact.github)}` : null,
      draft.contact.portfolio ? `Portfolio: ${escapeLatex(draft.contact.portfolio)}` : null,
    ].filter(Boolean);

    const latexSections = [
      '\\documentclass[11pt]{article}',
      '\\usepackage[margin=0.75in]{geometry}',
      '\\usepackage[hidelinks]{hyperref}',
      '\\usepackage{enumitem}',
      '\\usepackage{parskip}',
      '\\setlength\\parindent{0pt}',
      '\\begin{document}',
    ];

    const title = escapeLatex(draft.summary || 'Resume');
    latexSections.push(`\\begin{center}\\Huge \\textbf{${title}}\\end{center}`);
    if (contactLines.length) {
      latexSections.push(`\\begin{center}${contactLines.join(' \\ \quad ')}\\end{center}`);
    }

    if (draft.summary) {
      latexSections.push('\\section*{Summary}', renderLatexParagraph(draft.summary));
    }

    if (draft.skills.length) {
      latexSections.push('\\section*{Skills}', renderLatexBulletList(draft.skills));
    }

    if (draft.experience.length) {
      latexSections.push('\\section*{Experience}');
      for (const entry of draft.experience) {
        const header = [escapeLatex(entry.role), escapeLatex(entry.company), escapeLatex(entry.dates)]
          .filter(Boolean)
          .join(' --- ');
        latexSections.push(`\\textbf{${header}}\\\n`);
        if (entry.description) latexSections.push(renderLatexParagraph(entry.description));
      }
    }

    if (draft.education.length) {
      latexSections.push('\\section*{Education}');
      for (const entry of draft.education) {
        const header = [escapeLatex(entry.degree), escapeLatex(entry.institution), escapeLatex(entry.dates)]
          .filter(Boolean)
          .join(' --- ');
        latexSections.push(`\\textbf{${header}}\\\n`);
        if (entry.description) latexSections.push(renderLatexParagraph(entry.description));
      }
    }

    latexSections.push('\\end{document}');
    return latexSections.join('\n\n');
  },

  async getUserResumes(userId: string): Promise<ResumeListItem[]> {
    return ResumeModel.findByUserId(userId);
  },

  async getDefaultResume(userId: string): Promise<ResumeListItem> {
    const resume = await ResumeModel.findDefaultByUserId(userId);
    if (!resume) {
      throw Object.assign(new Error('No default resume found'), {
        statusCode: 404,
        code: 'DEFAULT_RESUME_NOT_FOUND',
      });
    }

    const { user_id: _omitUserId, updated_at: _omitUpdatedAt, ...rest } = resume;
    return rest;
  },

  async getUserResumeById(userId: string, resumeId: string) {
    const [resume, profile] = await Promise.all([
      ResumeModel.findByUserAndId(userId, resumeId),
      ApplicantProfileModel.findByUserId(userId),
    ]);

    if (!resume) {
      throw Object.assign(new Error('Resume not found'), {
        statusCode: 404,
        code: 'RESUME_NOT_FOUND',
      });
    }

    let parsedFromFile: {
      name: string | null;
      skills: string[];
      experience: unknown[];
      education: unknown[];
    } = {
      name: null,
      skills: [],
      experience: [],
      education: [],
    };

    try {
      const buffer = await ResumeService.loadResumeFileBuffer(resume.file_url);
      const parsed = await parseResume(buffer, {
        filename: resume.file_name,
        mimeType: resume.mime_type || undefined,
      });

      parsedFromFile = {
        name: parsed.name,
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        education: Array.isArray(parsed.education) ? parsed.education : [],
      };
    } catch (err) {
      console.warn('Failed to parse resume file for detail view, falling back to profile data:', err);
    }

    const fallbackExperience = Array.isArray(profile?.experience) ? profile.experience : [];
    const fallbackEducation = Array.isArray(profile?.education) ? profile.education : [];
    const fallbackSkills = Array.isArray(profile?.skills) ? profile.skills : [];
    const fallbackName = profile?.name ?? null;

    return {
      ...resume,
      parsed: {
        name: parsedFromFile.name ?? fallbackName,
        skills: parsedFromFile.skills.length > 0 ? parsedFromFile.skills : fallbackSkills,
        experience: parsedFromFile.experience.length > 0 ? parsedFromFile.experience : fallbackExperience,
        education: parsedFromFile.education.length > 0 ? parsedFromFile.education : fallbackEducation,
      },
    };
  },

  async getResumeTextForUserResume(userId: string, resumeId: string): Promise<string> {
    const resume = await ResumeModel.findByUserAndId(userId, resumeId);
    if (!resume) {
      throw Object.assign(new Error('Resume not found'), {
        statusCode: 404,
        code: 'RESUME_NOT_FOUND',
      });
    }

    const buffer = await ResumeService.loadResumeFileBuffer(resume.file_url);
    const lowerName = (resume.file_name || '').toLowerCase();
    const mime = (resume.mime_type || '').toLowerCase();

    if (mime.includes('pdf') || lowerName.endsWith('.pdf')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const parsedPdf = await parser.getText();
      await parser.destroy().catch(() => undefined);
      const text = String(parsedPdf?.text || '').trim();
      if (text) return text;
    }

    const parsed = await parseResume(buffer, {
      filename: resume.file_name,
      mimeType: resume.mime_type || undefined,
    });

    const parsedText = [
      parsed.rawText,
      parsed.name || '',
      Array.isArray(parsed.skills) ? parsed.skills.join(', ') : '',
      Array.isArray(parsed.experience)
        ? parsed.experience
            .map((item) => [item.role || '', item.company || ''].filter(Boolean).join(' at '))
            .join('\n')
        : '',
      Array.isArray(parsed.education)
        ? parsed.education
            .map((item) => [item.degree || '', item.institution || ''].filter(Boolean).join(' - '))
            .join('\n')
        : '',
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    return parsedText;
  },

  async loadResumeFileBuffer(fileUrl: string): Promise<Buffer> {
    if (!fileUrl) {
      throw Object.assign(new Error('Resume file URL missing'), {
        statusCode: 400,
        code: 'RESUME_URL_MISSING',
      });
    }

    if (fileUrl.startsWith('/uploads/')) {
      const relativePath = fileUrl.replace(/^\/+/, '');
      const fullPath = path.join(__dirname, '../../', relativePath);
      return fs.readFile(fullPath);
    }

    const response = await fetch(fileUrl);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    throw Object.assign(new Error('Failed to download resume file'), {
      statusCode: 502,
      code: 'RESUME_FILE_FETCH_FAILED',
      details: {
        storedUrl: fileUrl,
        lastStatus: response.status,
      },
    });
  },

  async setDefaultResume(userId: string, resumeId: string): Promise<ResumeListItem> {
    const resume = await withTransaction(async (client) => {
      return ResumeModel.setDefaultResume(userId, resumeId, client);
    });
    ResumeService.audit('resume.set_default', { userId, resumeId, newDefaultId: resume.id });
    return resume;
  },

  async deleteResume(userId: string, resumeId: string): Promise<Omit<ResumeDeleteResult, 'deletedUrl'>> {
    const result = await withTransaction(async (client) => {
      return ResumeModel.deleteResume(userId, resumeId, client);
    });

    await StorageService.deleteByUrl(result.deletedUrl).catch(() => undefined);

    const { deletedUrl: _omit, ...rest } = result;
    ResumeService.audit('resume.delete', {
      userId,
      deletedId: result.deletedId,
      reassignedDefaultId: result.newDefault?.id ?? null,
    });
    return rest;
  },

  async scoreATS(resumeText: string, jobDescription: string, jobId?: string): Promise<ATSResult> {
    const defaultFail: ATSResult = {
      score: 0,
      missingKeywords: [],
      semanticSimilarityScore: 0,
      sectionScores: { skillsScore: 0, experienceScore: 0, achievementsScore: 0, keywordsScore: 0 },
      keywordDensity: {},
      explanation: "Analysis failed or missing data.",
      feedback: { missingSections: [], weakAreas: [], improvements: [] },
      qualityScore: 0,
      rolePrediction: "Unknown",
      experience: "Unknown"
    };

    if (!resumeText || !jobDescription) return defaultFail;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ATSService } = require('./ats.service');

      // Extract skills from resume text using taxonomy-based word-boundary matching.
      // Uses extractSkillsFromText() which enforces regex \b boundaries — eliminates
      // false positives like 'Java' matching inside 'JavaScript'.
      const resumeSkills = extractSkillsFromText(resumeText);

      // Extract job skills from description using the same accurate taxonomy extractor
      const jobSkills = extractSkillsFromText(jobDescription);

      // Use embedding-enhanced scoring (primary path).
      // Falls back to keyword-only automatically if Gemini is unavailable.
      const atsResult = await ATSService.calculateATSScoreWithEmbedding(
        {
          skills: resumeSkills,
          experienceText: resumeText,
          fullText: resumeText,
        },
        {
          skills: jobSkills,
          description: jobDescription,
        },
        // Pass jobId for fast-path embedding lookup when available
        jobId ? { jobId } : undefined,
      );

      const result: ATSResult = {
        score: atsResult.totalScore,
        missingKeywords: atsResult.missingSkills.slice(0, 10),
        // Real semantic similarity: embedding cosine score when available, 0 on fallback
        semanticSimilarityScore: atsResult.semanticSimilarityScore,
        sectionScores: {
          skillsScore: atsResult.sectionScores.skillsScore,
          experienceScore: atsResult.sectionScores.experienceScore,
          achievementsScore: atsResult.sectionScores.achievementsScore,
          keywordsScore: atsResult.sectionScores.keywordsScore,
          educationScore: atsResult.sectionScores.educationScore,
          completenessScore: atsResult.sectionScores.completenessScore,
          projectsScore: atsResult.sectionScores.projectsScore,
          certificationsScore: atsResult.sectionScores.certificationsScore,
        },
        keywordDensity: {},
        explanation: atsResult.debug.embeddingAvailable
          ? `Embedding-enhanced ATS: semantic=${atsResult.semanticSimilarityScore}%, skills=${atsResult.sectionScores.skillsScore}%, experience=${atsResult.sectionScores.experienceScore}%, keywords=${atsResult.sectionScores.keywordsScore}%. Matched ${atsResult.matchedSkills.length} of ${atsResult.debug.jobSkillCount} required skills.`
          : `Keyword ATS: skills=${atsResult.sectionScores.skillsScore}%, experience=${atsResult.sectionScores.experienceScore}%, keywords=${atsResult.sectionScores.keywordsScore}%. Matched ${atsResult.matchedSkills.length} of ${atsResult.debug.jobSkillCount} required skills.`,
        feedback: {
          missingSections: [],
          weakAreas: atsResult.missingSkills.length > 3 ? ['Skills gap detected'] : [],
          improvements: atsResult.missingSkills.length > 0
            ? [`Consider adding skills: ${atsResult.missingSkills.slice(0, 5).join(', ')}`]
            : [],
        },
        qualityScore: Math.min(100, atsResult.totalScore + 10),
        rolePrediction: "Analysis based on skills profile",
        experience: "See resume details",
      };

      let usedFallback = false;
      if (aiConfig.isConfigured) {
        try {
          const prompt = await PromptTemplatesService.renderTemplate('ats_scoring', {
            resumeText: resumeText.substring(0, 3000),
            jobDescription: jobDescription.substring(0, 1500),
          });

          const p = await AIService.generateJSON<Partial<ATSResult & { keywordDensity: Record<string, number> }>>(prompt);
          if (p) {
            result.keywordDensity = p.keywordDensity ?? result.keywordDensity;
            result.explanation = p.explanation ?? result.explanation;
            result.feedback = p.feedback ?? result.feedback;
            result.qualityScore = typeof p.qualityScore === 'number' ? p.qualityScore : result.qualityScore;
            result.rolePrediction = p.rolePrediction ?? result.rolePrediction;
            result.experience = p.experience ?? result.experience;
          } else {
            usedFallback = true;
          }
        } catch (llmError) {
          usedFallback = true;
          console.warn('[ATS] LLM enrichment failed, using deterministic scores:', llmError);
        }
      }

      if (usedFallback || !aiConfig.isConfigured) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
          try {
            const prompt = await PromptTemplatesService.renderTemplate('ats_scoring', {
              resumeText: resumeText.substring(0, 3000),
              jobDescription: jobDescription.substring(0, 1500),
            });

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                temperature: 0.1,
                response_format: { type: 'json_object' },
                messages: [{ role: 'system', content: prompt }],
              }),
            });

            if (response.ok) {
              const data: any = await response.json();
              const p = JSON.parse(data.choices[0].message.content) as any;
              result.keywordDensity = p.keywordDensity || result.keywordDensity;
              result.explanation = p.explanation || result.explanation;
              result.feedback = p.feedback || result.feedback;
              result.qualityScore = p.qualityScore || result.qualityScore;
              result.rolePrediction = p.rolePrediction || result.rolePrediction;
              result.experience = p.experience || result.experience;
            }
          } catch (llmError) {
            console.warn('[ATS] LLM enrichment failed, using deterministic scores:', llmError);
          }
        }
      }

      return result;
    } catch (error) {
      console.error('[ATS] Scoring error:', error);
      return defaultFail;
    }
  },

  async getSecureUrl(userId: string, role: string, resumeId: string): Promise<string> {
    const { rows } = await pool.query(`SELECT user_id, file_url, mime_type FROM resumes WHERE id = $1 LIMIT 1`, [resumeId]);
    const resume = rows[0];

    if (!resume) {
      throw Object.assign(new Error('Resume not found'), {
        statusCode: 404,
        code: 'RESUME_NOT_FOUND',
      });
    }

    let isAuthorized = false;

    if (role === 'admin') {
      isAuthorized = true;
    } else if (role === 'applicant' && resume.user_id === userId) {
      isAuthorized = true;
    } else if (role === 'recruiter') {
      // Check if there is an application linking this recruiter to this resume
      const { rows: appRows } = await pool.query(
        `SELECT 1 FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE j.recruiter_id = $1 AND (a.resume_id = $2 OR a.applicant_id = $3)
         LIMIT 1`,
        [userId, resumeId, resume.user_id]
      );
      if (appRows.length > 0) isAuthorized = true;
    }

    if (!isAuthorized) {
      throw Object.assign(new Error('Forbidden: You do not have access to this resume'), {
        statusCode: 403,
        code: 'RESUME_ACCESS_DENIED',
      });
    }

    const resourceType = resume.mime_type === 'application/pdf' ? 'image' : 'raw';
    return StorageService.generateSignedUrl(resume.file_url, resourceType);
  },
};
