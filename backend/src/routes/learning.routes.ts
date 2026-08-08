import { Router } from 'express';
import { LearningController } from '../controllers/learning.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Candidate Routes
router.post('/roadmap/generate', authenticate, authorize('applicant'), LearningController.generateRoadmap);
router.post('/course/start', authenticate, authorize('applicant'), LearningController.startCourse);
router.post('/course/complete', authenticate, authorize('applicant'), LearningController.completeCourse);
router.get('/profile', authenticate, LearningController.getSkillProfile);
router.get('/profile/:candidateId', authenticate, LearningController.getSkillProfile);

// Employer Routes
router.post('/search', authenticate, authorize('recruiter'), LearningController.searchCandidatesBySkills);

export default router;
