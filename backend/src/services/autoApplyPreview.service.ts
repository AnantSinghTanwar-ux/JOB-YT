import { AutoApplyPreferenceModel } from '../models/autoApplyPreference.model';
import { AutoApplyMatchService } from './autoApplyMatch.service';
import { AutoApplyEventService } from './autoApplyEvent.service';
import { PreviewResult, AutoApplyPreferencesInput } from '../types/autoApply.types';

export const AutoApplyPreviewService = {
  async previewForUser(
    userId: string,
    draftPrefs?: AutoApplyPreferencesInput,
  ): Promise<PreviewResult> {
    const saved = await AutoApplyPreferenceModel.getOrCreate(userId);
    const prefs = { ...saved, ...draftPrefs };

    const jobs = await AutoApplyMatchService.fetchEligibleJobs(userId);
    const { eligible, excluded } = await AutoApplyMatchService.rankJobsForUser(userId, prefs);

    const threshold = prefs.match_threshold ?? 70;
    const aboveThreshold = eligible.filter((j) => j.match_score >= threshold);

    const result: PreviewResult = {
      summary: {
        total_scanned: jobs.length,
        eligible: eligible.length,
        excluded: excluded.length,
        above_threshold: aboveThreshold.length,
      },
      eligible_jobs: eligible,
      excluded_jobs: excluded,
    };

    await AutoApplyEventService.logEvent({
      userId,
      eventType: 'PREVIEWED',
      metadata: {
        eligible_count: eligible.length,
        excluded_count: excluded.length,
        total_scanned: jobs.length,
      },
    });

    return result;
  },
};
