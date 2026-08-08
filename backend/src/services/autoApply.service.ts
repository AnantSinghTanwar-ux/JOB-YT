import { AutoApplyModel } from '../models/autoApply.model';
import { JwtPayload } from '../types';
import prisma from '../config/prisma';
import pool from '../config/database';
import { ApplicationService } from './application.service';

export const AutoApplyService = {
  async getPreferences(user: JwtPayload) {
    const prefs = await AutoApplyModel.getPreferences(user.userId);
    if (!prefs) {
      return {
        status: 'disabled',
        job_titles: [],
        locations: [],
        job_types: [],
        min_salary: null,
        max_applications_per_day: 5,
      };
    }
    return prefs;
  },

  async updatePreferences(user: JwtPayload, data: any) {
    const updated = await AutoApplyModel.upsertPreferences(user.userId, data);
    
    // If auto-apply is enabled/active, perform matching scan immediately
    if (updated.status === 'enabled') {
      await this.matchJobsForUser(user.userId);
    }
    return updated;
  },

  async getDashboardData(user: JwtPayload) {
    // Refresh queue before returning dashboard data to ensure new jobs are picked up
    try {
      await this.matchJobsForUser(user.userId);
    } catch (err) {
      console.error('[AutoApplyService] Failed to auto-match jobs on dashboard load:', err);
    }

    const [preferences, logs] = await Promise.all([
      this.getPreferences(user),
      AutoApplyModel.getLogs(user.userId),
    ]);

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const appliedLast24h = await AutoApplyModel.getRecentLogsCount(user.userId, oneDayAgo);

    return {
      preferences,
      logs,
      stats: {
        applied_last_24h: appliedLast24h,
      }
    };
  },

  /**
   * Scans active jobs and queues matching ones for the user.
   */
  async matchJobsForUser(userId: string) {
    const prefs = await AutoApplyModel.getPreferences(userId);
    if (!prefs || prefs.status !== 'enabled') {
      return [];
    }

    // Fetch active jobs user has not applied to, and are not already in auto_apply_logs
    const { rows: jobRows } = await pool.query(`
      SELECT j.id, j.title, j.description, j.skills, j.company_name as "companyName", j.location, j.type, j.salary_min as "salaryMin", j.salary_max as "salaryMax", j.application_questions as "applicationQuestions"
      FROM jobs j
      WHERE j.status = 'active'
        AND j.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM applications a WHERE a.job_id = j.id AND a.applicant_id = $1
        )
        AND NOT EXISTS (
          SELECT 1 FROM auto_apply_logs l WHERE l.job_id = j.id AND l.user_id = $1
        )
    `, [userId]);

    const matchedJobs = jobRows.filter(job => {
      // 1. Job Titles Filter
      if (prefs.target_roles && prefs.target_roles.length > 0) {
        const matchesTitle = prefs.target_roles.some((title: string) => 
          job.title.toLowerCase().includes(title.toLowerCase())
        );
        if (!matchesTitle) return false;
      }

      // 2. Locations Filter
      if (prefs.target_locations && prefs.target_locations.length > 0) {
        const matchesLoc = prefs.target_locations.some((loc: string) => {
          const jobLoc = (job.location || '').toLowerCase();
          const pLoc = loc.toLowerCase();
          if (pLoc === 'remote') {
            return jobLoc.includes('remote') || job.type === 'remote';
          }
          return jobLoc.includes(pLoc);
        });
        if (!matchesLoc) return false;
      }

      // 3. Job Types Filter
      if (prefs.target_job_types && prefs.target_job_types.length > 0) {
        const matchesType = prefs.target_job_types.some((type: string) => {
          const normalizedJobType = (job.type || '').replace('_', '-').toLowerCase();
          const normalizedPrefType = type.replace('_', '-').toLowerCase();
          return normalizedJobType === normalizedPrefType;
        });
        if (!matchesType) return false;
      }

      return true;
    });

    if (matchedJobs.length > 0) {
      const logsToInsert = matchedJobs.map(job => ({
        user_id: userId,
        job_id: job.id,
        status: 'pending',
      }));

      await prisma.auto_apply_logs.createMany({
        data: logsToInsert,
        skipDuplicates: true,
      });
    }

    return matchedJobs;
  },

  /**
   * Processes the user's pending queue up to their daily application limit.
   */
  async processPendingApplies(userId: string): Promise<number> {
    const prefs = await AutoApplyModel.getPreferences(userId);
    if (!prefs || prefs.status !== 'enabled') {
      return 0;
    }

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const appliedTodayCount = await AutoApplyModel.getRecentLogsCount(userId, oneDayAgo);
    const maxApps = 5; // Fixed default
    const remainingLimit = maxApps - appliedTodayCount;

    if (remainingLimit <= 0) {
      return 0;
    }

    const pendingLogs = await prisma.auto_apply_logs.findMany({
      where: {
        user_id: userId,
        status: 'pending',
      },
      include: {
        jobs: true,
      },
      orderBy: {
        created_at: 'asc',
      },
      take: remainingLimit,
    });

    if (pendingLogs.length === 0) {
      return 0;
    }

    // Get default resume for candidate
    const defaultResume = await prisma.resumes.findFirst({
      where: {
        user_id: userId,
        is_default: true,
      },
    });

    let appliedCount = 0;

    for (const log of pendingLogs) {
      if (!defaultResume) {
        await prisma.auto_apply_logs.update({
          where: { id: log.id },
          data: {
            status: 'failed',
            error_message: 'No default resume set. Please upload a resume and mark it as default.',
          },
        });
        continue;
      }

      const jobQuestions = Array.isArray(log.jobs.application_questions)
        ? log.jobs.application_questions
        : [];
      const hasRequiredQuestions = jobQuestions.some((q: any) => q.required);

      if (hasRequiredQuestions) {
        await prisma.auto_apply_logs.update({
          where: { id: log.id },
          data: {
            status: 'failed',
            error_message: 'Job requires application questions. Please apply manually.',
          },
        });
        continue;
      }

      try {
        await ApplicationService.apply(userId, log.job_id, {
          resume_id: defaultResume.id,
        });

        await prisma.auto_apply_logs.update({
          where: { id: log.id },
          data: {
            status: 'applied',
            applied_at: new Date(),
            error_message: null,
          },
        });

        appliedCount++;
      } catch (err: any) {
        await prisma.auto_apply_logs.update({
          where: { id: log.id },
          data: {
            status: 'failed',
            error_message: err.message || 'Unknown error occurred during application.',
          },
        });
      }
    }

    return appliedCount;
  },

  /**
   * Manually trigger apply for a single queue item.
   */
  async applyLogEntry(userId: string, logId: string) {
    const log = await prisma.auto_apply_logs.findFirst({
      where: {
        id: logId,
        user_id: userId,
      },
      include: {
        jobs: true,
      },
    });

    if (!log) {
      throw Object.assign(new Error('Queue item not found'), { statusCode: 404 });
    }

    const defaultResume = await prisma.resumes.findFirst({
      where: {
        user_id: userId,
        is_default: true,
      },
    });

    if (!defaultResume) {
      const errMsg = 'No default resume set. Please upload a resume and mark it as default.';
      await prisma.auto_apply_logs.update({
        where: { id: logId },
        data: { status: 'failed', error_message: errMsg },
      });
      throw Object.assign(new Error(errMsg), { statusCode: 422 });
    }

    const jobQuestions = Array.isArray(log.jobs.application_questions)
      ? log.jobs.application_questions
      : [];
    const hasRequiredQuestions = jobQuestions.some((q: any) => q.required);

    if (hasRequiredQuestions) {
      const errMsg = 'Job requires application questions. Please apply manually on the job page.';
      await prisma.auto_apply_logs.update({
        where: { id: logId },
        data: { status: 'failed', error_message: errMsg },
      });
      throw Object.assign(new Error(errMsg), { statusCode: 422 });
    }

    try {
      const result = await ApplicationService.apply(userId, log.job_id, {
        resume_id: defaultResume.id,
      });

      await prisma.auto_apply_logs.update({
        where: { id: logId },
        data: {
          status: 'applied',
          applied_at: new Date(),
          error_message: null,
        },
      });

      return result;
    } catch (err: any) {
      const msg = err.message || 'Application failed';
      await prisma.auto_apply_logs.update({
        where: { id: logId },
        data: {
          status: 'failed',
          error_message: msg,
        },
      });
      throw err;
    }
  },

  /**
   * Remove/dismiss a pending queue item.
   */
  async removeLogEntry(userId: string, logId: string) {
    const log = await prisma.auto_apply_logs.findFirst({
      where: {
        id: logId,
        user_id: userId,
        status: 'pending',
      },
    });

    if (!log) {
      throw Object.assign(new Error('Pending queue item not found'), { statusCode: 404 });
    }

    await prisma.auto_apply_logs.delete({
      where: { id: logId },
    });

    return true;
  }
};
