import { Router } from 'express';
import { body } from 'express-validator';
import { AutoApplyController } from '../controllers/autoApply.controller';
import { authenticate, authorize } from '../middleware/auth';
import { requireEmail } from '../middleware/requireEmail';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate, requireEmail, authorize('applicant'));

router.get('/preferences', AutoApplyController.getPreferences);
router.put(
  '/preferences',
  [
    body('match_threshold').optional().isInt({ min: 0, max: 100 }),
    body('approval_mode').optional().isIn(['auto', 'manual']),
  ],
  validate,
  AutoApplyController.updatePreferences,
);
router.patch(
  '/preferences/status',
  [body('status').isIn(['disabled', 'enabled', 'paused'])],
  validate,
  AutoApplyController.updateStatus,
);

router.post('/preview', AutoApplyController.preview);
router.post('/preview/acknowledge', AutoApplyController.acknowledgePreview);

router.get('/limits', AutoApplyController.getLimits);

router.get('/queue', AutoApplyController.listQueue);
router.get('/queue/stats', AutoApplyController.getQueueStats);
router.get('/queue/:id', AutoApplyController.getQueueItem);
router.post('/queue/:id/approve', AutoApplyController.approveQueueItem);
router.post('/queue/:id/reject', AutoApplyController.rejectQueueItem);
router.post('/queue/:id/retry', AutoApplyController.retryQueueItem);
router.delete('/queue/:id', AutoApplyController.cancelQueueItem);

router.get('/events', AutoApplyController.listEvents);
router.get('/events/job/:jobId', AutoApplyController.listEventsForJob);

export default router;
