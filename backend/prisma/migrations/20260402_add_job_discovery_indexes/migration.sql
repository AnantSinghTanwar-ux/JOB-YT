-- Optimize job discovery queries with additional indexes

-- Index for job type filtering (for discovery mode)
CREATE INDEX IF NOT EXISTS "idx_jobs_type" ON "jobs"("type");

-- Index for job status filtering (draft, active, closed)
CREATE INDEX IF NOT EXISTS "idx_jobs_status" ON "jobs"("status");

-- Composite index for efficient deletion tracking + status filtering
CREATE INDEX IF NOT EXISTS "idx_jobs_deleted_status" ON "jobs"("deleted_at", "status");

-- Index for job approval status (public access filtering)
CREATE INDEX IF NOT EXISTS "idx_jobs_approval_status" ON "jobs"("job_approval_status");

-- Composite index for combined filters: approval status + type + deletion
CREATE INDEX IF NOT EXISTS "idx_jobs_discovery" ON "jobs"("job_approval_status", "status", "deleted_at", "type");

-- Index for location filtering (ILIKE queries benefit from text_pattern_ops)
CREATE INDEX IF NOT EXISTS "idx_jobs_location" ON "jobs"("location" varchar_pattern_ops);

-- Composite index for salary range queries (common pattern)
CREATE INDEX IF NOT EXISTS "idx_jobs_salary_range" ON "jobs"("salary_min", "salary_max");

-- Index to support exclusion of applied jobs (subquery optimization)
CREATE INDEX IF NOT EXISTS "idx_applications_job_applicant" ON "applications"("job_id", "applicant_id");
