import pool from '../config/database';
import { ATSService } from './ats.service';
import { getNotificationQueue } from '../config/queue';
import { ApplicantProfileModel } from '../models/applicantProfile.model';
import { ResumeService } from './resume.service';
import { parseResume } from '../utils/resumeParser';

const LOG_PREFIX = '[RecommendationService]';

export const RecommendationService = {
  /**
   * Generates daily personalized job recommendations for a given user.
   * Runs the engine and queues notifications.
   */
  async generateDailyRecommendationsForUser(userId: string) {
    try {
      // 1. Fetch user profile
      const profile = await ApplicantProfileModel.findByUserId(userId);
      if (!profile) {
        return; // Only process users with applicant profiles
      }

      // 2. Fetch user's default resume
      let candidateSkills = profile.skills || [];
      let candidateExperienceText = JSON.stringify(profile.experience || []);
      let candidateFullText = [
        profile.name || '',
        profile.bio || '',
        candidateSkills.join(', '),
        candidateExperienceText,
        JSON.stringify(profile.education || [])
      ].join('\n');
      
      const { rows: resumeRows } = await pool.query(
        'SELECT id, file_url, file_name, mime_type FROM resumes WHERE user_id = $1 AND is_default = true LIMIT 1',
        [userId]
      );
      
      let resumeId: string | undefined;

      if (resumeRows.length > 0) {
        const resume = resumeRows[0];
        resumeId = resume.id;
        try {
          const buffer = await ResumeService.loadResumeFileBuffer(resume.file_url);
          const parsed = await parseResume(buffer, {
            filename: resume.file_name,
            mimeType: resume.mime_type || undefined,
          });
          candidateSkills = parsed.skills || [];
          candidateExperienceText = (parsed.experience || [])
            .map(exp => `${exp.role || ''} at ${exp.company || ''}`)
            .join(', ');
          candidateFullText = parsed.rawText || candidateFullText;
        } catch {
          console.warn(`${LOG_PREFIX} Failed to parse resume for user ${userId}, falling back to profile.`);
        }
      }

      const hasSkills = candidateSkills.length > 0;
      const hasExperience = candidateExperienceText.trim() !== '' && candidateExperienceText.trim() !== '[]';

      if (!hasSkills && !hasExperience) {
        console.warn(`${LOG_PREFIX} Skipping ${userId}: No skills or experience to match against.`);
        return;
      }

      const resumeData = {
        skills: candidateSkills,
        experienceText: candidateExperienceText,
        fullText: candidateFullText,
      };

      // 3. Fetch active jobs the user hasn't applied to yet, and haven't been recommended recently
      // We will fetch up to 100 recent active jobs for performance
      const { rows: jobRows } = await pool.query(`
        SELECT j.id, j.title, j.description, j.skills, j.company_name as "companyName", j.location
        FROM jobs j
        WHERE j.status = 'active'
          AND j.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM applications a WHERE a.job_id = j.id AND a.applicant_id = $1
          )
          AND NOT EXISTS (
            SELECT 1 FROM job_recommendations jr WHERE jr.job_id = j.id AND jr.user_id = $1 AND jr.created_at > NOW() - INTERVAL '7 days'
          )
        ORDER BY j.created_at DESC
        LIMIT 100
      `, [userId]);

      if (jobRows.length === 0) return;

      // 4. Score jobs
      const scoredJobs = [];
      for (const job of jobRows) {
        const jobData = {
          skills: Array.isArray(job.skills) ? job.skills : [],
          description: job.description || '',
        };

        const result = await ATSService.calculateATSScoreWithEmbedding(
          resumeData,
          jobData,
          { jobId: job.id, resumeId, applicantId: userId }
        );

        scoredJobs.push({
          ...job,
          score: result.totalScore,
        });
      }

      // 5. Sort by score descending and take top 5
      scoredJobs.sort((a, b) => b.score - a.score);
      const topJobs = scoredJobs.filter(j => j.score >= 40).slice(0, 5); // Minimum threshold

      if (topJobs.length === 0) {
        console.log(`${LOG_PREFIX} No good matches found for user ${userId}.`);
        return;
      }

      // 6. Save recommendations to DB
      for (const job of topJobs) {
        await pool.query(`
          INSERT INTO job_recommendations (user_id, job_id, score, status)
          VALUES ($1, $2, $3, 'pending')
          ON CONFLICT (user_id, job_id) DO NOTHING
        `, [userId, job.id, job.score]);
      }

      // 7. Enqueue notification
      const nQueue = getNotificationQueue();
      if (nQueue) {
        await nQueue.add('sendDailyNotification', {
          userId,
          jobs: topJobs,
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        });
      }

      console.log(`${LOG_PREFIX} Generated ${topJobs.length} recommendations for user ${userId}`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error generating recommendations for user ${userId}:`, error);
      throw error;
    }
  }
};
