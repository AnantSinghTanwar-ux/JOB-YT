import { Worker, Job } from 'bullmq';
import { getRedisConnectionForWorker } from '../config/queue';
import prisma from '../config/prisma';
import { CreditService } from '../services/credit.service';

export const creditExpiryWorker = new Worker(
  'credit-expiry-sweep',
  async (job: Job) => {
    console.log('[CreditExpiryWorker] Starting 90-day credit expiry sweep');
    const now = new Date();

    // Find all users who have EARNED credits that have passed their expiry_date and have not been spent.
    // In our simplified MVP, we will deduct the unspent amount.
    // The exact algorithm for matching spent to earned credits would be complex, 
    // so we approximate by expiring any EARNED credits older than 90 days that haven't been deducted.
    
    // Example: query the sum of EARNED vs spent. For MVP, we will just find transactions
    // that have explicitly expired.
    
    const expiredTransactions = await prisma.$queryRaw<any[]>`
      SELECT user_id, SUM(amount) as total_expired
      FROM credit_transactions
      WHERE credit_category = 'EARNED' 
      AND expiry_date < ${now}
      AND status = 'success'
      AND type = 'credit'
      GROUP BY user_id
    `;

    for (const tx of expiredTransactions) {
      const expiredAmount = Number(tx.total_expired);
      const balance = await CreditService.getBalance(tx.user_id);
      
      // Can only expire what they still have
      const amountToExpire = Math.min(expiredAmount, balance);
      
      if (amountToExpire > 0) {
        console.log(`[CreditExpiryWorker] Expiring ${amountToExpire} credits for user ${tx.user_id}`);
        await CreditService.deductCredits(tx.user_id, amountToExpire, '90-day credit inactivity expiry');
      }
      
      // Update those transactions to prevent re-evaluating
      await prisma.$executeRaw`
        UPDATE credit_transactions 
        SET status = 'expired'
        WHERE user_id = ${tx.user_id} AND credit_category = 'EARNED' AND expiry_date < ${now} AND type = 'credit'
      `;
    }

    return { processed: expiredTransactions.length };
  },
  { connection: getRedisConnectionForWorker() as any }
);

creditExpiryWorker.on('completed', (job) => {
  console.log(`[CreditExpiryWorker] Job ${job.id} completed. Processed ${job.returnvalue.processed} users.`);
});
creditExpiryWorker.on('failed', (job, err) => {
  console.error(`[CreditExpiryWorker] Job ${job?.id} failed:`, err);
});
