import prisma from '../../config/prisma';
import { CreditService } from './CreditService';
import { LearningAuditService } from './LearningAuditService';

export class LearningProgressService {
  /**
   * Starts a course for a candidate.
   */
  public static async startCourse(candidateId: string, courseId: string) {
    const progress = await (prisma as any).learning_progress.upsert({
      where: {
        candidate_id_course_id: {
          candidate_id: candidateId,
          course_id: courseId
        }
      },
      create: {
        candidate_id: candidateId,
        course_id: courseId,
        status: 'IN_PROGRESS',
        started_at: new Date()
      },
      update: {
        status: 'IN_PROGRESS',
        started_at: new Date() // Or keep original started_at
      }
    });

    await LearningAuditService.logAction({
      candidateId,
      actionType: 'course_started',
      progressUpdates: { courseId, status: 'IN_PROGRESS' }
    });

    return progress;
  }

  /**
   * Marks a course as completed and awards credits.
   */
  public static async completeCourse(candidateId: string, courseId: string, certificateUrl?: string) {
    const progress = await (prisma as any).learning_progress.update({
      where: {
        candidate_id_course_id: {
          candidate_id: candidateId,
          course_id: courseId
        }
      },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        certificate_url: certificateUrl
      },
      include: {
        courses: true
      }
    });

    // Award credits based on the course's skill tags
    for (const skillName of progress.courses.skill_tags) {
      await CreditService.awardCreditsFromCourse(candidateId, skillName, progress.id);
    }

    await LearningAuditService.logAction({
      candidateId,
      actionType: 'course_completed',
      progressUpdates: { courseId, status: 'COMPLETED' }
    });

    return progress;
  }
}
