import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { PreferenceService } from '../services/notification/preference.service';

const router = Router();

// Get all preferences for user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const prefs = await PreferenceService.getUserPreferences(userId);
    res.json({ success: true, preferences: prefs });
  } catch (error: any) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get DND settings
router.get('/dnd', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const dnd = await PreferenceService.getDNDSettings(userId);
    res.json({ success: true, dnd });
  } catch (error: any) {
    console.error('Error fetching DND settings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update DND settings
router.put('/dnd', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { dnd_enabled, dnd_start_time, dnd_end_time, dnd_timezone } = req.body;
    const dnd = await PreferenceService.updateDNDSettings(userId, {
      dnd_enabled,
      dnd_start_time,
      dnd_end_time,
      dnd_timezone
    });
    res.json({ success: true, dnd });
  } catch (error: any) {
    console.error('Error updating DND settings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update a specific event preference
router.put('/:eventType', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const eventType = req.params.eventType as string;
    const { in_app_enabled, email_enabled, push_enabled, whatsapp_enabled } = req.body;

    const updated = await PreferenceService.updatePreference(userId, eventType, {
      in_app_enabled,
      email_enabled,
      push_enabled,
      whatsapp_enabled
    });

    res.json({ success: true, preference: updated });
  } catch (error: any) {
    console.error('Error updating preference:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
