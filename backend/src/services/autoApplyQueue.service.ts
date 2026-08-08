import { AutoApplyQueueModel } from '../models/autoApplyQueue.model';
import { AutoApplyPreferenceModel } from '../models/autoApplyPreference.model';
import { AutoApplyMatchService } from './autoApplyMatch.service';
import { AutoApplyEventService } from './autoApplyEvent.service';
import { AutoApplyLimitService } from './autoApplyLimit.service';
import { ResumeTailoringService } from './resumeTailoring.service';
import { ApplicationService } from './application.service';
import { ApplicationModel } from '../models/application.model';
import { AutoApplyQueueStatus } from '../types/autoApply.types';

const APPROVAL_TTL_HOURS = 48;

export const AutoApplyQueueService = {
  async listQueue(userId: string, options: { status?: AutoApplyQueueStatus; page?: number; limit?: number }) {
    return AutoApplyQueueModel.listByUser(userId, options);
  },

  async getStats(userId: string) {
    return AutoApplyQueueModel.getStats(userId);
  },

  async getItem(userId: string, id: string) {
    const item = await AutoApplyQueueModel.findById(id, userId);
    if (!item) {
      throw Object.assign(new Error('Queue item not found'), { statusCode: 404 });
    }
    return item;
  },

  async matchForUser(userId: string, trigger: string) {
    const prefs = await AutoApplyPreferenceModel.findByUserId(userId);
    if (!prefs || prefs.status !== 'enabled') return { matched: 0 };

    const { eligible } = await AutoApplyMatchService.rankJobsForUser(userId, prefs);
    const { maxDaily } = await AutoApplyLimitService.getUserTier(userId);
    const usedToday = await AutoApplyLimitService.getUsageToday(userId);
    const remaining = Math.max(0, maxDaily - usedToday);

    let created = 0;
    // Queue up to 50 eligible jobs so the user can review them. 
    // The daily limit is enforced during the actual application submission.
    for (const job of eligible.slice(0, 50)) {
      const approvalExpires =
        prefs.approval_mode === 'manual'
          ? new Date(Date.now() + APPROVAL_TTL_HOURS * 60 * 60 * 1000)
          : null;

      const status: AutoApplyQueueStatus =
        prefs.approval_mode === 'manual' ? 'pending_approval' : 'matched';

      const item = await AutoApplyQueueModel.create({
        user_id: userId,
        job_id: job.job_id,
        status,
        match_score: job.match_score,
        match_reason: job.match_reason,
        match_breakdown: job.match_breakdown,
        approval_expires_at: approvalExpires,
      });

      await AutoApplyEventService.logEvent({
        userId,
        jobId: job.job_id,
        queueItemId: item.id,
        eventType: 'MATCHED',
        metadata: {
          match_score: job.match_score,
          match_reason: job.match_reason,
          trigger,
          approval_mode: prefs.approval_mode,
        },
      });

      created += 1;

      if (prefs.approval_mode === 'auto') {
        try {
          await this.tailorAndSubmit(userId, job.job_id, item.id);
        } catch (error) {
          console.error(`Tailor and submit failed for job ${job.job_id}:`, error);
          // The tailorAndSubmit function might not have updated status to failed if it crashed completely
          // We could update it here, but it's better to just ensure the loop continues.
        }
      }
    }

    if (created > 0) {
      await AutoApplyLimitService.incrementMatched(userId, created);
      await AutoApplyPreferenceModel.setLastMatchedAt(userId);
    }

    return { matched: created };
  },

  async tailorAndSubmit(userId: string, jobId: string, queueItemId: string) {
    const item = await AutoApplyQueueModel.findById(queueItemId, userId);
    if (!item) return;

    const prefs = await AutoApplyPreferenceModel.findByUserId(userId);
    if (!prefs) return;

    try {
      await AutoApplyLimitService.assertDailyLimit(userId);

      const existing = await ApplicationModel.findByJobAndApplicant(jobId, userId);
      if (existing) {
        await AutoApplyQueueModel.updateStatus(queueItemId, 'skipped', {
          failure_reason: 'Already applied',
          processed_at: new Date(),
        });
        await AutoApplyEventService.logEvent({
          userId,
          jobId,
          queueItemId,
          eventType: 'SKIPPED',
          metadata: { reason: 'already_applied' },
        });
        return;
      }

      await AutoApplyQueueModel.updateStatus(queueItemId, 'tailoring');

      const baseResumeId =
        prefs.base_resume_id || (await AutoApplyMatchService.resolveResumeId(userId, prefs));
      if (!baseResumeId) throw new Error('No resume available');

      const { variant, snapshotUrl } = await ResumeTailoringService.tailorForJob(
        userId,
        jobId,
        baseResumeId,
        queueItemId,
      );

      await AutoApplyEventService.logEvent({
        userId,
        jobId,
        queueItemId,
        eventType: 'TAILORED',
        metadata: { resume_variant_id: variant.id, change_count: variant.change_log.length },
      });

      await AutoApplyQueueModel.updateStatus(queueItemId, 'submitting', {
        resume_variant_id: variant.id,
      });

      const application = await ApplicationService.apply(
        userId,
        jobId,
        {
          resume_id: baseResumeId,
          resume_snapshot_url: snapshotUrl,
        },
        { submissionSource: 'auto_apply' },
      );

      await AutoApplyLimitService.incrementApplied(userId);

      await AutoApplyQueueModel.updateStatus(queueItemId, 'submitted', {
        application_id: application.id,
        processed_at: new Date(),
        resume_variant_id: variant.id,
      });

      await AutoApplyEventService.logEvent({
        userId,
        jobId,
        queueItemId,
        eventType: 'SUBMITTED',
        metadata: {
          application_id: application.id,
          submission_source: 'auto_apply',
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code =
        err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';

      if (code === 'INSUFFICIENT_CREDITS' || code === 'AUTO_APPLY_DAILY_LIMIT') {
        await AutoApplyPreferenceModel.updateStatus(userId, 'paused');
        await AutoApplyEventService.logEvent({
          userId,
          eventType: 'PAUSED',
          metadata: { reason: code },
        });
      }

      await AutoApplyQueueModel.updateStatus(queueItemId, 'failed', {
        failure_reason: message,
        failed_at: new Date(),
        processed_at: new Date(),
      });

      await AutoApplyEventService.logEvent({
        userId,
        jobId,
        queueItemId,
        eventType: 'FAILED',
        metadata: { failure_reason: message, code },
      });

      throw err;
    }
  },

  async approve(userId: string, queueItemId: string) {
    const item = await this.getItem(userId, queueItemId);
    if (item.status !== 'pending_approval' && item.status !== 'matched') {
      throw Object.assign(new Error('Item cannot be approved in current status'), { statusCode: 422 });
    }

    await AutoApplyEventService.logEvent({
      userId,
      jobId: item.job_id,
      queueItemId,
      eventType: 'APPROVED',
      metadata: { approved_by: 'user' },
    });

    await this.tailorAndSubmit(userId, item.job_id, queueItemId);
    return this.getItem(userId, queueItemId);
  },

  async reject(userId: string, queueItemId: string, reason?: string) {
    const item = await this.getItem(userId, queueItemId);
    if (!['pending_approval', 'matched'].includes(item.status)) {
      throw Object.assign(new Error('Item cannot be rejected in current status'), { statusCode: 422 });
    }

    await AutoApplyQueueModel.updateStatus(queueItemId, 'skipped', { processed_at: new Date() });

    await AutoApplyEventService.logEvent({
      userId,
      jobId: item.job_id,
      queueItemId,
      eventType: 'REJECTED',
      metadata: { rejected_by: 'user', reason },
    });

    return this.getItem(userId, queueItemId);
  },

  async cancel(userId: string, queueItemId: string) {
    const item = await this.getItem(userId, queueItemId);
    if (['submitted', 'submitting', 'tailoring'].includes(item.status)) {
      throw Object.assign(new Error('Cannot cancel item in progress'), { statusCode: 422 });
    }
    await AutoApplyQueueModel.updateStatus(queueItemId, 'cancelled', { processed_at: new Date() });
    return this.getItem(userId, queueItemId);
  },

  async retry(userId: string, queueItemId: string) {
    const item = await this.getItem(userId, queueItemId);
    if (item.status !== 'failed') {
      throw Object.assign(new Error('Only failed items can be retried'), { statusCode: 422 });
    }

    const prefs = await AutoApplyPreferenceModel.findByUserId(userId);
    const isManual = !prefs || prefs.approval_mode === 'manual';

    if (isManual) {
      // Put back in the review queue so the user can approve again
      await AutoApplyQueueModel.updateStatus(queueItemId, 'pending_approval', {
        resetFields: ['failure_reason', 'failed_at', 'processed_at'],
      });
    } else {
      // Auto mode: re-attempt immediately
      await AutoApplyQueueModel.updateStatus(queueItemId, 'matched', {
        resetFields: ['failure_reason', 'failed_at'],
      });
      await this.tailorAndSubmit(userId, item.job_id, queueItemId);
    }

    return this.getItem(userId, queueItemId);
  },
};

