import { ApplicantProfileModel, ApplicantProfile } from '../models/applicantProfile.model';
import { RecruiterProfileModel, RecruiterProfile } from '../models/recruiterProfile.model';
import { ResumeModel } from '../models/resume.model';
import { UserModel } from '../models/user.model';
import { JobModel } from '../models/job.model';
import prisma from '../config/prisma';
import { StorageService } from './storage.service';
import { AppError } from '../utils/appError';
import { UserRole } from '../types';
import type { ParsedResume } from '../utils/resumeParser';

import { normalizeUrl, normalizeLinkedInUrl } from '../utils/url';

const APPLICANT_PROFILE_FIELDS = new Set([
  'name',
  'phone',
  'photo_url',
  'skills',
  'experience',
  'education',
  'portfolio_url',
  'github_url',
  'linkedin_url',
  'bio',
  'visibility',
]);

const RECRUITER_PROFILE_FIELDS = new Set([
  'name',
  'companyName',
  'company_email',
  'industry',
  'description',
  'company_size',
  'logo_url',
  'website',
  'location',
]);

const URL_FIELDS = new Set([
  'portfolio_url',
  'github_url',
  'linkedin_url',
  'website',
  'photo_url',
  'logo_url'
]);

const normalizeProfilePatch = (
  data: Record<string, unknown>,
  allowedFields: Set<string>,
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!allowedFields.has(key)) continue;

    // Treat empty strings as null for optional profile text/URL fields.
    let val = typeof value === 'string' && value.trim() === '' ? null : value;

    // Apply URL normalization — use domain-specific normalizer for linkedin_url.
    if (val && typeof val === 'string' && URL_FIELDS.has(key)) {
      val = key === 'linkedin_url' ? normalizeLinkedInUrl(val) : normalizeUrl(val);
    }

    out[key] = val;
  }
  return out;
};

// ── Profile completeness ────────────────────────────────────────────────────

const computeApplicantCompleteness = (p: ApplicantProfile, email?: string | null): number => {
  const checks = [
    Boolean(p.name?.trim()),
    Boolean(email?.trim()),
    Boolean(p.phone?.trim()),
    Boolean(p.bio?.trim()),
    Boolean(p.portfolio_url?.trim()),
    Boolean(p.linkedin_url?.trim()),
    Boolean(p.github_url?.trim()),
    Boolean(p.photo_url?.trim()),
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
};

const computeRecruiterCompleteness = (p: RecruiterProfile): number => {
  let score = 0;
  if (p.name) score += 10;
  if (p.companyName) score += 20;
  if (p.industry) score += 10;
  if (p.description) score += 20;
  if (p.company_size) score += 10;
  if (p.logo_url) score += 10;
  if (p.website) score += 10;
  if (p.location) score += 10;
  return Math.min(score, 100);
};

// ── Service ─────────────────────────────────────────────────────────────────

export const UserService = {
  async getProfile(userId: string, role: UserRole) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    if (role === 'applicant') {
      const profile = await ApplicantProfileModel.findByUserId(userId);
      const defaultResume = await ResumeModel.findDefaultByUserId(userId);
      const profileOut = profile
        ? { ...profile, resume_url: defaultResume?.file_url ?? null }
        : null;
      const completeness = profile ? computeApplicantCompleteness(profile, user.email) : 0;
      const githubRepos: any[] = [];
      const projects: any[] = [];
      const certifications: any[] = [];
      return {
        email: user.email,
        role: user.role,
        credit_balance: user.credit_balance,
        referral_code: user.referral_code,
        profile: profileOut,
        completeness,
        githubRepos,
        projects,
        certifications,
      };
    }

    if (role === 'recruiter') {
      let profile = await RecruiterProfileModel.findByUserId(userId);
      if (!profile) {
        profile = await RecruiterProfileModel.create(userId);
      }
      const completeness = computeRecruiterCompleteness(profile);
      return {
        email: user.email,
        role: user.role,
        credit_balance: user.credit_balance,
        referral_code: user.referral_code,
        profile,
        completeness,
      };
    }

    return { email: user.email, role: user.role };
  },

  async updateApplicantProfile(
    userId: string,
    data: Partial<Omit<ApplicantProfile, 'user_id' | 'created_at' | 'updated_at'>>,
  ) {
    const raw = { ...data } as Record<string, unknown>;
    delete raw.resume_url;

    const patch = normalizeProfilePatch(raw, APPLICANT_PROFILE_FIELDS) as Partial<
      Omit<ApplicantProfile, 'user_id' | 'created_at' | 'updated_at'>
    >;

    let profile = await ApplicantProfileModel.findByUserId(userId);
    if (!profile) profile = await ApplicantProfileModel.create(userId);

    if (Object.keys(patch).length === 0) {
      const user = await UserModel.findById(userId);
      const defaultResume = await ResumeModel.findDefaultByUserId(userId);
      return {
        profile: { ...profile, resume_url: defaultResume?.file_url ?? null },
        completeness: computeApplicantCompleteness(profile, user?.email ?? null),
      };
    }

    const updated = await ApplicantProfileModel.update(userId, patch);
    const user = await UserModel.findById(userId);
    const defaultResume = await ResumeModel.findDefaultByUserId(userId);
    return {
      profile: { ...updated, resume_url: defaultResume?.file_url ?? null },
      completeness: computeApplicantCompleteness(updated, user?.email ?? null),
    };
  },

  async updateRecruiterProfile(
    userId: string,
    data: Partial<Omit<RecruiterProfile, 'user_id' | 'created_at' | 'updated_at'>>,
  ) {
    const patch = normalizeProfilePatch(
      data as Record<string, unknown>,
      RECRUITER_PROFILE_FIELDS,
    ) as Partial<Omit<RecruiterProfile, 'user_id' | 'created_at' | 'updated_at'>>;

    let profile = await RecruiterProfileModel.findByUserId(userId);
    if (!profile) profile = await RecruiterProfileModel.create(userId);

    if (Object.keys(patch).length === 0) {
      return { profile, completeness: computeRecruiterCompleteness(profile) };
    }

    const updated = await RecruiterProfileModel.update(userId, patch);
    return { profile: updated, completeness: computeRecruiterCompleteness(updated) };
  },

  async uploadResume(userId: string, file: Express.Multer.File) {
    const { url } = await StorageService.uploadResume(file);
    const row = await ResumeModel.createDefaultForUser(userId, {
      file_url: url,
      file_name: file.originalname,
      file_size: file.size ?? Buffer.byteLength(file.buffer),
      mime_type: file.mimetype,
    });

    // Keep upload resilient: parsing is best-effort and should not block file persistence.
    if ((file.mimetype || '').toLowerCase().includes('pdf')) {
      try {
        const { parseResume } = await import('../utils/resumeParser');
        const parsed = await parseResume(file.buffer, {
          filename: file.originalname,
          mimeType: file.mimetype,
        });
        await UserService.syncParsedResumeToProfile(userId, parsed);
      } catch (err) {
        console.warn('Resume uploaded but parsing/profile sync failed:', err);
      }
    }

    return {
      resume: {
        id: row.id,
        file_url: row.file_url,
        created_at: row.created_at,
      },
    };
  },

  async syncParsedResumeToProfile(userId: string, parsed: ParsedResume) {
    let profile = await ApplicantProfileModel.findByUserId(userId);
    if (!profile) {
      profile = await ApplicantProfileModel.create(userId);
    }

    const patch: Partial<Pick<ApplicantProfile, 'name' | 'skills' | 'experience' | 'education'>> = {};

    if (!profile.name && parsed.name) {
      patch.name = parsed.name;
    }

    if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
      patch.skills = Array.from(new Set(parsed.skills.map((s) => String(s).trim()).filter(Boolean)));
    }

    if (Array.isArray(parsed.experience) && parsed.experience.length > 0) {
      patch.experience = parsed.experience;
    }

    if (Array.isArray(parsed.education) && parsed.education.length > 0) {
      patch.education = parsed.education;
    }

    if (Object.keys(patch).length > 0) {
      await ApplicantProfileModel.update(userId, patch);
    }
  },

  async uploadPhoto(userId: string, role: UserRole, file: Express.Multer.File) {
    const folder = role === 'recruiter' ? 'logos' : 'photos';
    const { url } = await StorageService.uploadPhoto(file, folder);

    if (role === 'applicant') {
      await ApplicantProfileModel.update(userId, { photo_url: url });
    } else {
      await RecruiterProfileModel.update(userId, { logo_url: url });
    }
    return { url };
  },

  // ── Saved Jobs ──────────────────────────────────────────────────────────────

  async getSavedJobs(userId: string) {
    return JobModel.getSavedJobs(userId);
  },

  async saveJob(userId: string, jobId: string) {
    await JobModel.saveJob(userId, jobId);
  },

  async unsaveJob(userId: string, jobId: string) {
    await JobModel.unsaveJob(userId, jobId);
  },

  async getPublicProfile(targetUserId: string, requestingUser?: { userId: string; role: string }) {
    const user = await UserModel.findById(targetUserId);
    if (!user) throw new AppError('User not found', 404);

    if (user.role === 'applicant') {
      const profile = await ApplicantProfileModel.findByUserId(targetUserId);
      if (!profile) throw new AppError('Profile not found', 404);

      // Check visibility constraints
      const visibility = (profile as any).visibility || 'public';
      const isOwner = requestingUser?.userId === targetUserId;
      const isAdmin = requestingUser?.role === 'admin';
      const isRecruiter = requestingUser?.role === 'recruiter';

      if (visibility === 'hidden') {
        if (!isOwner && !isAdmin) {
          throw new AppError('Profile not found', 404);
        }
      } else if (visibility === 'private') {
        if (!requestingUser) {
          throw new AppError('This profile is private. Please log in as a recruiter or authorized user to view.', 403);
        }
        if (!isOwner && !isAdmin && !isRecruiter) {
          throw new AppError('This profile is private. You do not have permission to view it.', 403);
        }
      }

      const defaultResume = await ResumeModel.findDefaultByUserId(targetUserId);
      const profileOut = { ...profile, resume_url: defaultResume?.file_url ?? null };
      const githubRepos: any[] = [];
      const projects: any[] = [];
      const certifications: any[] = [];
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: profileOut,
        githubRepos,
        projects,
        certifications,
      };
    }
    if (user.role === 'recruiter') {
      const profile = await RecruiterProfileModel.findByUserId(targetUserId);
      return { id: user.id, email: user.email, role: user.role, profile };
    }
    return { id: user.id, role: user.role };
  },
};
