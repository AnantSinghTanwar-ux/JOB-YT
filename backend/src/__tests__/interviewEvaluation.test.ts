import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InterviewService } from '../services/interview.service';
import { InterviewModel } from '../models/interview.model';
import { UserModel } from '../models/user.model';
import { AIService } from '../services/ai.service';
import { AppError } from '../utils/appError';

describe('Response Evaluation Engine (Task 5)', () => {
  const mockStudentId = 'student-123';
  const mockSessionId = 'session-456';
  const mockQuestionId = 'question-789';

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('evaluateResponse', () => {
    it('should successfully evaluate and return scores on valid Claude response', async () => {
      const mockEvaluationResponse = {
        scores: {
          communicationClarity: 85,
          contentRelevance: 90,
          responseStructure: 80,
          depthOfKnowledge: 75,
          confidenceIndicators: 95,
        },
        feedbackText: 'Great answer showing solid depth.',
        suggestedImprovements: 'Try naming actual design patterns next time.',
      };

      const aiSpy = jest.spyOn(AIService, 'generateJSON').mockResolvedValueOnce(mockEvaluationResponse);

      const result = await InterviewService.evaluateResponse('What is hooks?', 'Hooks are react functions...');
      expect(result.scores.communicationClarity).toBe(85);
      expect(result.scores.contentRelevance).toBe(90);
      expect(result.feedbackText).toBe('Great answer showing solid depth.');
      expect(result.suggestedImprovements).toBe('Try naming actual design patterns next time.');
      expect(aiSpy).toHaveBeenCalledTimes(1);
      expect(aiSpy).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ provider: 'claude' }));
    });

    it('should retry once and succeed if the first response is invalid', async () => {
      const invalidResponse = {
        scores: {
          communicationClarity: 120, // Invalid score
          contentRelevance: 80,
        },
        feedbackText: '',
      };

      const validResponse = {
        scores: {
          communicationClarity: 80,
          contentRelevance: 85,
          responseStructure: 90,
          depthOfKnowledge: 85,
          confidenceIndicators: 80,
        },
        feedbackText: 'Good.',
        suggestedImprovements: 'None.',
      };

      const aiSpy = jest.spyOn(AIService, 'generateJSON')
        .mockResolvedValueOnce(invalidResponse)
        .mockResolvedValueOnce(validResponse);

      const result = await InterviewService.evaluateResponse('What is hooks?', 'Hooks...');
      expect(result.scores.communicationClarity).toBe(80);
      expect(aiSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw an AI_EVALUATION_FAILED error if both attempts fail validation', async () => {
      const invalidResponse = {
        scores: {
          communicationClarity: -10, // Invalid score
          contentRelevance: 80,
        },
      };

      jest.spyOn(AIService, 'generateJSON').mockResolvedValue(invalidResponse);

      await expect(
        InterviewService.evaluateResponse('What is hooks?', 'Hooks...'),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 500,
          code: 'AI_EVALUATION_FAILED',
        }),
      );
    });
  });

  describe('submitResponse integration', () => {
    it('should evaluate the response, calculate average score, and store everything in DB', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce({ id: mockStudentId, banned_at: null } as any);
      jest.spyOn(InterviewModel, 'findSessionById').mockResolvedValueOnce({
        id: mockSessionId,
        student_id: mockStudentId,
        status: 'in_progress',
      } as any);

      jest.spyOn(InterviewModel, 'findQuestionsBySessionId').mockResolvedValueOnce([
        { id: mockQuestionId, question_text: 'What is hydration?', order_index: 1 },
      ] as any);

      const mockEvalResult = {
        scores: {
          communicationClarity: 80,
          contentRelevance: 90,
          responseStructure: 70,
          depthOfKnowledge: 85,
          confidenceIndicators: 75,
        },
        feedbackText: 'Good hydration description.',
        suggestedImprovements: 'Mention styled component issues.',
      };
      jest.spyOn(InterviewService, 'evaluateResponse').mockResolvedValueOnce(mockEvalResult);

      const createResponseSpy = jest.spyOn(InterviewModel, 'createOrUpdateResponse').mockResolvedValueOnce({} as any);

      await InterviewService.submitResponse(mockStudentId, mockSessionId, mockQuestionId, 'Hydration is when client js binds to markup');

      expect(InterviewService.evaluateResponse).toHaveBeenCalledWith('What is hydration?', 'Hydration is when client js binds to markup');
      
      // Average score math: (80 + 90 + 70 + 85 + 75) / 5 = 400 / 5 = 80
      expect(createResponseSpy).toHaveBeenCalledWith(expect.objectContaining({
        question_id: mockQuestionId,
        session_id: mockSessionId,
        student_id: mockStudentId,
        response_text: 'Hydration is when client js binds to markup',
        ai_score: 80,
        rubric_scores: mockEvalResult.scores,
        ai_feedback: {
          feedbackText: 'Good hydration description.',
          suggestedImprovements: 'Mention styled component issues.',
        },
        evaluated_at: expect.any(Date),
      }));
    });
  });
});
