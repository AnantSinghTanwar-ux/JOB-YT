import prisma from '../../config/prisma';
import { LearningAuditService } from './LearningAuditService';

export class CreditService {
  private static DEFAULT_COURSE_CREDITS = 50;

  /**
   * Awards credits for a specific skill when a course is completed.
   */
  public static async awardCreditsFromCourse(candidateId: string, skillName: string, progressId: string) {
    // 1. Ensure the skill exists in the taxonomy
    let skill = await prisma.skills.findUnique({
      where: { name: skillName }
    });

    if (!skill) {
      skill = await prisma.skills.create({
        data: { name: skillName, category: 'Uncategorized' }
      });
    }

    // 2. Award the credits
    const creditsToAward = this.DEFAULT_COURSE_CREDITS; // Could be configurable based on difficulty

    await prisma.skill_credits.create({
      data: {
        candidate_id: candidateId,
        skill_id: skill.id,
        credits_earned: creditsToAward,
        completion_source: 'Course Completion',
        reference_id: progressId,
        verification_status: 'COURSE_COMPLETED'
      }
    });

    // 3. Upsert the candidate's skill profile
    const candidateSkill = await prisma.candidate_skills.upsert({
      where: {
        candidate_id_skill_id: {
          candidate_id: candidateId,
          skill_id: skill.id
        }
      },
      create: {
        candidate_id: candidateId,
        skill_id: skill.id,
        credits_earned: creditsToAward,
        proficiency: 10, // Base bump
        verification_status: 'COURSE_COMPLETED',
        source: 'Learning Engine'
      },
      update: {
        credits_earned: { increment: creditsToAward },
        verification_status: 'COURSE_COMPLETED', // Upgrade from SELF_REPORTED
        proficiency: { increment: 5 }
      }
    });

    await LearningAuditService.logAction({
      candidateId,
      actionType: 'credits_awarded',
      creditsAwarded: creditsToAward,
      verificationChanges: { skillName, newStatus: 'COURSE_COMPLETED' },
      reasoning: { source: 'Course completion triggers credit rule', skillName }
    });

    return candidateSkill;
  }
}
