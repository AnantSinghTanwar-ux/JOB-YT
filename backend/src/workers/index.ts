import { notificationWorker } from './notificationWorker';
import { recommendationWorker } from './recommendationWorker';
import { webhookWorker } from './webhookWorker';
import { codingEvaluationWorker } from './codingEvaluationWorker';
import { autoApplyWorker } from './autoApplyWorker';
import { broadcastWorker } from './broadcastWorker';
import { videoTranscriptionWorker } from './videoTranscriptionWorker';
import { videoEvaluationWorker } from './videoEvaluationWorker';

import { isRedisAvailable } from '../config/redis';

export const startWorkers = () => {
  if (!isRedisAvailable()) {
    console.warn('[Workers] Redis is not available. Background workers will NOT be started.');
    return null;
  }

  console.log('[Workers] BullMQ Workers started');
  return {
    notificationWorker,
    recommendationWorker,
    webhookWorker,
    codingEvaluationWorker,
    autoApplyWorker,
    broadcastWorker,
    videoTranscriptionWorker,
    videoEvaluationWorker,
  };
};

export const stopWorkers = async () => {
  await notificationWorker.close();
  await recommendationWorker.close();
  await webhookWorker.close();
  await codingEvaluationWorker.close();
  await autoApplyWorker.close();
  await broadcastWorker.close();
  await videoTranscriptionWorker.close();
  await videoEvaluationWorker.close();
};

