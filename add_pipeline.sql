-- Migration: Exam Cell Pipeline Enhancements
-- Run this in pgAdmin Query Tool

DO $$
BEGIN
    -- Add pipeline_status column to submissions if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'submissions' AND column_name = 'pipeline_status'
    ) THEN
        ALTER TABLE submissions ADD COLUMN pipeline_status VARCHAR(30) DEFAULT 'uploaded';
    END IF;

    -- Add error_message column to submissions if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'submissions' AND column_name = 'error_message'
    ) THEN
        ALTER TABLE submissions ADD COLUMN error_message TEXT;
    END IF;

    -- Add results_published column to exams if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'exams' AND column_name = 'results_published'
    ) THEN
        ALTER TABLE exams ADD COLUMN results_published BOOLEAN DEFAULT false;
    END IF;

    RAISE NOTICE 'Migration complete: pipeline columns added.';
END $$;

-- Create pipeline_logs table for detailed error and event tracking
CREATE TABLE IF NOT EXISTS pipeline_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    submission_id BIGINT NOT NULL,
    stage VARCHAR(50) NOT NULL,  -- 'upload', 'evaluate', 're-evaluate'
    status VARCHAR(30) NOT NULL, -- 'started', 'completed', 'failed'
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pipeline_log_submission
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pipeline_logs_submission_id ON pipeline_logs(submission_id);
