-- =========================================================
-- APAM Database Schema
-- Walchand College of Engineering, Sangli
-- Academic Paper Assessment & Management System
-- =========================================================
-- USAGE: Paste this ENTIRE script into pgAdmin Query Tool
-- and execute. It will cleanly drop existing objects first.
-- =========================================================

-- ==========================================
-- CLEANUP: Drop existing objects safely
-- ==========================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS rubric_questions CASCADE;
DROP TABLE IF EXISTS rubrics CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS students_profile CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop ENUM types
DROP TYPE IF EXISTS submission_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ==========================================
-- MODULE 1: User Identity & Roles
-- Walchand College of Engineering, Sangli
-- ==========================================

-- Create an ENUM type for user roles to ensure data integrity
CREATE TYPE user_role AS ENUM (
    'administrator', 
    'examination_system', 
    'teacher', 
    'student'
);

-- Create the central users table
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create the students_profile table, linked directly to the users table
-- PRN (Permanent Registration Number) is the primary student identifier at WCE Sangli
CREATE TABLE students_profile (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    prn_number VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(150) NOT NULL,
    year VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Create indices to perform faster lookups on frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_roll_number ON students_profile(roll_number);
CREATE INDEX idx_students_prn_number ON students_profile(prn_number);

-- ==========================================
-- MODULE 2: Examination Ingestion & Linking
-- ==========================================

-- Create the exams table
CREATE TABLE exams (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL,
    exam_name VARCHAR(255) NOT NULL,
    model_answer_path VARCHAR(1024), -- Path to the teacher's model answer PDF
    created_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_exam_creator 
        FOREIGN KEY (created_by) 
        REFERENCES users(id) 
        ON DELETE RESTRICT
);

-- Create an ENUM type for submission status
CREATE TYPE submission_status AS ENUM ('uploaded', 'processing', 'graded');

-- Create the submissions table
CREATE TABLE submissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exam_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    status submission_status DEFAULT 'uploaded',
    upload_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_submission_exam 
        FOREIGN KEY (exam_id) 
        REFERENCES exams(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_submission_student 
        FOREIGN KEY (student_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Create indices for performance
CREATE INDEX idx_exams_created_by ON exams(created_by);
CREATE INDEX idx_submissions_exam_id ON submissions(exam_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);

-- ==========================================
-- MODULE 3: Instructor Configuration & Rubric
-- ==========================================

-- Create the rubrics table
CREATE TABLE rubrics (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exam_id BIGINT UNIQUE NOT NULL, -- One exam has exactly one rubric
    teacher_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rubric_exam 
        FOREIGN KEY (exam_id) 
        REFERENCES exams(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_rubric_teacher 
        FOREIGN KEY (teacher_id) 
        REFERENCES users(id) 
        ON DELETE RESTRICT
);

-- Create the rubric_questions table
CREATE TABLE rubric_questions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rubric_id BIGINT NOT NULL,
    question_number INTEGER NOT NULL,
    max_marks INTEGER NOT NULL,
    model_answer_text TEXT NOT NULL,
    mandatory_keywords JSONB, -- Optional array of keywords
    CONSTRAINT fk_rubric_questions_rubric 
        FOREIGN KEY (rubric_id) 
        REFERENCES rubrics(id) 
        ON DELETE CASCADE
);

-- Indices for faster rubric fetching
CREATE INDEX idx_rubrics_exam_id ON rubrics(exam_id);
CREATE INDEX idx_rubric_questions_rubric_id ON rubric_questions(rubric_id);

-- ==========================================
-- MODULE 4: Core AI Evaluation Engine
-- ==========================================

-- Create the evaluations table to store AI grades
CREATE TABLE evaluations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    submission_id BIGINT UNIQUE NOT NULL, -- One submission has one evaluation result
    total_score DECIMAL(5,2) NOT NULL,
    detailed_feedback JSONB NOT NULL,
    confidence_flag BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evaluations_submission 
        FOREIGN KEY (submission_id) 
        REFERENCES submissions(id) 
        ON DELETE CASCADE
);

-- Index for fast lookup by submission_id
CREATE INDEX idx_evaluations_submission_id ON evaluations(submission_id);


-- =========================================================
-- SEED DATA: Walchand College of Engineering, Sangli
-- Autonomous Institute affiliated to Shivaji University, Kolhapur
-- =========================================================
-- NOTE: All passwords below are 'password123' hashed with bcrypt (12 rounds).
-- You can regenerate this hash by running:
--   node -e "require('bcrypt').hash('password123',12).then(h=>console.log(h))"
-- =========================================================

-- The bcrypt hash for 'password123'
-- $2b$12$LJ3a4sHVJGlP1aFBFe2pxOCXl7KQJtB3bVOmRfDhB.9rAD2/m9aHW

DO $$
DECLARE
    pwd_hash TEXT := '$2b$12$LJ3a4sHVJGlP1aFBFe2pxOCXl7KQJtB3bVOmRfDhB.9rAD2/m9aHW';
    admin_id BIGINT;
    coordinator_id BIGINT;
    t_cse_id BIGINT;
    t_it_id BIGINT;
    t_entc_id BIGINT;
    t_mech_id BIGINT;
    -- Students (2 per department = 14 students across 7 branches)
    s_cse1 BIGINT; s_cse2 BIGINT;
    s_it1 BIGINT; s_it2 BIGINT;
    s_entc1 BIGINT; s_entc2 BIGINT;
    s_ee1 BIGINT; s_ee2 BIGINT;
    s_mech1 BIGINT; s_mech2 BIGINT;
    s_civil1 BIGINT; s_civil2 BIGINT;
    s_aids1 BIGINT; s_aids2 BIGINT;
BEGIN

    -- ==========================================
    -- USERS: Administration & Exam Cell
    -- ==========================================
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('admin@walchandsangli.ac.in', pwd_hash, 'Dr. R. K. Jain', 'administrator')
    RETURNING id INTO admin_id;

    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('examcell@walchandsangli.ac.in', pwd_hash, 'Prof. S. M. Patil', 'examination_system')
    RETURNING id INTO coordinator_id;

    -- ==========================================
    -- USERS: Faculty (Teachers across departments)
    -- ==========================================
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('a.deshpande@walchandsangli.ac.in', pwd_hash, 'Prof. A. V. Deshpande', 'teacher')
    RETURNING id INTO t_cse_id;

    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('s.kulkarni@walchandsangli.ac.in', pwd_hash, 'Prof. S. R. Kulkarni', 'teacher')
    RETURNING id INTO t_it_id;

    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('p.joshi@walchandsangli.ac.in', pwd_hash, 'Prof. P. D. Joshi', 'teacher')
    RETURNING id INTO t_entc_id;

    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('v.bhosale@walchandsangli.ac.in', pwd_hash, 'Prof. V. S. Bhosale', 'teacher')
    RETURNING id INTO t_mech_id;

    -- ==========================================
    -- USERS: Students (All 7 WCE Sangli Departments)
    -- ==========================================

    -- Computer Science & Engineering
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022027001@walchandsangli.ac.in', pwd_hash, 'Aarav Sharma', 'student')
    RETURNING id INTO s_cse1;
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022027002@walchandsangli.ac.in', pwd_hash, 'Sneha Deshmukh', 'student')
    RETURNING id INTO s_cse2;

    -- Information Technology
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022027003@walchandsangli.ac.in', pwd_hash, 'Rohan Patil', 'student')
    RETURNING id INTO s_it1;
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022027004@walchandsangli.ac.in', pwd_hash, 'Priya Kulkarni', 'student')
    RETURNING id INTO s_it2;

    -- Electronics & Telecommunication
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022044001@walchandsangli.ac.in', pwd_hash, 'Vaibhav Jadhav', 'student')
    RETURNING id INTO s_entc1;
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022044002@walchandsangli.ac.in', pwd_hash, 'Ananya More', 'student')
    RETURNING id INTO s_entc2;

    -- Electrical Engineering
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022037001@walchandsangli.ac.in', pwd_hash, 'Aditya Shinde', 'student')
    RETURNING id INTO s_ee1;
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022037002@walchandsangli.ac.in', pwd_hash, 'Rutuja Pawar', 'student')
    RETURNING id INTO s_ee2;

    -- Mechanical Engineering
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022066001@walchandsangli.ac.in', pwd_hash, 'Saurabh Gaikwad', 'student')
    RETURNING id INTO s_mech1;
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022066002@walchandsangli.ac.in', pwd_hash, 'Neha Mane', 'student')
    RETURNING id INTO s_mech2;

    -- Civil Engineering
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022012001@walchandsangli.ac.in', pwd_hash, 'Omkar Salunkhe', 'student')
    RETURNING id INTO s_civil1;
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022012002@walchandsangli.ac.in', pwd_hash, 'Sakshi Chavan', 'student')
    RETURNING id INTO s_civil2;

    -- Artificial Intelligence & Data Science
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022004001@walchandsangli.ac.in', pwd_hash, 'Arjun Kadam', 'student')
    RETURNING id INTO s_aids1;
    INSERT INTO users (email, password_hash, full_name, role) VALUES
        ('prn2022004002@walchandsangli.ac.in', pwd_hash, 'Diya Nikam', 'student')
    RETURNING id INTO s_aids2;

    -- ==========================================
    -- STUDENT PROFILES: PRN & Department Details
    -- PRN Format: Year + Branch Code + Serial
    -- Branch Codes: 027=CSE, 044=E&TC, 037=EE, 066=Mech, 012=Civil, 004=AI&DS
    -- ==========================================
    INSERT INTO students_profile (user_id, roll_number, prn_number, department, year) VALUES
        (s_cse1,   'CSE-301',  '2022027001', 'Computer Science & Engineering',       'TE'),
        (s_cse2,   'CSE-302',  '2022027002', 'Computer Science & Engineering',       'TE'),
        (s_it1,    'IT-301',   '2022027003', 'Information Technology',               'TE'),
        (s_it2,    'IT-302',   '2022027004', 'Information Technology',               'TE'),
        (s_entc1,  'ENTC-301', '2022044001', 'Electronics & Telecommunication',      'TE'),
        (s_entc2,  'ENTC-302', '2022044002', 'Electronics & Telecommunication',      'TE'),
        (s_ee1,    'EE-301',   '2022037001', 'Electrical Engineering',               'TE'),
        (s_ee2,    'EE-302',   '2022037002', 'Electrical Engineering',               'TE'),
        (s_mech1,  'MECH-301', '2022066001', 'Mechanical Engineering',               'TE'),
        (s_mech2,  'MECH-302', '2022066002', 'Mechanical Engineering',               'TE'),
        (s_civil1, 'CE-301',   '2022012001', 'Civil Engineering',                    'TE'),
        (s_civil2, 'CE-302',   '2022012002', 'Civil Engineering',                    'TE'),
        (s_aids1,  'AIDS-301', '2022004001', 'Artificial Intelligence & Data Science','TE'),
        (s_aids2,  'AIDS-302', '2022004002', 'Artificial Intelligence & Data Science','TE');

    -- ==========================================
    -- EXAMS: Sample Course Papers (multi-department)
    -- ==========================================
    INSERT INTO exams (course_code, exam_name, created_by) VALUES
        ('CS304', 'Database Management Systems - MSE-I', t_cse_id),
        ('CS302', 'Operating Systems - MSE-I', t_cse_id),
        ('IT305', 'Computer Networks - MSE-I', t_it_id),
        ('ENTC301', 'Digital Signal Processing - MSE-I', t_entc_id),
        ('ME303', 'Thermodynamics - MSE-I', t_mech_id);

    RAISE NOTICE '================================================';
    RAISE NOTICE 'SEED DATA INSERTED SUCCESSFULLY';
    RAISE NOTICE 'Walchand College of Engineering, Sangli - APAM';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Login Credentials (all passwords: password123):';
    RAISE NOTICE '  Admin:       admin@walchandsangli.ac.in';
    RAISE NOTICE '  Exam Cell:   examcell@walchandsangli.ac.in';
    RAISE NOTICE '  Teacher CSE: a.deshpande@walchandsangli.ac.in';
    RAISE NOTICE '  Teacher IT:  s.kulkarni@walchandsangli.ac.in';
    RAISE NOTICE '  Teacher ENTC:p.joshi@walchandsangli.ac.in';
    RAISE NOTICE '  Teacher MECH:v.bhosale@walchandsangli.ac.in';
    RAISE NOTICE '------------------------------------------------';
    RAISE NOTICE '  CSE Student: prn2022027001@walchandsangli.ac.in';
    RAISE NOTICE '  IT Student:  prn2022027003@walchandsangli.ac.in';
    RAISE NOTICE '  ENTC Student:prn2022044001@walchandsangli.ac.in';
    RAISE NOTICE '  EE Student:  prn2022037001@walchandsangli.ac.in';
    RAISE NOTICE '  MECH Student:prn2022066001@walchandsangli.ac.in';
    RAISE NOTICE '  CIVIL Student:prn2022012001@walchandsangli.ac.in';
    RAISE NOTICE '  AIDS Student:prn2022004001@walchandsangli.ac.in';
    RAISE NOTICE '================================================';

END $$;
