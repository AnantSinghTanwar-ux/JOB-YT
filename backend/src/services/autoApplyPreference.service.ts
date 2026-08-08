import pool from '../config/database';
import { CREDIT_COSTS } from '../config/creditCosts';
import { AutoApplyPreferenceModel } from '../models/autoApplyPreference.model';
import { ResumeModel } from '../models/resume.model';
import { ProfileRequirementsService } from './profileRequirements.service';
import { CreditService } from './credit.service';
import { getAutoApplyQueue } from '../config/queue';
import {
  AutoApplyPreferencesInput,
  AutoApplyStatus,
} from '../types/autoApply.types';

const PREVIEW_ACK_TTL_MS = 24 * 60 * 60 * 1000;

export const AutoApplyPreferenceService = {
  async getPreferences(userId: string) {
    return AutoApplyPreferenceModel.getOrCreate(userId);
  },

  async updatePreferences(userId: string, input: AutoApplyPreferencesInput) {
    if (input.base_resume_id) {
      const resume = await ResumeModel.findByUserAndId(userId, input.base_resume_id);
      if (!resume) {
        throw Object.assign(new Error('Selected resume not found'), { statusCode: 404 });
      }
    }

    if (input.match_threshold != null && (input.match_threshold < 0 || input.match_threshold > 100)) {
      throw Object.assign(new Error('match_threshold must be between 0 and 100'), { statusCode: 422 });
    }

    if (input.approval_mode && input.approval_mode !== 'manual' && input.approval_mode !== 'auto') {
      throw Object.assign(new Error('Invalid approval_mode'), { statusCode: 422 });
    }

    return AutoApplyPreferenceModel.upsert(userId, input);
  },

  async setStatus(userId: string, status: AutoApplyStatus, options?: { consented?: boolean }) {
    const prefs = await AutoApplyPreferenceModel.getOrCreate(userId);

    if (status === 'enabled') {
      await ProfileRequirementsService.assertApplicantCanApply(userId);

      const resumeId = prefs.base_resume_id;
      let hasResume = false;
      if (resumeId) {
        hasResume = Boolean(await ResumeModel.findByUserAndId(userId, resumeId));
      }
      if (!hasResume) {
        const { rows } = await pool.query(
          'SELECT id FROM resumes WHERE user_id = $1 LIMIT 1',
          [userId],
        );
        hasResume = rows.length > 0;
      }
      if (!hasResume) {
        throw Object.assign(new Error('Upload a resume before enabling Auto-Apply'), {
          statusCode: 422,
          code: 'RESUME_REQUIRED',
        });
      }

      const balance = await CreditService.getBalance(userId);
      if (balance < CREDIT_COSTS.APPLY_JOB) {
        throw Object.assign(new Error('Insufficient credits to enable Auto-Apply'), {
          statusCode: 402,
          code: 'INSUFFICIENT_CREDITS',
        });
      }

      if (options?.consented) {
        await AutoApplyPreferenceModel.setConsent(userId);
      }

      const refreshed = await AutoApplyPreferenceModel.findByUserId(userId);
      if (!refreshed?.consented_at) {
        throw Object.assign(new Error('Consent required before enabling Auto-Apply'), {
          statusCode: 422,
          code: 'CONSENT_REQUIRED',
        });
      }

      if (!refreshed.preview_ack_at || Date.now() - refreshed.preview_ack_at.getTime() > PREVIEW_ACK_TTL_MS) {
        throw Object.assign(new Error('Preview Auto-Apply matches before enabling'), {
          statusCode: 422,
          code: 'PREVIEW_REQUIRED',
        });
      }
    }

    const result = await AutoApplyPreferenceModel.updateStatus(userId, status);
    
    // Trigger an immediate match run when enabled
    if (status === 'enabled') {
      const aaQueue = getAutoApplyQueue();
      if (aaQueue) {
        await aaQueue.add('matchForUser', { userId, trigger: 'activation' });
      }
    }
    
    return result;
  },

  async acknowledgePreview(userId: string) {
    await AutoApplyPreferenceModel.getOrCreate(userId);
    await AutoApplyPreferenceModel.setPreviewAck(userId);
    return AutoApplyPreferenceModel.findByUserId(userId);
  },
};
