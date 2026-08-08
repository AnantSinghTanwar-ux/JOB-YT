import { Request, Response, NextFunction } from 'express';
import { StorageService } from '../services/storage.service';
import { minioStorage } from '../services/storage/MinIOProvider';
import { sendSuccess } from '../utils/response';

export const UploadController = {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      const result = await StorageService.uploadAny(req.file);
      sendSuccess(res, { url: result.url }, 'Upload successful');
    } catch (err) {
      next(err);
    }
  },

  async generateVideoUploadSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileName, contentType } = req.body;
      if (!fileName || !contentType) {
        res.status(400).json({ success: false, message: 'fileName and contentType are required' });
        return;
      }

      const session = await minioStorage.generateUploadUrl(fileName, contentType, 'videos');
      sendSuccess(res, session, 'Upload session generated successfully');
    } catch (err) {
      next(err);
    }
  }
};
