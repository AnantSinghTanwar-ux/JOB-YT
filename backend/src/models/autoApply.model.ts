import prisma from '../config/prisma';

export const AutoApplyModel = {
  async getPreferences(userId: string) {
    return prisma.auto_apply_preferences.findUnique({
      where: { user_id: userId },
    });
  },

  async upsertPreferences(userId: string, data: {
    is_active?: boolean;
    job_titles?: string[];
    locations?: string[];
    job_types?: string[];
    min_salary?: number | null;
    max_applications_per_day?: number;
  }) {
    return prisma.auto_apply_preferences.upsert({
      where: { user_id: userId },
      update: {
        ...data,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        ...data,
      },
    });
  },

  async getLogs(userId: string, status?: string) {
    return prisma.auto_apply_logs.findMany({
      where: {
        user_id: userId,
        ...(status ? { status } : {}),
      },
      include: {
        jobs: {
          select: {
            title: true,
            companyName: true,
            location: true,
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 100, // Limit to recent 100 for dashboard
    });
  },

  async getRecentLogsCount(userId: string, since: Date) {
    return prisma.auto_apply_logs.count({
      where: {
        user_id: userId,
        created_at: {
          gte: since,
        },
      },
    });
  }
};
