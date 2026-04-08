const fs = require('fs');
const path = require('path');
const db = require('./db');

async function migrate() {
    const query = `
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grievance_status') THEN
                CREATE TYPE grievance_status AS ENUM ('raised', 'under_review', 'resolved', 'rejected');
            END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS grievances (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            evaluation_id BIGINT UNIQUE NOT NULL,
            student_id BIGINT NOT NULL,
            status grievance_status DEFAULT 'raised',
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMPTZ,
            CONSTRAINT fk_grievance_evaluation 
                FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
            CONSTRAINT fk_grievance_student 
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );

        ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS grievance_marks DECIMAL(5,2);
    `;

    try {
        await db.query(query);
        console.log("Migration successful: added grievances table and grievance_marks column.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit(0);
    }
}

migrate();
