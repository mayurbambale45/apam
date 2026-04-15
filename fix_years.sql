-- ============================================================
-- APAM: One-time migration to normalize year values + departments
-- Run this ONCE in your PostgreSQL client (pgAdmin / psql)
-- ============================================================

-- 1. Fix year values: old FE/SE/TE/BE → new FY/SY/TY/LY
UPDATE students_profile SET year = 'FY' WHERE year IN ('FE', 'fe', 'First Year');
UPDATE students_profile SET year = 'SY' WHERE year IN ('SE', 'se', 'Second Year');
UPDATE students_profile SET year = 'TY' WHERE year IN ('TE', 'te', 'Third Year');
UPDATE students_profile SET year = 'LY' WHERE year IN ('BE', 'be', 'Last Year', 'Final Year');

-- 2. Normalize "CSE" shorthand to full department name (if any users registered with short names)
UPDATE students_profile SET department = 'Computer Science & Engineering'
    WHERE department IN ('CSE', 'cse', 'Computer Science');

UPDATE students_profile SET department = 'Information Technology'
    WHERE department IN ('IT', 'it');

UPDATE students_profile SET department = 'Electronics & Telecommunication'
    WHERE department IN ('ENTC', 'entc', 'E&TC', 'Electronics');

UPDATE students_profile SET department = 'Electrical Engineering'
    WHERE department IN ('EE', 'ee', 'Electrical');

UPDATE students_profile SET department = 'Mechanical Engineering'
    WHERE department IN ('MECH', 'mech', 'Mechanical');

UPDATE students_profile SET department = 'Civil Engineering'
    WHERE department IN ('CE', 'ce', 'Civil');

UPDATE students_profile SET department = 'Artificial Intelligence & Data Science'
    WHERE department IN ('AIDS', 'aids', 'AI&DS', 'AI & DS');

-- 3. Verify the fix
SELECT year, department, COUNT(*) as student_count
FROM students_profile
GROUP BY year, department
ORDER BY year, department;
