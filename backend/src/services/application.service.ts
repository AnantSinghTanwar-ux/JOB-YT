import { ApplicationModel, ApplicationStatus } from '../models/application.model';
import { JobModel } from '../models/job.model';
import { NotificationModel } from '../models/notification.model';
import { NotificationOrchestrator } from './notification/orchestrator';
import { PipelineEventModel } from '../models/pipeline_event.model';
import { InterviewModel } from '../models/interview.model';
import { withTransaction } from '../utils/transaction';
import { CreditService } from './credit.service';
import { CREDIT_COSTS } from '../config/creditCosts';
import { ResumeModel } from '../models/resume.model';
import { ProfileRequirementsService } from './profileRequirements.service';
import { StorageService } from './storage.service';
import { ATSService } from './ats.service';
import { AIInsightsService } from './aiInsights.service';
import { ApplicantProfileModel } from '../models/applicantProfile.model';
import { EmbeddingCacheService } from './embeddingCache.service';
import { cosineSimilarity, similarityToScore } from '../utils/embedding';
import { SkillMatchingService } from './matching/skillMatching.service';
import { WebhookService } from './webhook.service';
import { WEBHOOK_EVENTS } from './webhook/eventCatalog';
import redis from '../config/redis';
import prisma from '../config/prisma';

const LOG_PREFIX = '[ApplicationService]';

export const ApplicationService = {
  async apply(
    applicantId: string,
    jobId: string,
    data: {
      cover_letter?: string;
      resume_snapshot_url?: string;
      resume_id: string;
      answers?: Array<{ question_id: string; answer: string }>;
    },
    options?: { submissionSource?: 'manual' | 'auto_apply' },
  ) {
    await ProfileRequirementsService.assertApplicantCanApply(applicantId);

    return withTransaction(async (client) => {
      // 1) Job validation (transaction-scoped)
      const job = await JobModel.findById(jobId, client);
      if (!job || job.status !== 'active')
        throw Object.assign(new Error('Job not found or no longer active'), { statusCode: 404 });

      // 2) Duplicate check (transaction-scoped)
      const existing = await ApplicationModel.findByJobAndApplicant(jobId, applicantId, client);
      if (existing)
        throw Object.assign(new Error('You have already applied to this job'), { statusCode: 409 });

      const selectedResumeId = String(data.resume_id || '').trim();
      if (!selectedResumeId) {
        throw Object.assign(new Error('Please select a resume before applying'), {
          statusCode: 422,
          code: 'RESUME_REQUIRED',
        });
      }

      const resume = await ResumeModel.findByUserAndId(applicantId, selectedResumeId);
      if (!resume) {
        throw Object.assign(new Error('Selected resume not found'), {
          statusCode: 404,
          code: 'RESUME_NOT_FOUND',
        });
      }

      const jobQuestions = Array.isArray(job.application_questions) ? job.application_questions : [];
      const submittedAnswers = Array.isArray(data.answers)
        ? data.answers
          .map((item) => ({
            question_id: String(item?.question_id || '').trim(),
            answer: String(item?.answer || '').trim(),
          }))
          .filter((item) => item.question_id.length > 0)
        : [];

      const answerMap = new Map(submittedAnswers.map((item) => [item.question_id, item.answer]));
      for (const question of jobQuestions) {
        if (!question.required) continue;
        const answer = answerMap.get(question.id) || '';
        if (!answer.trim()) {
          throw Object.assign(
            new Error(`Answer required for question: ${question.label}`),
            { statusCode: 422, code: 'MISSING_APPLICATION_ANSWER' },
          );
        }
      }
      const filteredAnswers = jobQuestions
        .map((question) => {
          const answer = answerMap.get(question.id);
          if (!answer || !answer.trim()) return null;
          return { question_id: question.id, answer: answer.trim() };
        })
        .filter((answer): answer is { question_id: string; answer: string } => Boolean(answer));

      // 3) Credit deduction (atomic under the same DB transaction)
      const creditDescription =
        options?.submissionSource === 'auto_apply' ? 'Auto-Apply job application' : 'Job application';
      const { transactionId, balanceAfter } = await CreditService.deductCredits(
        applicantId,
        CREDIT_COSTS.APPLY_JOB,
        creditDescription,
        jobId,
        client,
      );

      // Compute ATS score before creating application
      let atsScore = null;
      let atsBreakdown = null;
      try {
        const profile = await ApplicantProfileModel.findByUserId(applicantId);
        const resumeSkills: string[] = Array.isArray(profile?.skills) ? profile.skills : [];
        const experienceText = (profile?.experience ?? [])
          .map((e: any) => `${e.title || ''} ${e.description || ''}`).join(' ');
        const fullText = [
          profile?.bio ?? '',
          resumeSkills.join(' '),
          experienceText,
        ].join(' ');

        const atsResult = ATSService.calculateATSScore(
          { skills: resumeSkills, experienceText, fullText },
          { skills: job.skills ?? [], description: job.description ?? '' }
        );

        atsScore = atsResult.totalScore;
        atsBreakdown = atsResult;
      } catch (err) {
        console.error('[ApplicationService] Error calculating ATS score during apply:', err);
        // Continue without failing the application
      }

      // 4) Create application (transaction-scoped)
      let application;
      try {
        application = await ApplicationModel.create(
          {
            job_id: jobId,
            applicant_id: applicantId,
            cover_letter: data.cover_letter,
            resume_snapshot_url: data.resume_snapshot_url,
            resume_id: selectedResumeId,
            application_answers: filteredAnswers,
            ats_score: atsScore,
            ats_breakdown: atsBreakdown,
            submission_source: options?.submissionSource || 'manual',
          },
          client,
        );
      } catch (err: unknown) {
        const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
        if (code === '23505') {
          throw Object.assign(new Error('You have already applied to this job'), { statusCode: 409 });
        }
        throw err;
      }

      let isAutoShortlisted = false;
      if (atsScore !== null && job.ai_interview_threshold !== null && atsScore >= job.ai_interview_threshold) {
        isAutoShortlisted = true;
      }

      // 5) Initial pipeline event
      await PipelineEventModel.create(
        {
          application_id: application.id,
          new_status: 'applied',
          changed_by_id: applicantId,
        },
        client,
      );

      if (isAutoShortlisted) {
        // Update status to shortlisted transactionally
        application = await ApplicationModel.updateStatus(application.id, 'shortlisted', client);

        // Shortlisted pipeline event
        await PipelineEventModel.create(
          {
            application_id: application.id,
            previous_status: 'applied',
            new_status: 'shortlisted',
            changed_by_id: applicantId,
            notes: `Auto-shortlisted by Match Engine (Score ${atsScore}% ≥ Passing Threshold ${job.ai_interview_threshold}%)`,
          },
          client,
        );

        setImmediate(() => {
          NotificationOrchestrator.dispatch(
            applicantId,
            'application_status',
            {
              title: 'Application Shortlisted!',
              body: `Congratulations! Your application for "${job.title}" has been automatically shortlisted.`,
              action_url: `/candidate/applications`,
              job_title: job.title,
              new_status: 'shortlisted',
              is_recruiter: false
            }
          ).catch(err => console.error('[Notification Error]', err));

          NotificationOrchestrator.dispatch(
            job.recruiter_id,
            'application_submitted',
            {
              title: 'Candidate Auto-Shortlisted',
              body: `A candidate met the match threshold (${atsScore}% ≥ ${job.ai_interview_threshold}%) and was auto-shortlisted for "${job.title}".`,
              action_url: `/recruiter/jobs/${jobId}/applications`,
              job_title: job.title,
              applicant_name: 'A candidate',
              is_recruiter: true
            }
          ).catch(err => console.error('[Notification Error]', err));
        });

      } else {
        setImmediate(() => {
          NotificationOrchestrator.dispatch(
            job.recruiter_id,
            'application_submitted',
            {
              title: 'New application received',
              body: `A new applicant has applied to "${job.title}"`,
              action_url: `/recruiter/jobs/${jobId}/applications`,
              job_title: job.title,
              applicant_name: 'A candidate',
              is_recruiter: true
            }
          ).catch(err => console.error('[Notification Error]', err));

          NotificationOrchestrator.dispatch(
            applicantId,
            'application_submitted',
            {
              title: 'Application Submitted',
              body: `Your application to "${job.title}" was submitted successfully.`,
              action_url: `/candidate/applications`,
              job_title: job.title,
              is_recruiter: false
            }
          ).catch(err => console.error('[Notification Error]', err));
        });
      }

      // 7) Milestone notification for recruiter on every 10 applications
      const totalApplications = await ApplicationModel.countByJob(jobId, client);
      if (totalApplications > 0 && totalApplications % 10 === 0) {
        setImmediate(() => {
          NotificationOrchestrator.dispatch(
            job.recruiter_id,
            'application_submitted',
            {
              title: 'Application milestone reached',
              body: `"${job.title}" has now reached ${totalApplications} applications.`,
              action_url: `/recruiter/jobs/${jobId}/applications`,
              job_title: job.title,
              applicant_name: `Candidate #${totalApplications}`,
              is_recruiter: true
            }
          ).catch(err => console.error('[Notification Error]', err));
        });
      }

      return {
        ...application,
        creditsRemaining: balanceAfter,
        creditTransactionId: transactionId,
        _jobForInsights: { title: job.title, description: job.description ?? '', skills: job.skills ?? [], recruiterId: job.recruiter_id },
        _applicantIdForInsights: applicantId,
        _aiInterviewConfig: (job.ai_interview_type && !isAutoShortlisted) ? {
          type: job.ai_interview_type,
          recruiterId: job.recruiter_id,
          title: job.title,
        } : null,
      };
    }).then(result => {
      // Fire-and-forget: generate AI insights AFTER transaction commits (so application row exists)
      // Known risk: if server restarts in this window, insights stay NULL; auto-approve cron handles it after 7 days.
      const jobCtx = result._jobForInsights;
      const apId = result._applicantIdForInsights;
      const appId = result.id;
      const aiConfig = result._aiInterviewConfig;
      // Strip internal fields from returned result
      const { _jobForInsights, _applicantIdForInsights, _aiInterviewConfig, ...cleanResult } = result as any;

      // Auto-dispatch AI interview if enabled on the job listing
      if (aiConfig) {
        setImmediate(async () => {
          try {
            console.log(`[ApplicationService] Auto-dispatching AI interview for application ${appId}`);

            // 1. Create interview record
            await InterviewModel.createInterview({
              application_id: appId,
              interviewer_id: aiConfig.recruiterId,
              candidate_id: apId,
              scheduled_at: new Date(),
            });

            // 2. Update application status to 'interview'
            await ApplicationModel.updateStatus(appId, 'interview');

            // 3. Create pipeline event
            await PipelineEventModel.create({
              application_id: appId,
              previous_status: 'applied',
              new_status: 'interview',
              changed_by_id: apId,
            });

            // 4. Notify applicant
            await NotificationModel.create({
              user_id: apId,
              type: 'application_status',
              title: 'AI Interview Invitation',
              body: `You have been automatically invited to a live AI interview for "${aiConfig.title}".`,
              action_url: `/applications`,
            });

          } catch (err) {
            console.error('[ApplicationService] Auto-dispatching AI interview failed:', err);
          }
        });
      }

      setImmediate(async () => {
        try {
          const profile = await ApplicantProfileModel.findByUserId(apId);
          
          // Original AI Insights (Gemini/Ollama)
          const insights = await AIInsightsService.generateInsights(
            {
              skills: Array.isArray(profile?.skills) ? profile.skills : [],
              bio: profile?.bio ?? null,
              experience: profile?.experience ?? [],
            },
            jobCtx,
          );
          if (insights) {
            await ApplicationModel.updateAIInsights(appId, {
              fit_insights: insights.fit_insights,
              rejection_reason: insights.rejection_reason,
              improvement_suggestions: insights.improvement_suggestions,
            });
            console.log(`[ApplicationService] AI insights saved for application ${appId}`);
          }

          // New Dynamic Screening & Ranking Flow
          // 1. Gather Candidate Data
          const candidateData = {
            skills: Array.isArray(profile?.skills) ? profile.skills : [],
            experienceText: (profile?.experience ?? [])
              .map((e: any) => `${e.title || ''} ${e.description || ''}`)
              .join(' '),
            fullText: [
              profile?.bio ?? '',
              Array.isArray(profile?.skills) ? profile.skills.join(' ') : '',
              (profile?.experience ?? [])
                .map((e: any) => `${e.title || ''} ${e.description || ''}`)
                .join(' '),
            ].join(' '),
            education: profile?.education ?? [],
          };

          // 2. Screen Candidate
          // @ts-ignore - dynamic import to avoid circular dependencies if any
          const { ScreeningService } = require('./ai/ScreeningService');
          const screeningResult = await ScreeningService.screenCandidate(
            result.job_id,
            jobCtx.recruiterId, // Assumes jobCtx has recruiterId, wait we don't have jobCtx.recruiterId in result._jobForInsights yet. We need to pass job.recruiter_id.
            candidateData,
            { skills: jobCtx.skills, description: jobCtx.description }
          );

          // 3. Update DB with Screening Score
          await prisma.applications.update({
            where: { id: appId },
            data: {
              screening_score: screeningResult.screeningScore,
              scoring_breakdown: screeningResult.scoringBreakdown,
            }
          });

          // 4. Log Audit Event
          // @ts-ignore
          const { AuditService } = require('./audit.service');
          await AuditService.logScreeningEvent({
            applicationId: appId,
            resumeId: result.resume_id,
            jobId: result.job_id,
            parsedResume: candidateData,
            parsedJd: { skills: jobCtx.skills, description: jobCtx.description },
            embeddingsMetadata: {}, // Captured inside ScreeningService optionally
            scoringBreakdown: screeningResult.scoringBreakdown,
            screeningScore: screeningResult.screeningScore,
            explanation: screeningResult.explanation,
            promptVersion: 'v1.0-ollama',
            modelVersion: 'llama3', // or dynamically fetched
            processingTimeMs: 0,
          });

          // 5. Update Global Job Rankings
          // @ts-ignore
          const { RankingService } = require('./ranking.service');
          await RankingService.updateRankingsForJob(result.job_id, jobCtx.recruiterId);
          console.log(`[ApplicationService] Dynamic Screening & Ranking completed for ${appId}`);

        } catch (err) {
          console.error('[ApplicationService] AI insights/screening generation failed silently:', err);
        }
      });

      // Fire webhook: application.submitted
      setImmediate(async () => {
        try {
          await WebhookService.fireEvent(WEBHOOK_EVENTS.APPLICATION_SUBMITTED, {
            event: WEBHOOK_EVENTS.APPLICATION_SUBMITTED,
            application_id: appId,
            job_id: result.job_id,
            job_title: jobCtx.title,
            applicant: { id: apId, name: null, email: null },
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error('[ApplicationService] Webhook fire failed silently:', err);
        }
      });
      return cleanResult;
    });
  },

  async checkApplied(applicantId: string, jobId: string) {
    const existing = await ApplicationModel.findByJobAndApplicant(jobId, applicantId);
    return { hasApplied: !!existing };
  },

  async updateStatus(user: { userId: string; role: string }, applicationId: string, status: ApplicationStatus) {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) throw Object.assign(new Error('Application not found'), { statusCode: 404 });

    const job = await JobModel.findById(application.job_id);
    if (!job || (user.role !== 'admin' && job.recruiter_id !== user.userId))
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

    const updated = await ApplicationModel.updateStatus(applicationId, status);

    // Pipeline event creation
    await PipelineEventModel.create({
      application_id: application.id,
      previous_status: application.status,
      new_status: status,
      changed_by_id: user.userId,
    });

    // Notify applicant
    await NotificationOrchestrator.dispatch(
      application.applicant_id,
      'application_status',
      {
        title: 'Application status updated',
        body: `Your application for "${job.title}" is now: ${status.replace('_', ' ')}`,
        action_url: `/applications`,
        job_title: job.title,
        new_status: status
      }
    );

    // Fire webhook: application.status_changed
    setImmediate(async () => {
      try {
        await WebhookService.fireEvent(WEBHOOK_EVENTS.APPLICATION_STATUS_CHANGED, {
          event: WEBHOOK_EVENTS.APPLICATION_STATUS_CHANGED,
          application_id: applicationId,
          job_id: application.job_id,
          job_title: job.title,
          old_status: application.status || '',
          new_status: status,
          changed_by: user.userId,
          timestamp: new Date().toISOString(),
        });

        if (status === 'offer') {
          await WebhookService.fireEvent(WEBHOOK_EVENTS.APPLICATION_OFFER_EXTENDED, {
            event: WEBHOOK_EVENTS.APPLICATION_OFFER_EXTENDED,
            application_id: applicationId,
            job_id: application.job_id,
            job_title: job.title,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('[ApplicationService] Webhook fire failed silently:', err);
      }
    });

    return updated;
  },

  async getMyApplications(applicantId: string, page: number, limit: number) {
    const [result, profile] = await Promise.all([
      ApplicationModel.findByApplicant(applicantId, page, limit),
      ApplicantProfileModel.findByUserId(applicantId),
    ]);
    const candidateSkills: string[] = Array.isArray(profile?.skills) ? profile.skills : [];
    const enriched = result.applications.map((app: any) => {
      const jobSkills: string[] = Array.isArray(app.job_skills) ? app.job_skills : [];
      const { matchPercentage } = SkillMatchingService.calculateSkillMatch(candidateSkills, jobSkills);
      return { ...app, selectionProbability: matchPercentage };
    });
    return { ...result, applications: enriched };
  },

  async getJobApplications(recruiterId: string, jobId: string, page: number, limit: number, filters?: { search?: string; status?: string }) {
    const job = await JobModel.findById(jobId);
    if (!job || job.recruiter_id !== recruiterId)
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

    const result = await ApplicationModel.findByJob(jobId, page, limit, filters);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JobService } = require('./job.service');



    const enrichedApplications = await Promise.all(result.applications.map(async (app: any) => {
      // Prioritize manual score override
      if (app.override_score !== null && app.override_score !== undefined) {
        return { ...app, matchScore: app.override_score, matchMethod: 'override' };
      }

      // Use pre-computed screening_score if available
      if (app.screening_score !== null && app.screening_score !== undefined) {
        return { ...app, matchScore: app.screening_score, matchMethod: 'hybrid_ai' };
      }

      // Fallback for legacy applications: skills-only match score
      const matchResult = await JobService.calculateMatchScore(app.skills || [], job.skills || []);
      return { ...app, matchScore: matchResult.matchScore, matchMethod: 'skills' };
    }));

    // Sort by match score descending (highest similarity first)
    enrichedApplications.sort((a, b) => b.matchScore - a.matchScore);

    return { ...result, applications: enrichedApplications };
  },

  async getMyApplicationsWithFilters(
    applicantId: string,
    filters: { status?: ApplicationStatus; jobTitle?: string },
    page: number,
    limit: number,
  ) {
    const [result, profile] = await Promise.all([
      ApplicationModel.findByApplicantWithFilters(applicantId, filters, page, limit),
      ApplicantProfileModel.findByUserId(applicantId),
    ]);
    const candidateSkills: string[] = Array.isArray(profile?.skills) ? profile.skills : [];
    const enriched = result.applications.map((app: any) => {
      const jobSkills: string[] = Array.isArray(app.job_skills) ? app.job_skills : [];
      const { matchPercentage } = SkillMatchingService.calculateSkillMatch(candidateSkills, jobSkills);
      return { ...app, selectionProbability: matchPercentage };
    });
    return { ...result, applications: enriched };
  },

  async getApplicationStatistics(applicantId: string) {
    return ApplicationModel.getApplicationStats(applicantId);
  },

  async getRecruiterApplications(recruiterId: string, page: number, limit: number) {
    return ApplicationModel.findByRecruiter(recruiterId, page, limit);
  },

  async getRecruiterApplicationsWithFilters(
    recruiterId: string,
    filters: { status?: ApplicationStatus; jobTitle?: string; applicantName?: string; jobId?: string; search?: string },
    page: number,
    limit: number,
  ) {
    return ApplicationModel.findByRecruiterWithFilters(recruiterId, filters, page, limit);
  },

  async getRecruiterApplicationsStatistics(recruiterId: string) {
    return ApplicationModel.getRecruiterApplicationStats(recruiterId);
  },

  async getRecruiterApplicationDetail(recruiterId: string, applicationId: string) {
    const application = await ApplicationModel.findRecruiterApplicationById(recruiterId, applicationId);
    if (!application) {
      throw Object.assign(new Error('Application not found'), { statusCode: 404 });
    }

    // Enrich with backend-computed skill match so the frontend never needs
    // to calculate scores independently.
    const candidateSkills: string[] = Array.isArray(application.skills) ? application.skills : [];
    const jobSkills: string[] = Array.isArray(application.job_skills) ? application.job_skills : [];

    const skillMatchResult = SkillMatchingService.calculateSkillMatch(candidateSkills, jobSkills);

    // Fetch candidate's extended profile data
    const applicantProjects: any[] = [];
    const githubRepos: any[] = [];
    const applicantCertifications: any[] = [];

    return {
      ...application,
      skill_match: application.override_score !== null && application.override_score !== undefined ? application.override_score : skillMatchResult.matchPercentage,
      matched_skills: skillMatchResult.matchedSkills,
      missing_skills: skillMatchResult.missingSkills,
      fuzzy_matched_skills: skillMatchResult.fuzzyMatchedSkills,
      projects: applicantProjects,
      github_repos: githubRepos,
      certifications: applicantCertifications,
    };
  },

  async getEvents(user: { userId: string; role: string }, applicationId: string) {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) throw Object.assign(new Error('Application not found'), { statusCode: 404 });

    if (user.role === 'applicant' && application.applicant_id !== user.userId) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }

    if (user.role === 'recruiter') {
      const job = await JobModel.findById(application.job_id);
      if (!job || job.recruiter_id !== user.userId) {
        throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
      }
    }

    return PipelineEventModel.findByApplication(applicationId);
  },

  async getResumeUrl(user: { userId: string; role: string }, applicationId: string): Promise<string> {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      throw Object.assign(new Error('Application not found'), { statusCode: 404 });
    }

    if (!application.resume_snapshot_url) {
      throw Object.assign(new Error('No resume attached to this application'), { statusCode: 404 });
    }

    let isAuthorized = false;

    if (user.role === 'admin') {
      isAuthorized = true;
    } else if (user.role === 'applicant' && application.applicant_id === user.userId) {
      isAuthorized = true;
    } else if (user.role === 'recruiter') {
      const job = await JobModel.findById(application.job_id);
      if (job && job.recruiter_id === user.userId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw Object.assign(new Error('Forbidden: You do not have access to this resume'), { statusCode: 403 });
    }

    // Defaulting to PDF/image type for snapshots, as they are typically PDFs
    return StorageService.generateSignedUrl(application.resume_snapshot_url, 'image');
  },

  /** Recruiter approves the AI insights so the applicant can see them */
  async approveInsights(recruiterId: string, applicationId: string): Promise<void> {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) throw Object.assign(new Error('Application not found'), { statusCode: 404 });

    const job = await JobModel.findById(application.job_id);
    if (!job || job.recruiter_id !== recruiterId)
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

    await ApplicationModel.updateInsightsApproval(applicationId, true);
  },

  /** Applicant retrieves their AI insights (gated by approval flag) */
  async getApplicantInsights(applicantId: string, applicationId: string) {
    const fields = await ApplicationModel.getInsightsFields(applicationId);
    if (!fields) throw Object.assign(new Error('Application not found'), { statusCode: 404 });
    if (fields.applicant_id !== applicantId)
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

    if (!fields.insights_approved) {
      return { pending: true };
    }

    // Approved but AI failed to generate (empty drawer case)
    const hasContent = fields.fit_insights || fields.improvement_suggestions;
    if (!hasContent) {
      return {
        pending: false,
        unavailable: true,
        status: fields.status,
      };
    }

    return {
      pending: false,
      unavailable: false,
      status: fields.status,
      fit_insights: fields.fit_insights,
      improvement_suggestions: fields.improvement_suggestions,
      // Rejection reason only exposed if status is rejected
      rejection_reason: fields.status === 'rejected' ? fields.rejection_reason : null,
    };
  },

  async overrideDecision(
    recruiterId: string,
    applicationId: string,
    data: {
      override_score?: number | null;
      status?: ApplicationStatus;
      notes?: string | null;
    },
  ) {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) throw Object.assign(new Error('Application not found'), { statusCode: 404 });

    const job = await JobModel.findById(application.job_id);
    if (!job || job.recruiter_id !== recruiterId)
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });

    const previousStatus = application.status;
    const newStatus = data.status || previousStatus;
    const notes = data.notes || null;

    return withTransaction(async (client) => {
      // 1. Update application status, override score, and override reason
      const query = `
        UPDATE applications
        SET override_score = $1,
            override_reason = $2,
            status = $3,
            status_updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      
      const values = [
        data.override_score === undefined ? application.override_score : data.override_score,
        data.notes === undefined ? application.override_reason : notes,
        newStatus,
        applicationId,
      ];
      
      const { rows } = await client.query(query, values);
      const updated = rows[0];

      // 2. Log pipeline event
      const scoreStr = data.override_score !== undefined
        ? (data.override_score === null ? 'Default AI' : `${data.override_score}%`)
        : 'Unchanged';
      
      await PipelineEventModel.create({
        application_id: applicationId,
        previous_status: previousStatus,
        new_status: newStatus,
        changed_by_id: recruiterId,
        notes: `Manual Override: Score overridden to ${scoreStr}. Notes: ${notes || 'No reason provided'}`,
      }, client);

      // 3. Notify applicant if status changed
      if (newStatus !== previousStatus) {
        await NotificationModel.create({
          user_id: application.applicant_id,
          type: 'application_status',
          title: 'Application status updated',
          body: `Your application status for "${job.title}" has been updated to: ${newStatus.replace('_', ' ')}`,
          action_url: `/applications`,
        }, client);
      }

      return updated;
    });
  },
};



