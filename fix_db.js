const db = require('./db.js');

async function fixDB() {
    try {
        console.log("Starting DB fix...");
        
        // Alter exams
        await db.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT false;`);
        
        // Alter submissions
        await db.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS pipeline_status VARCHAR(50) DEFAULT 'uploaded';`);
        await db.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS error_message TEXT;`);
        await db.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS extracted_text TEXT;`);
        
        // Create pipeline_logs table
        await db.query(`
            CREATE TABLE IF NOT EXISTS pipeline_logs (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
                stage VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL,
                message TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Create evaluation_jobs table
        await db.query(`
            CREATE TABLE IF NOT EXISTS evaluation_jobs (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
                task_type VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                attempts INT DEFAULT 0,
                max_attempts INT DEFAULT 3,
                error_log TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        console.log("DB fix completed successfully.");
    } catch (e) {
        console.error("Error fixing DB:", e);
    } finally {
        process.exit(0);
    }
}

fixDB();
