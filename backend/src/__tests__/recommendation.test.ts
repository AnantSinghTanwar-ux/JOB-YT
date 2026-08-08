import { RecommendationService } from '../services/recommendation.service';
import { ATSService } from '../services/ats.service';
import { notificationQueue } from '../config/queue';
import { ApplicantProfileModel } from '../models/applicantProfile.model';
import pool from '../config/database';

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../config/queue', () => ({
  notificationQueue: {
    add: jest.fn(),
  },
}));

jest.mock('../models/applicantProfile.model', () => ({
  ApplicantProfileModel: {
    findByUserId: jest.fn(),
  },
}));

jest.mock('../services/ats.service', () => ({
  ATSService: {
    calculateATSScoreWithEmbedding: jest.fn(),
  },
}));

describe('RecommendationService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should skip if user profile has no skills or experience', async () => {
    (ApplicantProfileModel.findByUserId as jest.Mock).mockResolvedValue({
      skills: [],
      experience: [],
      name: 'Test',
    });
    
    (pool.query as jest.Mock).mockResolvedValue({ rows: [] }); // No resume

    await RecommendationService.generateDailyRecommendationsForUser('user-1');

    expect(pool.query).toHaveBeenCalledTimes(1); // Only resume query
    expect(notificationQueue.add).not.toHaveBeenCalled();
  });

  it('should generate recommendations and queue notification', async () => {
    (ApplicantProfileModel.findByUserId as jest.Mock).mockResolvedValue({
      skills: ['React', 'Node.js'],
      experience: [],
      name: 'Test User',
    });
    
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] }) // Resumes query
      .mockResolvedValueOnce({
        // Active jobs query
        rows: [
          { id: 'job-1', title: 'Frontend Developer', skills: ['React'], companyName: 'Corp', location: 'Remote' }
        ]
      })
      .mockResolvedValueOnce({ rows: [] }); // Insert recommendations query

    (ATSService.calculateATSScoreWithEmbedding as jest.Mock).mockResolvedValue({
      totalScore: 85,
    });

    await RecommendationService.generateDailyRecommendationsForUser('user-1');

    expect(ATSService.calculateATSScoreWithEmbedding).toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO job_recommendations'), expect.any(Array));
    expect(notificationQueue.add).toHaveBeenCalledWith('sendDailyNotification', {
      userId: 'user-1',
      jobs: [
        expect.objectContaining({ id: 'job-1', score: 85 })
      ]
    }, expect.any(Object));
  });
});
