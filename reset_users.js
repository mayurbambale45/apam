const bcrypt = require('bcrypt');
const db = require('./db');

/**
 * Reset & Seed Script for WCE Sangli APAM System
 * Run with: node reset_users.js
 * All passwords set to: password123
 */
async function resetAndSeed() {
    try {
        console.log('🔐 Generating bcrypt hash for "password123"...');
        const hash = await bcrypt.hash('password123', 12);

        console.log('🗑️  Clearing existing data...');
        await db.query('TRUNCATE TABLE users CASCADE');
        console.log('   ✓ Cleared users and all linked data.');

        // ==========================================
        // Insert Staff & Faculty
        // ==========================================
        console.log('👥 Inserting WCE Sangli users...');

        const adminResult = await db.query(
            `INSERT INTO users (email, password_hash, full_name, role) VALUES 
             ('admin@walchandsangli.ac.in', $1, 'Dr. R. K. Jain', 'administrator') RETURNING id`, [hash]
        );
        const adminId = adminResult.rows[0].id;

        const coordResult = await db.query(
            `INSERT INTO users (email, password_hash, full_name, role) VALUES 
             ('examcell@walchandsangli.ac.in', $1, 'Prof. S. M. Patil', 'examination_system') RETURNING id`, [hash]
        );

        const teacher1Result = await db.query(
            `INSERT INTO users (email, password_hash, full_name, role) VALUES 
             ('a.deshpande@walchandsangli.ac.in', $1, 'Prof. A. V. Deshpande', 'teacher') RETURNING id`, [hash]
        );
        const teacher1Id = teacher1Result.rows[0].id;

        const teacher2Result = await db.query(
            `INSERT INTO users (email, password_hash, full_name, role) VALUES 
             ('s.kulkarni@walchandsangli.ac.in', $1, 'Prof. S. R. Kulkarni', 'teacher') RETURNING id`, [hash]
        );

        // ==========================================
        // Insert Students
        // ==========================================
        const students = [
            { email: 'prn2022027001@walchandsangli.ac.in', name: 'Aarav Sharma', roll: 'CS-301', prn: '2022027001', dept: 'Computer Science & Engineering', year: 'TE' },
            { email: 'prn2022027002@walchandsangli.ac.in', name: 'Sneha Deshmukh', roll: 'CS-302', prn: '2022027002', dept: 'Computer Science & Engineering', year: 'TE' },
            { email: 'prn2022027003@walchandsangli.ac.in', name: 'Rohan Patil', roll: 'CS-303', prn: '2022027003', dept: 'Computer Science & Engineering', year: 'TE' },
            { email: 'prn2022027004@walchandsangli.ac.in', name: 'Priya Kulkarni', roll: 'IT-301', prn: '2022027004', dept: 'Information Technology', year: 'TE' },
            { email: 'prn2022027005@walchandsangli.ac.in', name: 'Vaibhav Jadhav', roll: 'IT-302', prn: '2022027005', dept: 'Information Technology', year: 'TE' },
            { email: 'prn2022027006@walchandsangli.ac.in', name: 'Ananya More', roll: 'IT-303', prn: '2022027006', dept: 'Information Technology', year: 'TE' },
        ];

        for (const s of students) {
            const result = await db.query(
                `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, 'student') RETURNING id`,
                [s.email, hash, s.name]
            );
            await db.query(
                `INSERT INTO students_profile (user_id, roll_number, prn_number, department, year) VALUES ($1, $2, $3, $4, $5)`,
                [result.rows[0].id, s.roll, s.prn, s.dept, s.year]
            );
        }
        console.log('   ✓ Inserted 6 students with profiles.');

        // ==========================================
        // Insert Sample Exams
        // ==========================================
        await db.query(
            `INSERT INTO exams (course_code, exam_name, created_by) VALUES
             ('CS304', 'Database Management Systems - MSE-I', $1),
             ('CS302', 'Operating Systems - MSE-I', $1),
             ('IT305', 'Computer Networks - MSE-I', $2)`,
            [teacher1Id, teacher2Result?.rows[0]?.id || teacher1Id]
        );
        console.log('   ✓ Inserted 3 sample exams.');

        console.log('\n✅ SEED COMPLETE! Login credentials (all passwords: password123):');
        console.log('   Admin:      admin@walchandsangli.ac.in');
        console.log('   Exam Cell:  examcell@walchandsangli.ac.in');
        console.log('   Teacher 1:  a.deshpande@walchandsangli.ac.in');
        console.log('   Teacher 2:  s.kulkarni@walchandsangli.ac.in');
        console.log('   Students:   prn2022027001@walchandsangli.ac.in through prn2022027006@walchandsangli.ac.in');

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        process.exit(0);
    }
}

resetAndSeed();
