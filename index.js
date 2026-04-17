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

// CORS — allow localhost dev + configurable prod frontend origin
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.) during development
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error('CORS policy: Origin not allowed.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));  // limit JSON body size to 10MB
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

// Health check with basic system info
app.get('/api/health', (req, res) => res.status(200).json({
    status: 'active',
    node: process.version,
    env: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()) + 's'
}));

const fs_node = require('fs');
const initLogPath = path.join(__dirname, 'init.log');

// ── Global Error Handling Middleware ──────────────────────────────────────────
// Must be defined AFTER all routes. Handles both sync and async errors.
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    console.error(`[ERROR] ${req.method} ${req.path} → ${status}:`, err.message);
    if (status === 500) console.error(err.stack);
    if (res.headersSent) return next(err);
    res.status(status).json({
        error: status === 500 ? 'Internal Server Error' : err.message,
        ...(process.env.NODE_ENV !== 'production' && { detail: err.message })
    });
});

// ── Handle uncaught promise rejections gracefully ─────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
    console.error('[PROCESS] Unhandled Rejection:', reason);
    // Log but do not crash — let the request fail normally
});

process.on('uncaughtException', (err) => {
    console.error('[PROCESS] Uncaught Exception:', err);
    // Give time to log then exit cleanly (only for truly fatal errors)
    if (err.code !== 'ECONNRESET') {
        setTimeout(() => process.exit(1), 200);
    }
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

        // ── Smart grievances table migration ──────────────────────────────────
        // Strategy: Safely add missing columns and convert status ENUM to VARCHAR(30)
        await db.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='grievances') THEN
                    -- Safety patch for core columns
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grievances' AND column_name='student_id') THEN
                        ALTER TABLE grievances ADD COLUMN student_id BIGINT DEFAULT 0;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grievances' AND column_name='message') THEN
                        ALTER TABLE grievances ADD COLUMN message TEXT DEFAULT 'No message provided';
                    END IF;

                    -- Fix for: invalid input value for enum grievance_status: "pending"
                    -- We convert the strict enum to a standard VARCHAR
                    BEGIN
                        ALTER TABLE grievances ALTER COLUMN status TYPE VARCHAR(30) USING status::VARCHAR;
                        ALTER TABLE grievances ALTER COLUMN status SET DEFAULT 'pending';
                    EXCEPTION WHEN OTHERS THEN NULL; END;
                END IF;
            END $$;
        `);

        // Re-create (or first-time create) with full correct schema
        await db.query(`
            CREATE TABLE IF NOT EXISTS grievances (
                id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                evaluation_id  BIGINT NOT NULL UNIQUE,
                student_id     BIGINT NOT NULL,
                message        TEXT NOT NULL,
                status         VARCHAR(30) DEFAULT 'pending',
                teacher_marks  DECIMAL(5,2),
                teacher_note   TEXT,
                created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                resolved_at    TIMESTAMPTZ,
                CONSTRAINT fk_grievance_evaluation
                    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
                CONSTRAINT fk_grievance_student
                    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        // ── Safety patch: add any columns that may still be missing ───────────
        await db.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grievances' AND column_name='teacher_marks') THEN
                    ALTER TABLE grievances ADD COLUMN teacher_marks DECIMAL(5,2);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grievances' AND column_name='teacher_note') THEN
                    ALTER TABLE grievances ADD COLUMN teacher_note TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grievances' AND column_name='resolved_at') THEN
                    ALTER TABLE grievances ADD COLUMN resolved_at TIMESTAMPTZ;
                END IF;
            END $$;
        `);
        log('Grievances table: OK');


        // ── Create notifications table if not present ──────────────────────────
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                title       VARCHAR(255) NOT NULL,
                message     TEXT NOT NULL,
                target_role VARCHAR(50) NOT NULL DEFAULT 'all',
                created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);
        log('Notifications table: OK');

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
const server = app.listen(PORT, async () => {
    console.log(`[APAM] Server running on port ${PORT}`);
    console.log(`[APAM] Environment: ${process.env.NODE_ENV || 'development'}`);
    await initSystem();
});

// ── Graceful Shutdown (required for production / Docker) ──────────────────────
const gracefulShutdown = (signal) => {
    console.log(`[APAM] ${signal} received — shutting down gracefully...`);
    server.close(async () => {
        console.log('[APAM] HTTP server closed.');
        try { await db.pool.end(); console.log('[DB] Pool drained.'); } catch (e) {}
        process.exit(0);
    });
    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => { console.error('[APAM] Forced shutdown after timeout.'); process.exit(1); }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

