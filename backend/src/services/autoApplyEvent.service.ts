import { AutoApplyEventModel } from '../models/autoApplyEvent.model';
import { AutoApplyEventType } from '../types/autoApply.types';

const LOG_PREFIX = '[AutoApplyEventService]';

export const AutoApplyEventService = {
  async logEvent(params: {
    userId: string;
    jobId?: string | null;
    queueItemId?: string | null;
    eventType: AutoApplyEventType;
    metadata?: Record<string, unknown>;
  }) {
    try {
      return await AutoApplyEventModel.create({
        user_id: params.userId,
        job_id: params.jobId,
        queue_item_id: params.queueItemId,
        event_type: params.eventType,
        metadata: params.metadata,
      });
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to log event ${params.eventType}`, err);
      return null;
    }
  },

  async listEvents(userId: string, options: { page?: number; limit?: number; jobId?: string } = {}) {
    return AutoApplyEventModel.listByUser(userId, options);
  },
};
