require('dotenv').config();
const { Pool } = require('pg');
const db = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

async function check() {
    try {
        const query = `
            SELECT
                g.id AS "grievanceId",
                g.evaluation_id AS "evaluationId",
                g.message,
                g.status,
                g.teacher_marks AS "teacherMarks",
                g.teacher_note AS "teacherNote",
                g.created_at AS "raisedAt",
                g.resolved_at AS "resolvedAt",
                u.full_name AS "studentName",
                sp.prn_number AS "prnNumber",
                sp.roll_number AS "rollNumber",
                ex.exam_name AS "examName",
                ex.course_code AS "courseCode",
                ev.total_score AS "currentScore"
            FROM grievances g
            JOIN users u ON g.student_id = u.id
            LEFT JOIN students_profile sp ON u.id = sp.user_id
            JOIN evaluations ev ON g.evaluation_id = ev.id
            JOIN submissions s ON ev.submission_id = s.id
            JOIN exams ex ON s.exam_id = ex.id
            ORDER BY g.created_at DESC
        `;
        const res = await db.query(query);
        console.log("Query success! Rows:", res.rows.length);
        process.exit(0);
    } catch (e) {
        console.error("EXACT ERROR MESSAGE:", e.message);
        process.exit(1);
    }
}
check();
