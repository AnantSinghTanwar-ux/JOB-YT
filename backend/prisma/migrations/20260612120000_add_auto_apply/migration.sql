-- Auto-Apply feature: preferences, queue, events, resume variants, daily usage, job/application extensions

CREATE TYPE auto_apply_approval_mode AS ENUM ('auto', 'manual');
CREATE TYPE auto_apply_status AS ENUM ('disabled', 'enabled', 'paused');
CREATE TYPE auto_apply_queue_status AS ENUM (
  'matched',
  'pending_approval',
  'tailoring',
  'submitting',
  'submitted',
  'skipped',
  'failed',
  'cancelled',
  'expired'
);
CREATE TYPE auto_apply_event_type AS ENUM (
  'MATCHED',
  'APPROVED',
  'REJECTED',
  'TAILORED',
  'SUBMITTED',
  'FAILED',
  'PAUSED',
  'SKIPPED',
  'PREVIEWED'
);
CREATE TYPE resume_variant_source AS ENUM ('auto_apply_tailor', 'manual_upload');

CREATE TABLE auto_apply_preferences (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status               auto_apply_status NOT NULL DEFAULT 'disabled',
  approval_mode        auto_apply_approval_mode NOT NULL DEFAULT 'manual',
  match_threshold      INTEGER NOT NULL DEFAULT 70 CHECK (match_threshold BETWEEN 0 AND 100),
  target_roles         TEXT[] NOT NULL DEFAULT '{}',
  target_locations     TEXT[] NOT NULL DEFAULT '{}',
  target_job_types     job_type[] NOT NULL DEFAULT '{}',
  excluded_companies   TEXT[] NOT NULL DEFAULT '{}',
  excluded_keywords    TEXT[] NOT NULL DEFAULT '{}',
  base_resume_id       UUID REFERENCES resumes(id) ON DELETE SET NULL,
  include_cover_letter BOOLEAN NOT NULL DEFAULT false,
  digest_enabled       BOOLEAN NOT NULL DEFAULT true,
  consented_at         TIMESTAMPTZ,
  preview_ack_at       TIMESTAMPTZ,
  last_matched_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resume_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
  base_resume_id  UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  version_label   VARCHAR(10) NOT NULL DEFAULT 'A',
  snapshot_url    VARCHAR(500) NOT NULL,
  change_log      JSONB NOT NULL DEFAULT '[]',
  fabricated_risk BOOLEAN NOT NULL DEFAULT false,
  source          resume_variant_source NOT NULL DEFAULT 'auto_apply_tailor',
  queue_item_id   UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auto_apply_queue_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status            auto_apply_queue_status NOT NULL DEFAULT 'matched',
  match_score       INTEGER,
  match_reason      JSONB NOT NULL DEFAULT '{}',
  match_breakdown   JSONB,
  resume_variant_id UUID REFERENCES resume_variants(id) ON DELETE SET NULL,
  application_id    UUID REFERENCES applications(id) ON DELETE SET NULL,
  failure_reason    TEXT,
  failed_at         TIMESTAMPTZ,
  approval_expires_at TIMESTAMPTZ,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

ALTER TABLE resume_variants
  ADD CONSTRAINT resume_variants_queue_item_id_fkey
  FOREIGN KEY (queue_item_id) REFERENCES auto_apply_queue_items(id) ON DELETE SET NULL;

CREATE INDEX idx_auto_apply_queue_user_status ON auto_apply_queue_items (user_id, status, created_at DESC);
CREATE INDEX idx_auto_apply_queue_failed_cooldown ON auto_apply_queue_items (user_id, job_id, failed_at)
  WHERE status = 'failed';
CREATE INDEX idx_resume_variants_user_job ON resume_variants (user_id, job_id, created_at DESC);

CREATE TABLE auto_apply_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id        UUID REFERENCES jobs(id) ON DELETE SET NULL,
  queue_item_id UUID REFERENCES auto_apply_queue_items(id) ON DELETE SET NULL,
  event_type    auto_apply_event_type NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auto_apply_events_user_created ON auto_apply_events (user_id, created_at DESC);
CREATE INDEX idx_auto_apply_events_job ON auto_apply_events (job_id, created_at DESC);

CREATE TABLE auto_apply_daily_usage (
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date     DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC'),
  applied_count  INTEGER NOT NULL DEFAULT 0,
  matched_count  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_daily_auto_apply INTEGER NOT NULL DEFAULT 0;

UPDATE plans SET max_daily_auto_apply = 3
WHERE credits = 60 AND price::numeric = 59 AND UPPER(currency) = 'INR' AND is_active = TRUE;

UPDATE plans SET max_daily_auto_apply = 10
WHERE credits = 150 AND price::numeric = 119 AND UPPER(currency) = 'INR' AND is_active = TRUE;

UPDATE plans SET max_daily_auto_apply = 25
WHERE credits = 250 AND price::numeric = 179 AND UPPER(currency) = 'INR' AND is_active = TRUE;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS disallow_auto_apply BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_jobs_auto_apply_eligible ON jobs (status, disallow_auto_apply)
  WHERE deleted_at IS NULL AND status = 'active';

ALTER TABLE applications ADD COLUMN IF NOT EXISTS submission_source VARCHAR(30) NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_applications_submission_source ON applications (submission_source);

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE 'auto_apply_digest';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
