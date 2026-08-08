import prisma from '../../config/prisma';
import { LearningAuditService } from './LearningAuditService';

export class EmployerSkillFilterService {
  /**
   * Filters candidates based on explicitly verified skills and minimum proficiency.
   */
  public static async searchCandidatesByVerifiedSkills(
    employerId: string, 
    requiredSkills: { skillName: string; minProficiency: number; requireVerified: boolean }[]
  ) {
    // We will find all candidates who meet the skill requirements.
    // In a real scale environment, this would build a dynamic SQL query or use ElasticSearch.

    const matchingCandidates = [];

    // For demonstration, we fetch all profiles and filter in-memory, or we can use a complex prisma query.
    // Let's use a Prisma query to find candidate_ids that have the required skills.
    
    // We will log the search action for auditability
    await LearningAuditService.logAction({
      candidateId: employerId, // Using candidateId field for employerId temporarily for audit
      actionType: 'employer_skill_search',
      reasoning: { requiredSkills }
    });

    // To keep it simple, we'll find candidate_skills matching the criteria
    const skillNames = requiredSkills.map(rs => rs.skillName);
    
    const candidatesWithSkills = await (prisma as any).candidate_skills.findMany({
      where: {
        skills: {
          name: { in: skillNames }
        }
      },
      include: {
        skills: true,
        users: {
          include: {
            applicant_profiles: true
          }
        }
      }
    });

    // Group by candidateId
    const candidateMap = new Map<string, any[]>();
    for (const cs of candidatesWithSkills) {
      if (!candidateMap.has(cs.candidate_id)) {
        candidateMap.set(cs.candidate_id, []);
      }
      candidateMap.get(cs.candidate_id)?.push(cs);
    }

    for (const [candidateId, skills] of candidateMap.entries()) {
      let matches = true;
      for (const req of requiredSkills) {
        const matchingSkill = skills.find(s => s.skills.name === req.skillName);
        if (!matchingSkill) {
          matches = false;
          break;
        }

        if (matchingSkill.proficiency < req.minProficiency) {
          matches = false;
          break;
        }

        if (req.requireVerified && matchingSkill.verification_status === 'SELF_REPORTED') {
          matches = false;
          break;
        }
      }

      if (matches) {
        matchingCandidates.push(skills[0].users); // Push the user profile
      }
    }

    return matchingCandidates;
  }
}
