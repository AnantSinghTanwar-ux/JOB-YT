import { Worker, Job } from 'bullmq';
import { getRedisConnectionForWorker } from '../config/queue';
import { signPayload } from '../services/webhook/signer';
import { WebhookDeliveryModel } from '../models/webhook.model';

const LOG_PREFIX = '[WebhookWorker]';

export interface WebhookJob {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  eventType: string;
  payload: unknown;
  attempt: number;
}

async function deliverWebhook(job: WebhookJob): Promise<void> {
  const signature = signPayload(job.payload, job.secret);

  const response = await fetch(job.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Jobyt-Event': job.eventType,
      'X-Jobyt-Signature': signature,
      'X-Jobyt-Delivery': job.deliveryId,
      'User-Agent': 'Jobyt-Webhook/1.0',
    },
    body: JSON.stringify(job.payload),
    signal: AbortSignal.timeout(10_000),
  });

  let responseBody: string;
  try {
    responseBody = await response.text();
  } catch {
    responseBody = '[body unreadable]';
  }

  await WebhookDeliveryModel.updateResult(job.deliveryId, {
    response_status: response.status,
    response_body: responseBody.slice(0, 2000),
    attempt: job.attempt,
  });

  if (!response.ok) {
    throw new Error(`Webhook responded with ${response.status}`);
  }
}

export const webhookWorker = new Worker(
  'webhookQueue',
  async (job: Job<WebhookJob>) => {
    if (job.name === 'deliver') {
      await deliverWebhook(job.data);
    }
  },
  {
    connection: getRedisConnectionForWorker() as any,
    concurrency: 5,
    limiter: { max: 10, duration: 1000 },
  },
);

webhookWorker.on('completed', (job) => {
  console.log(`${LOG_PREFIX} Job ${job.id} completed`);
});

webhookWorker.on('failed', (job, err) => {
  if (job) {
    console.warn(`${LOG_PREFIX} Job ${job.id} attempt ${job.attemptsMade} failed: ${err.message}`);
  }
});
