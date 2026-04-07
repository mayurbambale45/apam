const fs = require('fs');
const path = require('path');

const baseURL = 'http://localhost:3000/api';

async function generateDummyPDF(filename) {
    const pdfContent = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n4 0 obj\n<< /Length 53 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000288 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n390\n%%EOF";
    fs.writeFileSync(filename, pdfContent);
}

async function login(email, password) {
    const res = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
}

async function run() {
    try {
        console.log("1. Generating Dummy PDFs...");
        generateDummyPDF('dummy_model_answer.pdf');
        generateDummyPDF('dummy_student_submission.pdf');

        console.log("2. Logging in as Teacher and Student...");
        const teacherAuth = await login('a.deshpande@walchandsangli.ac.in', 'password123');
        const studentAuth = await login('prn2022027001@walchandsangli.ac.in', 'password123');
        
        const teacherToken = teacherAuth.token;
        const studentToken = studentAuth.token;
        const studentId = studentAuth.user.id;

        console.log("3. Teacher: Creating an Exam...");
        const examRes = await fetch(`${baseURL}/exams/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
            body: JSON.stringify({ course_code: 'CS401', exam_name: 'Compiler Design MVP Test' })
        });
        const examData = await examRes.json();
        if (!examRes.ok) throw new Error(examData.error || 'Exam creation failed');
        const examId = examData.exam.id;
        console.log(`   Exam Created! ID: ${examId}`);

        console.log("4. Teacher: Uploading Model Answer Key PDF...");
        const form1 = new FormData();
        const buffer1 = fs.readFileSync('dummy_model_answer.pdf');
        form1.append('file', new Blob([buffer1], { type: 'application/pdf' }), 'dummy_model_answer.pdf');
        
        const answerRes = await fetch(`${baseURL}/exams/${examId}/model-answer`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${teacherToken}` },
            body: form1
        });
        if (!answerRes.ok) {
            const err = await answerRes.json();
            throw new Error(err.error || 'Model answer upload failed');
        }
        console.log("   Model Answer Uploaded Successfully!");

        console.log("5. Teacher: Configuring Rubric...");
        const rubricData = {
            exam_id: examId,
            questions: [
                { question_number: 1, max_marks: 10, model_answer_text: "A compiler translates code.", mandatory_keywords: ["translate", "code"] }
            ]
        };
        const rubRes = await fetch(`${baseURL}/rubrics/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
            body: JSON.stringify(rubricData)
        });
        if (!rubRes.ok) throw new Error(await rubRes.text());
        console.log("   Rubric Configured!");

        console.log("6. Exam Coordinator / Student: Uploading Student Answer Script PDF...");
        const form2 = new FormData();
        const buffer2 = fs.readFileSync('dummy_student_submission.pdf');
        form2.append('file', new Blob([buffer2], { type: 'application/pdf' }), 'dummy_student_submission.pdf');
        form2.append('exam_id', examId.toString());
        form2.append('student_id', studentId.toString());
        
        const subRes = await fetch(`${baseURL}/submissions/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${studentToken}` },
            body: form2
        });
        const subData = await subRes.json();
        if (!subRes.ok) throw new Error(subData.error || 'Student submission failed');
        const submissionId = subData.submission.id;
        console.log(`   Student Submission Uploaded! ID: ${submissionId}`);

        console.log("7. System: Triggering AI Evaluation...");
        const evalRes = await fetch(`${baseURL}/evaluate/${submissionId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${teacherToken}` }
        });
        const evalData = await evalRes.json();
        if (!evalRes.ok) throw new Error(evalData.error || 'Evaluation failed');
        const evaluationId = evalData.evaluation.id;
        console.log(`   AI Evaluation Completed! Eval ID: ${evaluationId}`);
        console.log(`   Auto-Graded Score: ${evalData.evaluation.total_score}`);

        console.log("8. Teacher: Overriding AI Score...");
        const overrideRes = await fetch(`${baseURL}/dashboard/teacher/override/${evaluationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
            body: JSON.stringify({ totalScore: 8, detailedFeedback: "Adjusted by teacher manually." })
        });
        const overData = await overrideRes.json();
        if (!overrideRes.ok) throw new Error(overData.error || 'Override failed');
        console.log(`   Override Successful! New Score: ${overData.evaluation.total_score}`);

        console.log("\n==================================");
        console.log("✅ ALL MVP CORE STEPS COMPLETED SUCCESSFULLY!");
        console.log("==================================");

    } catch (err) {
        console.error("\n❌ TEST FAILED:");
        console.error(err.message);
    } finally {
        if (fs.existsSync('dummy_model_answer.pdf')) fs.unlinkSync('dummy_model_answer.pdf');
        if (fs.existsSync('dummy_student_submission.pdf')) fs.unlinkSync('dummy_student_submission.pdf');
    }
}

run();
