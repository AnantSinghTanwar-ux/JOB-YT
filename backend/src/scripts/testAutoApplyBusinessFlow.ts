import { PrismaClient } from '@prisma/client';
import { AutoApplyPreferenceService } from '../services/autoApplyPreference.service';
import { AutoApplyPreviewService } from '../services/autoApplyPreview.service';
import { AutoApplyQueueService } from '../services/autoApplyQueue.service';
import { CreditService } from '../services/credit.service';
import { JobModel } from '../models/job.model';
import { ResumeModel } from '../models/resume.model';
import { UserModel } from '../models/user.model';
import { ApplicantProfileModel } from '../models/applicantProfile.model';
import { ResumeVariantModel } from '../models/resumeVariant.model';
import { UnifiedMatchService } from '../services/unifiedMatch.service';
import { ResumeTailoringService } from '../services/resumeTailoring.service';

UnifiedMatchService.scoreCandidateForJob = async () => ({
  finalMatchScore: 100,
  skillsScore: 100,
  experienceScore: 100,
  semanticScore: 100,
  educationScore: 100,
  matchedSkills: ['Node.js'],
  missingSkills: [],
  matchReason: 'Mocked perfect match'
} as any);

ResumeTailoringService.tailorForJob = async (userId: string, jobId: string, baseResumeId: string, queueItemId?: string) => {
  const variant = await ResumeVariantModel.create({
    user_id: userId,
    job_id: jobId,
    base_resume_id: baseResumeId,
    version_label: 'A',
    snapshot_url: 'https://mock.url/resume.pdf',
    change_log: ['Mocked tailoring'],
    fabricated_risk: false,
    queue_item_id: queueItemId ?? null,
  });
  return { variant, snapshotUrl: 'https://mock.url/resume.pdf' };
};

const prisma = new PrismaClient();

async function runBusinessFlow() {
  console.log('--- STARTING AUTO-APPLY BUSINESS FLOW AUDIT ---');

  let testUserId;
  let testJobId;
  let testResumeId;

  try {
    // 0. Setup Dummy User and Job
    console.log('\n## 0. Setup');
    const user = await prisma.users.create({
      data: {
        email: `flow_${Date.now()}@example.com`,
        password_hash: 'hash',
        role: 'applicant',
        credit_balance: 500,
        referral_code: `rf_${Math.floor(Math.random()*10000)}`
      }
    });
    testUserId = user.id;

    await CreditService.addCredits(user.id, 500, 'Test Credits');

    const resume = await prisma.resumes.create({
      data: {
        user_id: user.id,
        file_name: 'test.pdf',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        is_default: true,
      }
    });
    testResumeId = resume.id;

    await prisma.applicant_profiles.create({
      data: {
        user_id: user.id,
        name: 'Flow Test',
        phone: '1234567890',
        bio: 'Test bio',
        skills: ['Node.js']
      }
    });

    const recruiter = await prisma.users.create({ 
      data: {
        email: `rec_${Date.now()}@example.com`, 
        role: 'recruiter', 
        password_hash: '123',
        referral_code: `rc_${Math.floor(Math.random()*10000)}`
      }
    });
    const job = await prisma.jobs.create({
      data: {
        recruiter_id: recruiter.id,
        title: 'Node.js Engineer',
        description: 'Looking for a Node.js developer',
        status: 'active',
        type: 'full_time'
      }
    });
    testJobId = job.id;

    // 1. Create Auto-Apply preferences.
    console.log('\n## 1. Create Auto-Apply preferences');
    await AutoApplyPreferenceService.updatePreferences(user.id, {
      target_roles: ['Node.js Engineer'],
      target_job_types: ['full-time' as any],
      base_resume_id: resume.id,
      approval_mode: 'manual',
      match_threshold: 0,
    });
    console.log('✅ Preferences created successfully.');

    // 2. Run preview mode.
    console.log('\n## 2. Run preview mode');
    const preview = await AutoApplyPreviewService.previewForUser(user.id);
    console.log(`✅ Preview run. Eligible jobs: ${preview.eligible_jobs.length}, Excluded: ${preview.excluded_jobs.length}`);
    if (preview.eligible_jobs.length === 0) {
      console.log('Exclusion reasons:', preview.excluded_jobs.map(e => `${e.title}: ${e.exclusion_reason}`));
    }

    // 3. Confirm PREVIEWED audit event.
    console.log('\n## 3. Confirm PREVIEWED audit event');
    const previewEvent = await prisma.auto_apply_events.findFirst({
      where: { user_id: user.id, event_type: 'PREVIEWED' }
    });
    if (previewEvent) {
      console.log('✅ PREVIEWED event found.');
    } else {
      console.log('❌ PREVIEWED event NOT found.');
    }

    // 4. Enable Auto-Apply.
    console.log('\n## 4. Enable Auto-Apply');
    // Needs acknowledge preview first
    await AutoApplyPreferenceService.acknowledgePreview(user.id);
    await AutoApplyPreferenceService.setStatus(user.id, 'enabled', { consented: true });
    console.log('✅ Auto-Apply enabled.');

    // 5. Generate matches.
    console.log('\n## 5. Generate matches');
    const matchResult = await AutoApplyQueueService.matchForUser(user.id, 'scheduled');
    console.log(`✅ Matches generated: ${matchResult.matched}`);

    // Fetch the queue item
    const queueItems = await prisma.auto_apply_queue_items.findMany({ where: { user_id: user.id } });
    if (queueItems.length === 0) {
      console.log('❌ No queue items found. Flow blocked.');
      return;
    }
    const queueItemId = queueItems[0].id;

    // 6. Approve a match (implicitly generates variant and submits)
    console.log('\n## 6. Approve a match / 7. Generate tailored variant / 9. Execute auto submission');
    try {
      await AutoApplyQueueService.approve(user.id, queueItemId);
      console.log('✅ Match approved successfully.');
    } catch (err: any) {
      console.log('❌ Error approving match:', err.message);
    }

    // 8. Confirm resume_variants row created.
    console.log('\n## 8. Confirm resume_variants row created');
    const variants = await prisma.resume_variants.findMany({ where: { user_id: user.id } });
    if (variants.length > 0) {
      console.log(`✅ Variant found: ${variants[0].id}`);
    } else {
      console.log('❌ Variant NOT found.');
    }

    // 10. Confirm application row, source, credits, audit trail
    console.log('\n## 10. Confirm application row created, submission_source = auto_apply, credits deducted, audit trail updated');
    const apps = await prisma.applications.findMany({ where: { applicant_id: user.id } });
    if (apps.length > 0) {
      console.log(`✅ Application found. submission_source: ${apps[0].submission_source}`);
    } else {
      console.log('❌ Application NOT found.');
    }

    const credits = await prisma.users.findUnique({ where: { id: user.id } });
    console.log(`Credits after: ${credits?.credit_balance} (Initial was 500)`);

    const finalEvents = await prisma.auto_apply_events.findMany({ where: { user_id: user.id }, orderBy: { created_at: 'asc' } });
    console.log('Audit trail events:', finalEvents.map(e => e.event_type));

    // 11. Trigger digest.
    console.log('\n## 11. Trigger digest');
    const { getNotificationQueue } = await import('../config/queue');
    const nQueue = getNotificationQueue()!;
    await nQueue.add('sendAutoApplyDigest', {
      userId: user.id,
      date: new Date().toISOString(),
      summary: { 'submitted': 1 }
    });
    console.log('✅ Digest job added to queue.');

    // Wait a bit for worker
    await new Promise(res => setTimeout(res, 2000));

    // 12. Confirm notification record created.
    console.log('\n## 12. Confirm notification record created');
    const notifs = await prisma.notifications.findMany({ where: { user_id: user.id } });
    if (notifs.length > 0) {
      console.log(`✅ Notification found: ${notifs[0].type}`);
    } else {
      console.log('❌ Notification NOT found.');
    }

  } catch (error) {
    console.error('Audit script top-level error:', error);
  } finally {
    console.log('\n--- END AUDIT ---');
    await prisma.$disconnect();
    process.exit(0);
  }
}

runBusinessFlow();
