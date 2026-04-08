-- Migration: Upgrade Pipeline & Add Queue Elements
DO $$
BEGIN
    -- Add extracted_text column to submissions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'submissions' AND column_name = 'extracted_text'
    ) THEN
        ALTER TABLE submissions ADD COLUMN extracted_text TEXT;
    END IF;

    -- Add model_answer_structured to exams
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'exams' AND column_name = 'model_answer_structured'
    ) THEN
        ALTER TABLE exams ADD COLUMN model_answer_structured JSONB;
    END IF;
    
    RAISE NOTICE 'Migration step 1 complete.';
END $$;

-- Create job queue table (PgBoss equivalent for lightweight DB queue)
CREATE TABLE IF NOT EXISTS evaluation_jobs (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL,
    task_type VARCHAR(50) NOT NULL, -- 'extract', 'evaluate'
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_eval_job_submission
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evaluation_jobs_status ON evaluation_jobs(status);
