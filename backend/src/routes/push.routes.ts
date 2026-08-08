import express from 'express';
import { authenticate } from '../middleware/auth';
import pool from '../config/database';

const router = express.Router();

/**
 * @route   POST /api/push/subscribe
 * @desc    Save a Web Push subscription
 * @access  Private
 */
router.post('/subscribe', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    if (!p256dh || !auth) {
      return res.status(400).json({ error: 'Missing p256dh or auth keys' });
    }

    // Insert or update subscription
    // We use endpoint as a unique identifier for a browser/device, though it's not strictly unique in the DB schema,
    // we can delete old ones for the same user if they match the endpoint, but let's just insert it.
    // To prevent duplicates, let's delete existing with the same endpoint first.
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);

    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) 
       VALUES ($1, $2, $3, $4)`,
      [userId, endpoint, p256dh, auth]
    );

    res.status(201).json({ message: 'Subscription saved successfully' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

export default router;
