require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exams');
const submissionRoutes = require('./routes/submissions');
const rubricRoutes = require('./routes/rubrics');
const evaluationRoutes = require('./routes/evaluations');
const dashboardRoutes = require('./routes/dashboards');
const adminRoutes = require('./routes/admin');
const pipelineRoutes = require('./routes/pipeline');
const notificationRoutes = require('./routes/notifications');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();

// Set security HTTP headers
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Required to serve images/pdfs via static folder correctly

// Development logging
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Global API Rate Limiting to prevent brute-force and DDoS
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // Increased limit to allow frontend polling for pipeline status
    message: 'Too many requests from this IP, please try again after 15 minutes.'
});
app.use('/api/', apiLimiter);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/rubrics', rubricRoutes);
app.use('/api/evaluate', evaluationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/pipeline', pipelineRoutes);

// Standardize result messages
app.get('/api/health', (req, res) => res.status(200).json({ status: 'active', node: process.version }));

const fs_node = require('fs');
const initLogPath = path.join(__dirname, 'init.log');

// Global Error Handling Middleware - Standard for Enterprise applications
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
});

/**
 * System Initialization: Ensures critical accounts exist and have correct passwords on startup.
 * Role: Exam Cell, administrator
 */
async function initSystem() {
    const log = (msg) => {
        console.log(msg);
        fs_node.appendFileSync(initLogPath, `[${new Date().toISOString()}] ${msg}\n`);
    };
    
    log('--- SYSTEM INITIALIZATION PHASE ---');
    try {
        // ── Idempotent schema migration — runs on every startup, safe to repeat ──
        await db.query(`
            DO $$
            BEGIN
                -- submissions: pipeline tracking columns
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='pipeline_status') THEN
                    ALTER TABLE submissions ADD COLUMN pipeline_status VARCHAR(30) DEFAULT 'uploaded';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='extracted_text') THEN
                    ALTER TABLE submissions ADD COLUMN extracted_text TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='error_message') THEN
                    ALTER TABLE submissions ADD COLUMN error_message TEXT;
                END IF;

                -- exams: result publishing + model answer structured storage
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exams' AND column_name='results_published') THEN
                    ALTER TABLE exams ADD COLUMN results_published BOOLEAN DEFAULT false;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exams' AND column_name='model_answer_structured') THEN
                    ALTER TABLE exams ADD COLUMN model_answer_structured JSONB;
                END IF;
            END $$;
        `);

        // ── Create pipeline_logs table if not present ──────────────────────────
        await db.query(`
            CREATE TABLE IF NOT EXISTS pipeline_logs (
                id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                submission_id BIGINT NOT NULL,
                stage       VARCHAR(50) NOT NULL,
                status      VARCHAR(30) NOT NULL,
                message     TEXT,
                created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ── Create evaluation_jobs table if not present ────────────────────────
        await db.query(`
            CREATE TABLE IF NOT EXISTS evaluation_jobs (
                id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                submission_id BIGINT NOT NULL,
                task_type     VARCHAR(50) DEFAULT 'extract_and_evaluate',
                status        VARCHAR(30) DEFAULT 'pending',
                attempts      INTEGER DEFAULT 0,
                max_attempts  INTEGER DEFAULT 3,
                error_log     TEXT,
                created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Check/Seed Exam Cell
        const hashedExamcell = await bcrypt.hash('examcell', 12);
        
        // Finalize role standardization in DB
        log('Standardizing user_role enum values...');
        try {
            await db.query(`
                DO $$
                BEGIN
                    -- Add any missing enum values (no-op if already exist)
                    BEGIN ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'administrator'; EXCEPTION WHEN OTHERS THEN NULL; END;
                    BEGIN ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Exam Cell'; EXCEPTION WHEN OTHERS THEN NULL; END;
                    BEGIN ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Faculty'; EXCEPTION WHEN OTHERS THEN NULL; END;
                    BEGIN ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'student'; EXCEPTION WHEN OTHERS THEN NULL; END;
                END $$;
            `);
        } catch (e) { log('Enum update notice: ' + e.message); }

        const examcellRes = await db.query("SELECT id FROM users WHERE email = 'examcell'");
        
        if (examcellRes.rows.length === 0) {
            log('Seeding Exam Cell account...');
            await db.query(
                "INSERT INTO users (email, password_hash, full_name, role) VALUES ('examcell', $1, 'APAM Exam Cell', 'Exam Cell')",
                [hashedExamcell]
            );
            log('Exam Cell seeded successfully.');
        } else {
            log('Updating Exam Cell account...');
            await db.query("UPDATE users SET password_hash = $1, role = 'Exam Cell' WHERE email = 'examcell'", [hashedExamcell]);
            log('Exam Cell account synchronized.');
        }

        // Check/Seed Admin if totally empty
        const adminRes = await db.query("SELECT id FROM users WHERE role = 'administrator' LIMIT 1");
        if (adminRes.rows.length === 0) {
            log('Seeding default administrator...');
            const hashedAdmin = await bcrypt.hash('password123', 12);
            await db.query(
                "INSERT INTO users (email, password_hash, full_name, role) VALUES ('admin@walchandsangli.ac.in', $1, 'System Admin', 'administrator')",
                [hashedAdmin]
            );
            log('Admin seeded.');
        }
        
        log('Identity Layer: OK');
    } catch (e) {
        log(`CRITICAL INITIALIZATION ERROR: ${e.message}`);
    }
    log('------------------------------------');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await initSystem();
});
