import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', WebhookController.list);
router.post('/', WebhookController.create);
router.patch('/:id', WebhookController.update);
router.delete('/:id', WebhookController.delete);
router.get('/:id/deliveries', WebhookController.getDeliveries);

export default router;
