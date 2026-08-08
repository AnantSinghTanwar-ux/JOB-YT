import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';
import { uploadFile } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.post('/', uploadFile.single('file'), UploadController.upload);
router.post('/video-session', UploadController.generateVideoUploadSession);

export default router;
