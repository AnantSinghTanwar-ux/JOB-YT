import { Request, Response, NextFunction } from 'express';
import { AIOrchestratorService, AIOrchestratorRequest } from '../services/aiOrchestrator.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/appError';

export const AIController = {
  /**
   * Main AI orchestration endpoint
   * Routes AI requests to appropriate handlers
   */
  async orchestrate(req: Request, res: Response, next: NextFunction) {
    try {
      const request: AIOrchestratorRequest = req.body;

      // Validate request structure
      if (!AIOrchestratorService.validateRequest(request)) {
        throw new AppError('Invalid AI request structure', 400);
      }

      // Process the AI request
      const response = await AIOrchestratorService.processRequest(request);

      sendSuccess(res, response, 'AI request processed successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get available AI task types
   */
  async getTaskTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const taskTypes = AIOrchestratorService.getAvailableTaskTypes();

      sendSuccess(res, { taskTypes }, 'Available AI task types retrieved');
    } catch (error) {
      next(error);
    }
  },

  /**
   * ATS Analysis endpoint (convenience wrapper)
   */
  async analyzeATS(req: Request, res: Response, next: NextFunction) {
    try {
      const { resumeData, jobData } = req.body;

      if (!resumeData || !jobData) {
        throw new AppError('resumeData and jobData are required', 400);
      }

      const request: AIOrchestratorRequest = {
        type: 'ats_analysis',
        data: { resumeData, jobData },
      };

      const response = await AIOrchestratorService.processRequest(request);

      sendSuccess(res, response.result, 'ATS analysis completed');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Resume Processing endpoint (convenience wrapper)
   */
  async processResume(req: Request, res: Response, next: NextFunction) {
    try {
      const { rawText } = req.body;

      if (!rawText) {
        throw new AppError('rawText is required', 400);
      }

      const request: AIOrchestratorRequest = {
        type: 'resume_processing',
        data: { rawText },
      };

      const response = await AIOrchestratorService.processRequest(request);

      sendSuccess(res, response.result, 'Resume processing completed');
    } catch (error) {
      next(error);
    }
  },

  async ingestJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { rawText } = req.body;

      if (!rawText) {
        throw new AppError('rawText is required', 400);
      }

      const request: AIOrchestratorRequest = {
        type: 'job_ingestion',
        data: { rawText },
      };

      const response = await AIOrchestratorService.processRequest(request);

      sendSuccess(res, response.result, 'Job parsing completed');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Matching Workflow endpoint (convenience wrapper)
   */
  async matchWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const { userSkills, jobSkills, resumeText, jobDescription } = req.body;

      if (!userSkills || !jobSkills) {
        throw new AppError('userSkills and jobSkills are required', 400);
      }

      const request: AIOrchestratorRequest = {
        type: 'matching_workflow',
        data: { userSkills, jobSkills, resumeText, jobDescription },
      };

      const response = await AIOrchestratorService.processRequest(request);

      sendSuccess(res, response.result, 'Matching workflow completed');
    } catch (error) {
      next(error);
    }
  },
};
