import prisma from '../config/prisma';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * Migration Script: Migrate existing string array skills from applicant_profiles 
 * into the new relational Learning Engine tables (skills + candidate_skills).
 */
async function migrateSkills() {
  logger.info('Starting skills migration to Learning Engine...');
  
  const profiles = await prisma.applicant_profiles.findMany({
    where: {
      skills: { isEmpty: false }
    }
  });

  logger.info(`Found ${profiles.length} profiles with skills to migrate.`);

  let totalMigrated = 0;

  for (const profile of profiles) {
    if (!profile.skills || profile.skills.length === 0) continue;

    for (const skillName of profile.skills) {
      const normalizedSkill = skillName.trim();
      if (!normalizedSkill) continue;

      try {
        // Find or create the skill
        let skillRecord = await (prisma as any).skills.findUnique({
          where: { name: normalizedSkill }
        });

        if (!skillRecord) {
          skillRecord = await (prisma as any).skills.create({
            data: {
              name: normalizedSkill,
              category: 'Uncategorized'
            }
          });
        }

        // Upsert candidate_skill with SELF_REPORTED status
        await (prisma as any).candidate_skills.upsert({
          where: {
            candidate_id_skill_id: {
              candidate_id: profile.user_id,
              skill_id: skillRecord.id
            }
          },
          create: {
            candidate_id: profile.user_id,
            skill_id: skillRecord.id,
            verification_status: 'SELF_REPORTED',
            proficiency: 0,
            credits_earned: 0,
            source: 'Legacy Profile Migration'
          },
          update: {} // Do nothing if it already exists
        });

        totalMigrated++;
      } catch (error: any) {
        logger.error(`Error migrating skill ${normalizedSkill} for user ${profile.user_id}: ${error.message}`);
      }
    }
  }

  logger.info(`Migration complete! Migrated ${totalMigrated} candidate skills.`);
}

// Execute if run directly
if (require.main === module) {
  migrateSkills()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
