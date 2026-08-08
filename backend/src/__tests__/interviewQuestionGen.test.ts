import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InterviewService } from '../services/interview.service';
import { InterviewModel } from '../models/interview.model';
import { UserModel } from '../models/user.model';
import { AIService } from '../services/ai.service';
import { AppError } from '../utils/appError';

describe('Interview Question Generation (Task 4)', () => {
  const mockStudentId = 'student-123';
  const mockSessionId = 'session-456';

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateQuestions', () => {
    it('should successfully return questions when Claude responds with a valid format', async () => {
      const mockQuestionsResponse = {
        questions: [
          {
            questionText: 'Explain hooks.',
            category: 'technical',
            expectedTopics: ['React', 'useState'],
          },
          {
            questionText: 'Describe a time you failed.',
            category: 'behavioral',
            expectedTopics: ['growth', 'reflection'],
          },
        ],
      };

      const aiSpy = jest.spyOn(AIService, 'generateJSON').mockResolvedValueOnce(mockQuestionsResponse);

      const result = await InterviewService.generateQuestions('Frontend Developer', 'React knowledge', 2);
      expect(result).toHaveLength(2);
      expect(result[0].questionText).toBe('Explain hooks.');
      expect(result[0].category).toBe('technical');
      expect(result[0].expectedTopics).toEqual(['React', 'useState']);
      expect(aiSpy).toHaveBeenCalledTimes(1);
      expect(aiSpy).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ provider: 'claude' }));
    });

    it('should retry once and succeed if the first attempt returns an invalid schema', async () => {
      const invalidResponse = {
        questions: [
          {
            questionText: 'Invalid category.',
            category: 'invalid-category', // Invalid category
            expectedTopics: [],
          },
          {
            questionText: 'Valid.',
            category: 'technical',
            expectedTopics: [],
          },
        ],
      };

      const validResponse = {
        questions: [
          {
            questionText: 'Explain closures.',
            category: 'technical',
            expectedTopics: ['JavaScript'],
          },
          {
            questionText: 'Explain events.',
            category: 'technical',
            expectedTopics: ['DOM'],
          },
        ],
      };

      const aiSpy = jest.spyOn(AIService, 'generateJSON')
        .mockResolvedValueOnce(invalidResponse)
        .mockResolvedValueOnce(validResponse);

      const result = await InterviewService.generateQuestions('Frontend Developer', 'JS knowledge', 2);
      expect(result).toHaveLength(2);
      expect(result[0].questionText).toBe('Explain closures.');
      expect(aiSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw an AI_GENERATION_FAILED error if both attempts fail schema validation', async () => {
      const invalidResponse = {
        questions: [
          {
            questionText: 'Only 1 question',
            category: 'technical',
            expectedTopics: [],
          },
        ], // Expected count is 2, got 1
      };

      jest.spyOn(AIService, 'generateJSON').mockResolvedValue(invalidResponse);

      await expect(
        InterviewService.generateQuestions('Frontend Developer', 'JS knowledge', 2),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 500,
          code: 'AI_GENERATION_FAILED',
        }),
      );
    });
  });

  describe('createSession integration', () => {
    it('should generate configurable number of questions and save them to DB', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce({ id: mockStudentId, banned_at: null } as any);
      jest.spyOn(InterviewModel, 'createSession').mockResolvedValueOnce({
        id: mockSessionId,
        student_id: mockStudentId,
        role_title: 'Backend Developer',
        status: 'created',
      } as any);

      const mockQuestions = [
        { questionText: 'Q1', category: 'technical', expectedTopics: ['Node'] },
        { questionText: 'Q2', category: 'situational', expectedTopics: ['SQL'] },
        { questionText: 'Q3', category: 'behavioral', expectedTopics: ['Team'] },
      ];
      jest.spyOn(InterviewService, 'generateQuestions').mockResolvedValueOnce(mockQuestions as any);

      const createQuestionSpy = jest.spyOn(InterviewModel, 'createQuestion').mockResolvedValue({} as any);
      jest.spyOn(InterviewModel, 'findQuestionsBySessionId').mockResolvedValue([
        { id: 'q-1', order_index: 1 },
      ] as any);

      const updateSessionSpy = jest.spyOn(InterviewModel, 'updateSession').mockResolvedValueOnce({
        id: mockSessionId,
        status: 'questions_generated',
      } as any);

      const result = await InterviewService.createSession(mockStudentId, 'Backend Developer', 'Node and SQL description', undefined, 3);
      expect(result).toBeDefined();
      expect(result.status).toBe('questions_generated');

      expect(InterviewService.generateQuestions).toHaveBeenCalledWith('Backend Developer', 'Node and SQL description', 3);
      expect(createQuestionSpy).toHaveBeenCalledTimes(3);
      expect(createQuestionSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
        session_id: mockSessionId,
        question_text: 'Q1',
        category: 'technical',
        order_index: 1,
      }));
      expect(createQuestionSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
        session_id: mockSessionId,
        question_text: 'Q2',
        category: 'situational',
        order_index: 2,
      }));
      expect(createQuestionSpy).toHaveBeenNthCalledWith(3, expect.objectContaining({
        session_id: mockSessionId,
        question_text: 'Q3',
        category: 'behavioral',
        order_index: 3,
      }));

      expect(updateSessionSpy).toHaveBeenCalledWith(mockSessionId, expect.objectContaining({
        status: 'questions_generated',
      }));
    });
  });
});
