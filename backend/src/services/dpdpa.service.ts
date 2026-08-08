import prisma from '../config/prisma';

export const DpdpaService = {
  /**
   * Log user consent for specific processing activities (DPDPA requirement)
   */
  async logConsent(userId: string, consentType: string, isGranted: boolean, ipAddress?: string, userAgent?: string) {
    return prisma.dpdpa_consent_logs.create({
      data: {
        user_id: userId,
        consent_type: consentType,
        is_granted: isGranted,
        ip_address: ipAddress,
        user_agent: userAgent
      }
    });
  },

  /**
   * Generate an export of all data associated with a user (Right to Data Portability)
   */
  async generateDataExport(userId: string) {
    const user = await prisma.users.findUnique({ where: { id: userId } });
    const applications = await prisma.applications.findMany({ where: { applicant_id: userId } });
    const skills = await prisma.candidate_skills.findMany({ where: { candidate_id: userId } });
    const learning = await prisma.learning_progress.findMany({ where: { candidate_id: userId } });

    return {
      personal_info: user,
      applications: applications,
      skills: skills,
      learning: learning,
      export_date: new Date()
    };
  },

  /**
   * Schedule a user for data deletion (Right to be Forgotten)
   * Hard deletion typically delayed by 30 days for recovery.
   */
  async requestDataDeletion(userId: string) {
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + 30); // 30-day grace period

    return prisma.data_deletion_requests.upsert({
      where: { id: userId }, // Need a unique check or just create
      create: {
        user_id: userId,
        scheduled_for: scheduledFor,
        status: 'pending'
      },
      update: {
        scheduled_for: scheduledFor,
        status: 'pending'
      }
    }).catch(async () => {
       // If upsert fails due to missing unique constraint on user_id, fallback to create
       return prisma.data_deletion_requests.create({
         data: {
           user_id: userId,
           scheduled_for: scheduledFor,
           status: 'pending'
         }
       });
    });
  }
};
