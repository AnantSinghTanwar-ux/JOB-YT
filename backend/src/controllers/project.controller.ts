import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/appError';

export const ProjectController = {
  /**
   * Get all showcase projects for the current user or a target user.
   */
  async getProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.params.userId as string) || (req.user?.userId as string);
      if (!userId) {
        throw new AppError('User ID is required', 400);
      }
      sendSuccess(res, [], 'Projects retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Add a new project to the user's showcase.
   */
  async addProject(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, {}, 'Project added successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update an existing project in the user's showcase.
   */
  async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, {}, 'Project updated successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete a project from the user's showcase.
   */
  async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, null, 'Project deleted successfully');
    } catch (err) {
      next(err);
    }
  },
};
