import { Router } from 'express';
import { ApiKeyController } from '../controllers/apiKey.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', ApiKeyController.listKeys);
router.post('/', ApiKeyController.createKey);
router.patch('/:id', ApiKeyController.updateKey);
router.delete('/:id', ApiKeyController.revokeKey);

export default router;
