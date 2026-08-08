import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response';
import prisma from '../config/prisma';

export const CertificationController = {
  async getCertifications(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, [], 'Certifications retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async addCertification(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, {}, 'Certification added successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async updateCertification(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, {}, 'Certification updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async deleteCertification(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, null, 'Certification deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  async getPublicCertifications(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, [], 'Certifications retrieved successfully');
    } catch (err) {
      next(err);
    }
  },
};
