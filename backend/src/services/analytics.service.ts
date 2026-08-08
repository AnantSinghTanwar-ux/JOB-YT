import prisma from '../config/prisma';
import { AppError } from '../utils/appError';

interface AnalyticsProvider {
  getSummary(userId: string): Promise<any>;
  getTimeSeries(userId: string, days: number): Promise<any>;
}

class EmployerAnalyticsProvider implements AnalyticsProvider {
  async getSummary(userId: string) {
    const totalJobs = await prisma.jobs.count({ where: { recruiter_id: userId, deleted_at: null } });
    const activeJobs = await prisma.jobs.count({ where: { recruiter_id: userId, status: 'active', deleted_at: null } });
    
    // Total Applications
    const applications = await prisma.applications.findMany({
      where: { jobs: { recruiter_id: userId } },
      select: { status: true }
    });
    
    const totalApplications = applications.length;
    const totalHired = applications.filter(a => a.status === 'hired').length;

    // Total Views
    const jobs = await prisma.jobs.findMany({
      where: { recruiter_id: userId, deleted_at: null },
      select: { views_count: true }
    });
    const totalViews = jobs.reduce((sum, j) => sum + (j.views_count || 0), 0);

    return { total_jobs: totalJobs, active_jobs: activeJobs, total_applications: totalApplications, total_hired: totalHired, total_views: totalViews };
  }

  async getTimeSeries(userId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const apps = await prisma.applications.findMany({
      where: {
        jobs: { recruiter_id: userId },
        created_at: { gte: startDate }
      },
      select: { created_at: true }
    });

    // Group by day dynamically
    const byDay: Record<string, number> = {};
    for (const app of apps) {
      const d = app.created_at!.toISOString().split('T')[0];
      byDay[d] = (byDay[d] || 0) + 1;
    }

    return Object.keys(byDay).sort().map(date => ({ date, count: byDay[date] }));
  }
}

class StudentAnalyticsProvider implements AnalyticsProvider {
  async getSummary(userId: string) {
    const totalApplications = await prisma.applications.count({ where: { applicant_id: userId } });
    const hired = await prisma.applications.count({ where: { applicant_id: userId, status: 'hired' } });
    return { total_applications: totalApplications, total_hired: hired };
  }

  async getTimeSeries(userId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const apps = await prisma.applications.findMany({
      where: {
        applicant_id: userId,
        created_at: { gte: startDate }
      },
      select: { created_at: true }
    });

    const byDay: Record<string, number> = {};
    for (const app of apps) {
      const d = app.created_at!.toISOString().split('T')[0];
      byDay[d] = (byDay[d] || 0) + 1;
    }

    return Object.keys(byDay).sort().map(date => ({ date, count: byDay[date] }));
  }
}

export const AnalyticsService = {
  getProvider(role: 'employer' | 'student' | 'admin'): AnalyticsProvider {
    if (role === 'employer') return new EmployerAnalyticsProvider();
    if (role === 'student') return new StudentAnalyticsProvider();
    throw new AppError('Analytics provider not implemented for role', 400);
  },

  async getSummary(userId: string, role: 'employer' | 'student' | 'admin') {
    return this.getProvider(role).getSummary(userId);
  },

  async getTimeSeries(userId: string, role: 'employer' | 'student' | 'admin', days = 30) {
    return this.getProvider(role).getTimeSeries(userId, days);
  },

  // Legacy compatibility methods mapped to Employer
  async getRecruiterSummary(recruiterId: string) {
    return this.getSummary(recruiterId, 'employer');
  },
  
  async getApplicationsByDay(recruiterId: string, days = 30) {
    return this.getTimeSeries(recruiterId, 'employer', days);
  },

  async getJobViews(recruiterId: string, jobId: string) {
    const job = await prisma.jobs.findUnique({ where: { id: jobId } });
    if (!job) throw new AppError('Job not found', 404);
    if (job.recruiter_id !== recruiterId) throw new AppError('Forbidden', 403);
    return { job_id: jobId, title: job.title, total_views: job.views_count };
  },

  async getApplicationFunnel(recruiterId: string, jobId: string) {
    const job = await prisma.jobs.findUnique({ where: { id: jobId } });
    if (!job) throw new AppError('Job not found', 404);
    if (job.recruiter_id !== recruiterId) throw new AppError('Forbidden', 403);

    const apps = await prisma.applications.findMany({
      where: { job_id: jobId },
      select: { status: true }
    });

    const statusOrder = ['applied', 'in_review', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'];
    const map: Record<string, number> = {};
    for (const app of apps) {
      if (app.status) {
        map[app.status] = (map[app.status] || 0) + 1;
      }
    }

    return {
      job_id: jobId,
      title: job.title,
      funnel: statusOrder.map((s) => ({ status: s, count: map[s] || 0 })),
    };
  },

  async getTimeToHire(recruiterId: string) {
    // Left as stub for Prisma or can be rewritten.
    return [];
  },

  async getTopJobs(recruiterId: string) {
    return [];
  },

  async getCreditUsage(recruiterId: string, days = 30) {
    return [];
  }
};
