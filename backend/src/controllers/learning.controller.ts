import { Request, Response } from 'express';
import { getLearningRoadmapQueue } from '../config/queue';
import { LearningProgressService } from '../services/learning/LearningProgressService';
import { SkillProfileService } from '../services/learning/SkillProfileService';
import { EmployerSkillFilterService } from '../services/learning/EmployerSkillFilterService';

const learningQueue = getLearningRoadmapQueue();

export class LearningController {
  
  /**
   * Triggers the generation of a learning roadmap (Async via BullMQ)
   */
  public static async generateRoadmap(req: Request, res: Response) {
    try {
      const { targetRole, experienceLevel } = req.body;
      const candidateId = (req.user as any)?.userId; // Assuming auth middleware sets req.user

      if (!candidateId || !targetRole) {
        return res.status(400).json({ error: 'Missing candidateId or targetRole' });
      }

      if (!learningQueue) {
        throw new Error('Learning queue unavailable');
      }

      await learningQueue.add('generate-roadmap', {
        candidateId,
        targetRole,
        experienceLevel
      });

      return res.status(202).json({ message: 'Roadmap generation started asynchronously.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Starts a course and records progress
   */
  public static async startCourse(req: Request, res: Response) {
    try {
      const { courseId } = req.body;
      const candidateId = (req.user as any)?.userId;

      if (!candidateId || !courseId) return res.status(400).json({ error: 'Missing data' });

      const progress = await LearningProgressService.startCourse(candidateId, courseId);
      return res.status(200).json(progress);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Marks a course as completed and awards credits
   */
  public static async completeCourse(req: Request, res: Response) {
    try {
      const { courseId, certificateUrl } = req.body;
      const candidateId = (req.user as any)?.userId;

      if (!candidateId || !courseId) return res.status(400).json({ error: 'Missing data' });

      const progress = await LearningProgressService.completeCourse(candidateId, courseId, certificateUrl);
      return res.status(200).json(progress);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Gets the public skill profile
   */
  public static async getSkillProfile(req: Request, res: Response) {
    try {
      const candidateId = req.params.candidateId || (req.user as any)?.userId;
      if (!candidateId) return res.status(400).json({ error: 'Missing candidateId' });

      const profile = await SkillProfileService.getPublicSkillProfile(candidateId);
      return res.status(200).json(profile);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Employer search for candidates with verified skills
   */
  public static async searchCandidatesBySkills(req: Request, res: Response) {
    try {
      const employerId = (req.user as any)?.userId;
      const { requiredSkills } = req.body; // Array of { skillName, minProficiency, requireVerified }

      if (!employerId || !requiredSkills) return res.status(400).json({ error: 'Missing data' });

      const candidates = await EmployerSkillFilterService.searchCandidatesByVerifiedSkills(employerId, requiredSkills);
      return res.status(200).json(candidates);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
