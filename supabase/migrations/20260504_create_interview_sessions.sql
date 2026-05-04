-- Migration: create interview_sessions table
-- Date: 2026-05-04
-- Purpose: Stores AI-powered interview prep sessions per user

CREATE TABLE IF NOT EXISTS interview_sessions (
    id               SERIAL PRIMARY KEY,
    user_id          VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cv_id            INTEGER REFERENCES cvs(id) ON DELETE SET NULL,
    job_id           INTEGER REFERENCES saved_jobs(id) ON DELETE SET NULL,

    title            VARCHAR(200),
    questions        JSONB,          -- [{id, type, question, answer, score, feedback, what_worked, what_to_improve}]
    weak_points      JSONB,          -- ["skill gap 1", ...]
    star_stories     JSONB,          -- [{situation, task, action, result, skill}]
    feedback_summary TEXT,
    overall_score    INTEGER,
    status           VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),

    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id
    ON interview_sessions(user_id);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_interview_sessions_updated_at ON interview_sessions;
CREATE TRIGGER set_interview_sessions_updated_at
    BEFORE UPDATE ON interview_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
