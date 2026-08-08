import prisma from '../../config/prisma';

export class SkillProfileService {
  /**
   * Retrieves the public skill profile for a candidate, showing verified vs self-reported skills.
   */
  public static async getPublicSkillProfile(candidateId: string) {
    const candidateSkills = await (prisma as any).candidate_skills.findMany({
      where: { candidate_id: candidateId },
      include: { skills: true },
      orderBy: [
        { verification_status: 'desc' }, // E.g., EMPLOYER_VERIFIED first
        { proficiency: 'desc' }
      ]
    });

    const verifiedSkills = candidateSkills.filter((cs: any) => cs.verification_status !== 'SELF_REPORTED');
    const selfReportedSkills = candidateSkills.filter((cs: any) => cs.verification_status === 'SELF_REPORTED');

    return {
      verified: verifiedSkills.map((cs: any) => ({
        skillName: cs.skills.name,
        proficiency: cs.proficiency,
        verificationStatus: cs.verification_status,
        creditsEarned: cs.credits_earned,
        source: cs.source,
        lastUpdated: cs.updated_at
      })),
      selfReported: selfReportedSkills.map((cs: any) => ({
        skillName: cs.skills.name,
        proficiency: cs.proficiency,
        verificationStatus: cs.verification_status,
        creditsEarned: cs.credits_earned,
        source: cs.source,
        lastUpdated: cs.updated_at
      }))
    };
  }
}
