-- CreateEnum
CREATE TYPE "interview_status" AS ENUM ('scheduled', 'live', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "coding_problem_status" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "coding_difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "coding_assessment_status" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "assessment_timing" AS ENUM ('during_apply', 'post_apply');

-- CreateEnum
CREATE TYPE "assessment_session_status" AS ENUM ('pending', 'active', 'submitted', 'expired', 'completed');

-- CreateEnum
CREATE TYPE "coding_submission_status" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "video_processing_status" AS ENUM ('UPLOADING', 'UPLOADED', 'TRANSCRIBING', 'TRANSCRIBED', 'EVALUATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "skill_verification_status" AS ENUM ('SELF_REPORTED', 'COURSE_COMPLETED', 'PLATFORM_ASSESSED', 'EMPLOYER_VERIFIED');

-- CreateEnum
CREATE TYPE "skill_importance" AS ENUM ('Critical', 'Important', 'Optional');

-- CreateEnum
CREATE TYPE "learning_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification_type" ADD VALUE 'interview_invited';
ALTER TYPE "notification_type" ADD VALUE 'interview_reminder_24h';
ALTER TYPE "notification_type" ADD VALUE 'interview_reminder_2h';
ALTER TYPE "notification_type" ADD VALUE 'deadline_alert';
ALTER TYPE "notification_type" ADD VALUE 'employer_broadcast';
ALTER TYPE "notification_type" ADD VALUE 'credits_exhausted';
ALTER TYPE "notification_type" ADD VALUE 'subscription_expiry_7d';
ALTER TYPE "notification_type" ADD VALUE 'subscription_expiry_3d';
ALTER TYPE "notification_type" ADD VALUE 'subscription_expiry_1d';

-- DropForeignKey
ALTER TABLE IF EXISTS "auto_apply_queue_items" DROP CONSTRAINT IF EXISTS "auto_apply_queue_items_application_id_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "roadmap_edges" DROP CONSTRAINT IF EXISTS "roadmap_edges_roadmap_id_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "roadmap_edges" DROP CONSTRAINT IF EXISTS "roadmap_edges_source_node_id_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "roadmap_edges" DROP CONSTRAINT IF EXISTS "roadmap_edges_target_node_id_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "roadmap_nodes" DROP CONSTRAINT IF EXISTS "roadmap_nodes_parent_id_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "roadmap_nodes" DROP CONSTRAINT IF EXISTS "roadmap_nodes_roadmap_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "idx_applications_applicant_id";

-- DropIndex
DROP INDEX IF EXISTS "idx_applications_created_at";

-- DropIndex
DROP INDEX IF EXISTS "idx_applications_job_id";

-- DropIndex
DROP INDEX IF EXISTS "idx_applications_status";

-- DropIndex
DROP INDEX IF EXISTS "idx_applications_status_created";

-- DropIndex
DROP INDEX IF EXISTS "idx_applications_submission_source";

-- DropIndex
DROP INDEX IF EXISTS "idx_jobs_deleted_status";

-- DropIndex
DROP INDEX IF EXISTS "idx_jobs_discovery";

-- DropIndex
DROP INDEX IF EXISTS "idx_jobs_location";

-- DropIndex
DROP INDEX IF EXISTS "idx_jobs_salary_range";

-- DropIndex
DROP INDEX IF EXISTS "idx_jobs_status";

-- DropIndex
DROP INDEX IF EXISTS "idx_jobs_type";

-- DropIndex
DROP INDEX IF EXISTS "idx_users_email_trgm";

-- DropIndex
DROP INDEX IF EXISTS "idx_users_role_created";

-- AlterTable
ALTER TABLE "admin_audit_log" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "applicant_profiles" ADD COLUMN     "share_token" VARCHAR(100),
ADD COLUMN     "visibility" VARCHAR(20) NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "ai_recommended" BOOLEAN DEFAULT false,
ADD COLUMN     "insights_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "insights_approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "insights_generated_at" TIMESTAMPTZ(6),
ADD COLUMN     "percentile" DOUBLE PRECISION,
ADD COLUMN     "rank" INTEGER,
ADD COLUMN     "scoring_breakdown" JSONB,
ADD COLUMN     "screening_score" DOUBLE PRECISION,
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "auto_apply_preferences" ADD COLUMN     "tailoring_mode" TEXT NOT NULL DEFAULT 'keywords';

-- AlterTable
ALTER TABLE "conversations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "credit_transactions" ADD COLUMN     "credit_category" VARCHAR(20) NOT NULL DEFAULT 'EARNED',
ADD COLUMN     "expiry_date" TIMESTAMPTZ(6),
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "active_assessment_version_id" UUID,
ADD COLUMN     "application_deadline" TIMESTAMPTZ(6),
ADD COLUMN     "coding_assessment_id" UUID,
ADD COLUMN     "external_url" VARCHAR(2048),
ADD COLUMN     "structured_jd" JSONB,
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "messages" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "pipeline_events" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "plans" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "recruiter_profiles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "referrals" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "resumes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "banned_at",
ADD COLUMN     "email_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" VARCHAR(30),
ADD COLUMN     "phone_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subscription_expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "whatsapp_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- DropTable
DROP TABLE IF EXISTS "embedding_cache";

-- DropTable
DROP TABLE IF EXISTS "ingestion_runs";

-- DropTable
DROP TABLE IF EXISTS "roadmap_edges";

-- DropTable
DROP TABLE IF EXISTS "roadmap_nodes";

-- DropTable
DROP TABLE IF EXISTS "roadmaps";

-- CreateTable
CREATE TABLE "notification_dnd_settings" (
    "user_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "start_time" VARCHAR(5) NOT NULL DEFAULT '22:00',
    "end_time" VARCHAR(5) NOT NULL DEFAULT '08:00',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_dnd_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "do_not_disturb_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "do_not_disturb_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "recruiter_id" UUID NOT NULL,
    "message_body" TEXT NOT NULL,
    "channels" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcast_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_recommendations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduler_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(30) NOT NULL DEFAULT 'started',
    "users_processed" INTEGER NOT NULL DEFAULT 0,
    "emails_sent" INTEGER NOT NULL DEFAULT 0,
    "whatsapp_sent" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduler_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coding_problems" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_by" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "status" "coding_problem_status" NOT NULL DEFAULT 'draft',
    "current_version_number" INTEGER NOT NULL DEFAULT 0,
    "difficulty" "coding_difficulty" NOT NULL DEFAULT 'medium',
    "supported_languages" TEXT[] DEFAULT ARRAY['python', 'javascript', 'java', 'cpp']::TEXT[],
    "description" TEXT NOT NULL DEFAULT '',
    "constraints" TEXT,
    "hints" JSONB DEFAULT '[]',
    "starter_code" JSONB NOT NULL DEFAULT '{}',
    "time_limit_sec" INTEGER NOT NULL DEFAULT 5,
    "memory_limit_kb" INTEGER NOT NULL DEFAULT 128000,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "coding_problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coding_test_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "problem_id" UUID NOT NULL,
    "input" TEXT NOT NULL DEFAULT '',
    "expected_output" TEXT NOT NULL DEFAULT '',
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "explanation" TEXT,

    CONSTRAINT "coding_test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "problem_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "constraints" TEXT,
    "hints" JSONB DEFAULT '[]',
    "difficulty" "coding_difficulty" NOT NULL,
    "supported_languages" TEXT[],
    "starter_code" JSONB NOT NULL DEFAULT '{}',
    "time_limit_sec" INTEGER NOT NULL DEFAULT 5,
    "memory_limit_kb" INTEGER NOT NULL DEFAULT 128000,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" UUID NOT NULL,
    "snapshot_hash" VARCHAR(64) NOT NULL,

    CONSTRAINT "problem_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_version_test_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "problem_version_id" UUID NOT NULL,
    "input" TEXT NOT NULL DEFAULT '',
    "expected_output" TEXT NOT NULL DEFAULT '',
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "explanation" TEXT,

    CONSTRAINT "problem_version_test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_collections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_by" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_problems" (
    "collection_id" UUID NOT NULL,
    "problem_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "collection_problems_pkey" PRIMARY KEY ("collection_id","problem_id")
);

-- CreateTable
CREATE TABLE "coding_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recruiter_id" UUID NOT NULL,
    "job_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "coding_assessment_status" NOT NULL DEFAULT 'draft',
    "current_version_number" INTEGER NOT NULL DEFAULT 0,
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "time_limit_minutes" INTEGER,
    "max_attempts" INTEGER NOT NULL DEFAULT 1,
    "assessment_timing" "assessment_timing" NOT NULL DEFAULT 'post_apply',
    "allow_resume" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coding_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_problems" (
    "assessment_id" UUID NOT NULL,
    "problem_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "assessment_problems_pkey" PRIMARY KEY ("assessment_id","problem_id")
);

-- CreateTable
CREATE TABLE "assessment_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "time_limit_minutes" INTEGER,
    "max_attempts" INTEGER NOT NULL DEFAULT 1,
    "assessment_timing" "assessment_timing" NOT NULL,
    "allow_resume" BOOLEAN NOT NULL DEFAULT true,
    "job_id" UUID,
    "job_snapshot" JSONB,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" UUID NOT NULL,
    "snapshot_hash" VARCHAR(64) NOT NULL,

    CONSTRAINT "assessment_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_version_problems" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_version_id" UUID NOT NULL,
    "problem_version_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 100,
    "problem_snapshot" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "assessment_version_problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_version_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "application_id" UUID,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "status" "assessment_session_status" NOT NULL DEFAULT 'pending',
    "remaining_time_seconds" INTEGER,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "last_heartbeat_at" TIMESTAMPTZ(6),
    "current_problem_index" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "assessment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "problem_version_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "best_score" INTEGER,
    "attempts_count" INTEGER NOT NULL DEFAULT 0,
    "solved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coding_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "assessment_session_id" UUID,
    "practice_session_id" UUID,
    "problem_version_id" UUID NOT NULL,
    "assessment_version_id" UUID,
    "application_id" UUID,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "language" VARCHAR(20) NOT NULL,
    "source_code" TEXT NOT NULL,
    "status" "coding_submission_status" NOT NULL DEFAULT 'pending',
    "test_pass_count" INTEGER NOT NULL DEFAULT 0,
    "test_total_count" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "passed" BOOLEAN,
    "execution_time_ms" INTEGER,
    "memory_kb" INTEGER,
    "assessment_snapshot" JSONB,
    "problem_snapshot" JSONB,
    "job_snapshot" JSONB,
    "judge0_tokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coding_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_test_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "test_case_id" UUID NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "actual_output" TEXT,
    "stderr" TEXT,
    "time_sec" DOUBLE PRECISION,
    "memory_kb" DOUBLE PRECISION,
    "status_id" INTEGER,

    CONSTRAINT "submission_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "readability_score" INTEGER,
    "maintainability_score" INTEGER,
    "efficiency_score" INTEGER,
    "best_practices_score" INTEGER,
    "optimization_score" INTEGER,
    "overall_quality_score" INTEGER,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "weaknesses" JSONB NOT NULL DEFAULT '[]',
    "suggestions" JSONB NOT NULL DEFAULT '[]',
    "raw_response" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "problem_version_id" UUID,
    "assessment_session_id" UUID,
    "practice_session_id" UUID,
    "language" VARCHAR(20) NOT NULL,
    "source_code" TEXT NOT NULL,
    "stdin" TEXT,
    "stdout" TEXT,
    "stderr" TEXT,
    "compile_output" TEXT,
    "execution_time_ms" INTEGER,
    "memory_kb" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'success',
    "judge0_token" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "endpoint" VARCHAR(1024) NOT NULL,
    "p256dh" VARCHAR(255) NOT NULL,
    "auth" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "location_or_link" VARCHAR(1024),
    "notes" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "interviewer_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "status" "interview_status" NOT NULL DEFAULT 'scheduled',
    "code_content" TEXT,
    "code_language" VARCHAR(50) DEFAULT 'javascript',
    "notes" TEXT,
    "feedback" TEXT,
    "rating" INTEGER,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "proctoring_violations" JSONB DEFAULT '[]',

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_apply_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "applied_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_apply_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employer_settings" (
    "recruiter_id" UUID NOT NULL,
    "scoring_weights" JSONB NOT NULL DEFAULT '{"experience": 0.22, "skills": 0.17, "education": 0.12, "semantic": 0.20, "keywords": 0.14}',
    "recommended_percentage" INTEGER NOT NULL DEFAULT 10,
    "digest_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employer_settings_pkey" PRIMARY KEY ("recruiter_id")
);

-- CreateTable
CREATE TABLE "screening_audits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "resume_id" UUID,
    "job_id" UUID NOT NULL,
    "parsed_resume" JSONB,
    "parsed_jd" JSONB,
    "embeddings_metadata" JSONB,
    "scoring_breakdown" JSONB,
    "screening_score" DOUBLE PRECISION,
    "explanation" JSONB,
    "prompt_version" VARCHAR(50),
    "model_version" VARCHAR(50),
    "processing_time_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screening_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_interviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "job_id" UUID,
    "video_url" VARCHAR(500) NOT NULL,
    "status" "video_processing_status" NOT NULL DEFAULT 'UPLOADING',
    "transcript" TEXT,
    "segmented_transcript" JSONB,
    "timestamps" JSONB,
    "confidence" DOUBLE PRECISION,
    "language" VARCHAR(50),
    "evaluation_scores" JSONB,
    "employer_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "consent_version" VARCHAR(50) NOT NULL,
    "consent_timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retention_expiry" TIMESTAMPTZ(6) NOT NULL,
    "video_expiry" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "proficiency" INTEGER DEFAULT 0,
    "verification_status" "skill_verification_status" NOT NULL DEFAULT 'SELF_REPORTED',
    "source" VARCHAR(100) NOT NULL DEFAULT 'resume',
    "confidence" DOUBLE PRECISION,
    "credits_earned" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" VARCHAR(50) NOT NULL,
    "external_id" VARCHAR(255) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "url" VARCHAR(1024) NOT NULL,
    "thumbnail_url" VARCHAR(1024),
    "instructor" VARCHAR(255),
    "duration_mins" INTEGER,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER DEFAULT 0,
    "price_amount" DECIMAL(10,2),
    "price_currency" VARCHAR(10),
    "skill_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" VARCHAR(50),
    "language" VARCHAR(50),
    "last_updated" TIMESTAMP(3),
    "scraped_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cache_expiry" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "status" "learning_status" NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "certificate_url" VARCHAR(1024),
    "notes" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_credits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "credits_earned" INTEGER NOT NULL,
    "completion_source" VARCHAR(100) NOT NULL,
    "reference_id" UUID,
    "verification_status" "skill_verification_status" NOT NULL,
    "awarded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_roadmaps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "target_role" VARCHAR(255) NOT NULL,
    "missing_skills" JSONB NOT NULL DEFAULT '[]',
    "recommended_courses" JSONB NOT NULL DEFAULT '[]',
    "learning_sequence" JSONB NOT NULL DEFAULT '[]',
    "estimated_hours" INTEGER,
    "roadmap_version" VARCHAR(50) NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "action_type" VARCHAR(100) NOT NULL,
    "target_role" VARCHAR(255),
    "skill_gaps" JSONB,
    "recommended_courses" JSONB,
    "roadmap_version" VARCHAR(50),
    "credits_awarded" INTEGER,
    "progress_updates" JSONB,
    "verification_changes" JSONB,
    "reasoning" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_tiers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "target_audience" VARCHAR(20) NOT NULL,
    "price_monthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "price_annual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "features" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tier_id" UUID NOT NULL,
    "billing_cycle" VARCHAR(20) NOT NULL DEFAULT 'monthly',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "current_period_start" TIMESTAMPTZ(6) NOT NULL,
    "current_period_end" TIMESTAMPTZ(6) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "template" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_response_cache" (
    "cache_key" VARCHAR(255) NOT NULL,
    "response" JSONB NOT NULL,
    "model_used" VARCHAR(50) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_response_cache_pkey" PRIMARY KEY ("cache_key")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "module" VARCHAR(50) NOT NULL,
    "model_name" VARCHAR(50) NOT NULL,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "is_cache_hit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_bias_audits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID,
    "module" VARCHAR(50) NOT NULL,
    "original_decision" JSONB NOT NULL,
    "is_overridden" BOOLEAN NOT NULL DEFAULT false,
    "override_decision" JSONB,
    "override_reason" TEXT,
    "reviewer_id" UUID,
    "bias_flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_bias_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dpdpa_consent_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "consent_type" VARCHAR(100) NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dpdpa_consent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_deletion_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "do_not_disturb_events_idempotency_key_key" ON "do_not_disturb_events"("idempotency_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "do_not_disturb_events_user_id_idx" ON "do_not_disturb_events"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "do_not_disturb_events_status_idx" ON "do_not_disturb_events"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "broadcast_messages_job_id_idx" ON "broadcast_messages"("job_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "broadcast_messages_recruiter_id_idx" ON "broadcast_messages"("recruiter_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_job_recommendations_user_status" ON "job_recommendations"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idx_job_recommendations_unique" ON "job_recommendations"("user_id", "job_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_coding_problems_created_by_status" ON "coding_problems"("created_by", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_coding_problems_tags" ON "coding_problems" USING GIN ("tags");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "coding_problems_created_by_slug_key" ON "coding_problems"("created_by", "slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_coding_test_cases_problem" ON "coding_test_cases"("problem_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "problem_versions_problem_id_version_number_key" ON "problem_versions"("problem_id", "version_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_pvtc_version" ON "problem_version_test_cases"("problem_version_id", "order_index");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_problem_collections_created_by" ON "problem_collections"("created_by");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_coding_assessments_recruiter" ON "coding_assessments"("recruiter_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_versions_assessment_id_version_number_key" ON "assessment_versions"("assessment_id", "version_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_avp_version" ON "assessment_version_problems"("assessment_version_id", "order_index");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_assessment_sessions_user_version" ON "assessment_sessions"("user_id", "assessment_version_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_assessment_sessions_application" ON "assessment_sessions"("application_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_assessment_sessions_status_expires" ON "assessment_sessions"("status", "expires_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_practice_sessions_user" ON "practice_sessions"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_practice_sessions_user_problem" ON "practice_sessions"("user_id", "problem_version_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_coding_submissions_user_created" ON "coding_submissions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_coding_submissions_session" ON "coding_submissions"("assessment_session_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_coding_submissions_problem_user" ON "coding_submissions"("problem_version_id", "user_id", "attempt_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_submission_test_results_submission" ON "submission_test_results"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "code_evaluations_submission_id_key" ON "code_evaluations"("submission_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_execution_logs_user_created" ON "execution_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "notification_deliveries_idempotency_key_key" ON "notification_deliveries"("idempotency_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_notification_deliveries_user_event" ON "notification_deliveries"("user_id", "event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_id_event_type_key" ON "notification_preferences"("user_id", "event_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_user" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_interview_invites_application" ON "interview_invites"("application_id", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_auto_apply_logs_user_status" ON "auto_apply_logs"("user_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "screening_audits_application_id_idx" ON "screening_audits"("application_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "screening_audits_job_id_idx" ON "screening_audits"("job_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_interviews_application_id_idx" ON "video_interviews"("application_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_interviews_candidate_id_idx" ON "video_interviews"("candidate_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_interviews_status_idx" ON "video_interviews"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_consents_candidate_id_idx" ON "video_consents"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "candidate_skills_candidate_id_idx" ON "candidate_skills"("candidate_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "candidate_skills_skill_id_idx" ON "candidate_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "candidate_skills_candidate_id_skill_id_key" ON "candidate_skills"("candidate_id", "skill_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "courses_skill_tags_idx" ON "courses" USING GIN ("skill_tags");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "courses_provider_external_id_key" ON "courses"("provider", "external_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "learning_progress_candidate_id_status_idx" ON "learning_progress"("candidate_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "learning_progress_candidate_id_course_id_key" ON "learning_progress"("candidate_id", "course_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "skill_credits_candidate_id_idx" ON "skill_credits"("candidate_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "skill_credits_skill_id_idx" ON "skill_credits"("skill_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "learning_roadmaps_candidate_id_idx" ON "learning_roadmaps"("candidate_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "learning_audit_logs_candidate_id_action_type_idx" ON "learning_audit_logs"("candidate_id", "action_type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_tiers_name_key" ON "subscription_tiers"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "prompt_templates_name_key" ON "prompt_templates"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_response_cache_expires_at_idx" ON "ai_response_cache"("expires_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_usage_logs_user_id_created_at_idx" ON "ai_usage_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_bias_audits_application_id_idx" ON "ai_bias_audits"("application_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dpdpa_consent_logs_user_id_idx" ON "dpdpa_consent_logs"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "data_deletion_requests_status_scheduled_for_idx" ON "data_deletion_requests"("status", "scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auto_apply_queue_items_resume_variant_id_key" ON "auto_apply_queue_items"("resume_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_key" ON "users"("phone");

-- AddForeignKey
ALTER TABLE "notification_dnd_settings" ADD CONSTRAINT "notification_dnd_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "do_not_disturb_events" ADD CONSTRAINT "do_not_disturb_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "broadcast_messages" ADD CONSTRAINT "broadcast_messages_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "broadcast_messages" ADD CONSTRAINT "broadcast_messages_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_active_assessment_version_id_fkey" FOREIGN KEY ("active_assessment_version_id") REFERENCES "assessment_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_coding_assessment_id_fkey" FOREIGN KEY ("coding_assessment_id") REFERENCES "coding_assessments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_recommendations" ADD CONSTRAINT "job_recommendations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_recommendations" ADD CONSTRAINT "job_recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coding_problems" ADD CONSTRAINT "coding_problems_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coding_test_cases" ADD CONSTRAINT "coding_test_cases_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "coding_problems"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "problem_versions" ADD CONSTRAINT "problem_versions_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "coding_problems"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "problem_versions" ADD CONSTRAINT "problem_versions_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "problem_version_test_cases" ADD CONSTRAINT "problem_version_test_cases_problem_version_id_fkey" FOREIGN KEY ("problem_version_id") REFERENCES "problem_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "problem_collections" ADD CONSTRAINT "problem_collections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "collection_problems" ADD CONSTRAINT "collection_problems_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "problem_collections"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "collection_problems" ADD CONSTRAINT "collection_problems_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "coding_problems"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coding_assessments" ADD CONSTRAINT "coding_assessments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coding_assessments" ADD CONSTRAINT "coding_assessments_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_problems" ADD CONSTRAINT "assessment_problems_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "coding_assessments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_problems" ADD CONSTRAINT "assessment_problems_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "coding_problems"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "coding_assessments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_version_problems" ADD CONSTRAINT "assessment_version_problems_assessment_version_id_fkey" FOREIGN KEY ("assessment_version_id") REFERENCES "assessment_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_version_problems" ADD CONSTRAINT "assessment_version_problems_problem_version_id_fkey" FOREIGN KEY ("problem_version_id") REFERENCES "problem_versions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_assessment_version_id_fkey" FOREIGN KEY ("assessment_version_id") REFERENCES "assessment_versions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_problem_version_id_fkey" FOREIGN KEY ("problem_version_id") REFERENCES "problem_versions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coding_submissions" ADD CONSTRAINT "coding_submissions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coding_submissions" ADD CONSTRAINT "coding_submissions_assessment_session_id_fkey" FOREIGN KEY ("assessment_session_id") REFERENCES "assessment_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coding_submissions" ADD CONSTRAINT "coding_submissions_assessment_version_id_fkey" FOREIGN KEY ("assessment_version_id") REFERENCES "assessment_versions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coding_submissions" ADD CONSTRAINT "coding_submissions_practice_session_id_fkey" FOREIGN KEY ("practice_session_id") REFERENCES "practice_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coding_submissions" ADD CONSTRAINT "coding_submissions_problem_version_id_fkey" FOREIGN KEY ("problem_version_id") REFERENCES "problem_versions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coding_submissions" ADD CONSTRAINT "coding_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "submission_test_results" ADD CONSTRAINT "submission_test_results_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "coding_submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "code_evaluations" ADD CONSTRAINT "code_evaluations_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "coding_submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_assessment_session_id_fkey" FOREIGN KEY ("assessment_session_id") REFERENCES "assessment_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_practice_session_id_fkey" FOREIGN KEY ("practice_session_id") REFERENCES "practice_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_problem_version_id_fkey" FOREIGN KEY ("problem_version_id") REFERENCES "problem_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interview_invites" ADD CONSTRAINT "interview_invites_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interview_invites" ADD CONSTRAINT "interview_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auto_apply_logs" ADD CONSTRAINT "auto_apply_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auto_apply_logs" ADD CONSTRAINT "auto_apply_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employer_settings" ADD CONSTRAINT "employer_settings_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "screening_audits" ADD CONSTRAINT "screening_audits_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "video_interviews" ADD CONSTRAINT "video_interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_interviews" ADD CONSTRAINT "video_interviews_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_interviews" ADD CONSTRAINT "video_interviews_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_consents" ADD CONSTRAINT "video_consents_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_credits" ADD CONSTRAINT "skill_credits_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_roadmaps" ADD CONSTRAINT "learning_roadmaps_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_audit_logs" ADD CONSTRAINT "learning_audit_logs_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "subscription_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dpdpa_consent_logs" ADD CONSTRAINT "dpdpa_consent_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

