import { Router } from 'express';
import { CalendarController } from '../controllers/calendar.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/auth-url', CalendarController.getAuthUrl);
router.post('/callback', CalendarController.handleCallback);
router.get('/status', CalendarController.getStatus);
router.delete('/disconnect', CalendarController.disconnect);
router.post('/schedule-interview', CalendarController.scheduleInterview);

export default router;
