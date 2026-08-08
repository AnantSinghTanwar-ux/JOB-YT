import { Worker, Job } from 'bullmq';
import { getRedisConnectionForWorker } from '../config/queue';
import prisma from '../config/prisma';

export const subscriptionRenewalWorker = new Worker(
  'subscription-renewal',
  async (job: Job) => {
    console.log('[SubscriptionRenewalWorker] Checking for due subscriptions');
    const now = new Date();

    const dueSubscriptions = await prisma.subscriptions.findMany({
      where: {
        status: 'active',
        current_period_end: { lte: now },
        cancel_at_period_end: false
      },
      include: {
        tier: true
      }
    });

    for (const sub of dueSubscriptions) {
      console.log(`[SubscriptionRenewalWorker] Renewing subscription for user ${sub.user_id}`);
      
      const newEnd = new Date(now);
      if (sub.billing_cycle === 'annual') {
        newEnd.setFullYear(newEnd.getFullYear() + 1);
      } else {
        newEnd.setMonth(newEnd.getMonth() + 1);
      }

      await prisma.subscriptions.update({
        where: { id: sub.id },
        data: {
          current_period_start: now,
          current_period_end: newEnd,
          updated_at: now
        }
      });
      
      // Integration with payment gateway (Stripe/Razorpay) goes here
    }

    // Handle cancellations
    const cancelledSubscriptions = await prisma.subscriptions.findMany({
      where: {
        status: 'active',
        current_period_end: { lte: now },
        cancel_at_period_end: true
      }
    });

    for (const sub of cancelledSubscriptions) {
      console.log(`[SubscriptionRenewalWorker] Cancelling subscription for user ${sub.user_id}`);
      await prisma.subscriptions.update({
        where: { id: sub.id },
        data: {
          status: 'cancelled',
          updated_at: now
        }
      });
    }

    return { renewed: dueSubscriptions.length, cancelled: cancelledSubscriptions.length };
  },
  { connection: getRedisConnectionForWorker() as any }
);

subscriptionRenewalWorker.on('completed', (job) => {
  console.log(`[SubscriptionRenewalWorker] Job ${job.id} completed. Renewed: ${job.returnvalue.renewed}, Cancelled: ${job.returnvalue.cancelled}`);
});
subscriptionRenewalWorker.on('failed', (job, err) => {
  console.error(`[SubscriptionRenewalWorker] Job ${job?.id} failed:`, err);
});
