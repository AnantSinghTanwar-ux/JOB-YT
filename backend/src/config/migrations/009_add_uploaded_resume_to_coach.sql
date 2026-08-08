-- Migration to add uploaded resume columns to coach_sessions table
ALTER TABLE coach_sessions
ADD COLUMN IF NOT EXISTS uploaded_resume_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS uploaded_resume_text TEXT;
