import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import pool from '../config/database';
import { getBroadcastQueue } from '../config/queue';

const router = Router();

// POST /jobs/:id/broadcast
router.post('/jobs/:id/broadcast', authenticate, authorize('recruiter', 'admin'), async (req, res) => {
  try {
    const recruiterId = req.user!.userId;
    const jobId = req.params.id;
    const { messageBody, channels } = req.body;

    if (!messageBody || !channels || !Array.isArray(channels)) {
      return res.status(400).json({ success: false, message: 'Invalid payload. Requires messageBody and an array of channels.' });
    }

    const allowedChannels = ['in_app', 'email', 'push', 'whatsapp'];
    const invalidChannels = channels.filter((ch: string) => !allowedChannels.includes(ch));
    if (invalidChannels.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid channels: ${invalidChannels.join(', ')}` });
    }

    const { rows: jobRows } = await pool.query(
      'SELECT recruiter_id FROM jobs WHERE id = $1',
      [jobId]
    );
    if (jobRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (req.user!.role !== 'admin' && jobRows[0].recruiter_id !== recruiterId) {
      return res.status(403).json({ success: false, message: 'You can only broadcast to applicants on your own job listings' });
    }

    // Insert broadcast message record
    const validChannels = channels.filter((ch: string) => allowedChannels.includes(ch));
    const { rows: broadcastRows } = await pool.query(
      `INSERT INTO broadcast_messages (job_id, recruiter_id, message_body, channels)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id`,
      [jobId, recruiterId, messageBody, JSON.stringify(validChannels)]
    );

    const broadcastId = broadcastRows[0].id;

    // Enqueue job to process the broadcast
    const bQueue = getBroadcastQueue();
    if (bQueue) {
      await bQueue.add('processBroadcast', {
        jobId,
        recruiterId,
        broadcastId,
        messageBody,
        channels: validChannels
      });
    } else {
      return res.status(503).json({ success: false, message: 'Broadcast service unavailable (Redis disconnected)' });
    }

    res.status(201).json({ success: true, broadcastId, message: 'Broadcast queued successfully' });
  } catch (error: any) {
    console.error('Error queuing broadcast:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
