# 🚀 APAM: Full Project Execution Guide
**Walchand College of Engineering, Sangli - Academic Paper Assessment & Management System**

This guide provides step-by-step instructions to run the APAM project from scratch.

---

## 📋 Prerequisites
Ensure you have the following installed:
- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **Git**

---

## 🛠️ Step 1: Database Setup
1. Open your PostgreSQL query tool (like **pgAdmin 4** or `psql`).
2. Create a new database named `apam`:
   ```sql
   CREATE DATABASE apam;
   ```
3. Open the file `database_schema.sql` from the project root.
4. Copy the entire content of `database_schema.sql` and execute it in your `apam` database.
   - This will create all tables (Users, Exams, Submissions, Rubrics, Evaluations) and seed the initial data for WCE Sangli.

---

## ⚙️ Step 2: Backend Configuration
1. Navigate to the project root directory:
   ```bash
   cd d:\PROJECTS\APAM
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create or update the `.env` file in the root directory with your credentials:
   ```env
   PORT=3000
   DATABASE_URL=postgres://postgres:your_db_password@localhost:5432/apam
   JWT_SECRET=your_super_secret_key_123
   GEMINI_API_KEY=your_actual_gemini_api_key
   ```
   > [!IMPORTANT]
   > You **must** provide a valid `GEMINI_API_KEY`. Without it, the AI evaluation pipeline and the "Auto-Generate Rubric" feature will fail.

4. Start the backend server:
   ```bash
   npm start
   ```
   - The server will run on `http://localhost:3000`.
   - On startup, it will automatically register the "Exam Cell" account.

---

## 💻 Step 3: Frontend Setup
1. In a new terminal, navigate to the frontend directory:
   ```bash
   cd d:\PROJECTS\APAM\frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and go to `http://localhost:5173`.

---

## 🔑 Step 4: Login Credentials
You can log in using the following accounts (seeded via `database_schema.sql`):


---

## 🔄 Step 5: End-to-End Workflow Testing
To verify the system is working fully, follow this path:

1. **Exam Cell:** Login, go to **Manage Exams**, and ensure an exam is created/assigned to a Faculty.
2. **Faculty:** Login, go to **Configure Rubrics**. Select the exam and use **"Generate from Answer Key"** (requires a previous upload of the model answer key) or enter manually.
3. **Exam Cell:** Go to **Pipeline Monitor**, upload student answer scripts (PDFs), and click **"Start AI Pipeline"**.
4. **Monitor:** Watch the backend logs or the UI status change from `Uploaded` ➔ `Evaluating` ➔ `Graded`.
5. **Student:** Login and view the detailed **AI Feedback Report** with question-by-question scoring.

---

### 🛠️ Troubleshooting
- **API Errors:** Ensure the backend is running and the `.env` file contains correct DB credentials.
- **AI Failures:** Check the terminal console for `429 (Rate Limit)` or `401 (Invalid Key)` errors related to Gemini.
- **Dark Mode:** Use the toggle in the dashboard sidebar to switch themes.

---
**Developed for WCE Sangli by Antigravity AI**

----------------------------------------------------------------

**⚙️ How the Pipeline Works in the Background (The Flowchart)
When you hit "Run Evaluation Pipeline", you trigger a massive asynchronous background task. Here is exactly what happens step-by-step behind the scenes:**

Step 1: Pre-Computation (The Setup)
Fetch Submissions: The system queries the PostgreSQL database for all students attached to this exam who have an uploaded answer sheet but haven't been evaluated yet.
Fetch Rubric: The system fetches the Master Answer Key text (uploaded by the faculty).
Structure Answer Key (AI): If the faculty uploaded raw text for the master key, the backend sends it to the llama-3.3-70b model to intelligently parse it into a strict JSON array (pulling apart question numbers, expected answers, and keywords).
Step 2: The Core Pipeline Loop (Runs per student)
The backend iterates over the unpaid/unevaluated student answer sheets one by one. For each sheet:

🔄 Stage 1: Text Extraction (OCR)
If the file is a Digital PDF, the backend uses the local lightweight pdf-parse library to extract raw strings immediately.
If the file is an Image (JPG/PNG), the file is converted to a base64 string and sent over the wire to Groq's high-power llama-3.2-90b-vision engine, which "looks" at the handwritten/scanned paper and precisely transcribes it to digital text.
🔄 Stage 2: Semantic Grading (Evaluation)
The transcribed student text, alongside the structured Master JSON Key, is shipped to llama-3.3-70b-versatile under a rigid prompt (the one I just relaxed for you).
The AI conceptually compares the student's text against the faculty's answer, deciding the score and formulating personalized feedback.
🔄 Stage 3: Data Persistence
The AI's response is validated. The backend then updates the submissions table in your database, recording the score, full textual feedback, and switching the status to evaluated.
Step 3: Quota Preservation & Error Handling
Because the Groq Cloud API limits requests per minute, the system relies on an Exponential Backoff Wrapper: If Groq responds with 429 (Too Many Requests) during the loop, the system dynamically pauses (waiting 1.5s, then 3s, then 6s) before retrying that student's paper, ensuring your pipeline never crashes mid-way just because the API choked.

Step 4: Completion
Once the loop finishes, the evaluation_jobs status is marked as completed and the UI Monitor unlocks the Publish Results button. Faculty and Exam Cell admins can then review the generated scores before publishing them to the student dashboards.

*****

roject Presentation: APAM (AI-Powered Answer sheet Marker)
1. Project Overview
APAM is an automated academic evaluation system designed for institutional use (like Walchand College of Engineering). It bridges the gap between physical handwritten examinations and digital grading. The system uses Vision AI and Large Language Models (LLMs) to transcribe handwritten answer sheets, evaluate them against a teacher-defined rubric, and provide detailed, question-wise feedback with scores.

Key Stakeholders:
Students: Upload answer sheets, view detailed AI feedback, and raise grievances.
Faculty (Teachers): Create exams, define answer keys/rubrics, and oversee AI-generated grades.
Exam Cell (Admin): Monitor system-wide performance, manage users, and publish official results.
2. Background Process (The "Magic" Under the Hood)
When a student uploads a file, the system triggers a complex AI Evaluation Pipeline:

OCR & Vision Processing:
The system uses the Groq Llama 4 Scout (Vision) model.
If the image is handwritten, the AI transcribes the pixels into raw text while maintaining the structure (Question numbers, headings).
Fallback Logic: If Groq fails, a secondary call to Gemini 2.0 Flash is made to ensure zero downtime.
Semantic Rubric Matching:
Instead of just looking for keywords (which traditional systems do), APAM uses Semantic Analysis. It understands the meaning of the student's answer even if they use different words than the model answer.
The "Generosity Engine" (Fairness Logic):
To mimic a human teacher, the system enforces a Minimum Score Floor (30%). If a student attempts a question and shows relevance, the AI is instructed not to give a zero mark.
It applies a lenient grading scale: Attempt = 30%, Partial = 60%, Correct = 100%.
Feedback Synthesis:
The AI generates constructive feedback for every question, identifying exactly what points were missed and how to improve.
3. Technical Stack
Frontend: React (Vite) with Vanilla CSS (Tailwind logic) for a premium, responsive UI.
Backend: Node.js & Express.
Database: PostgreSQL (Relational) – chosen for ACID compliance and structured academic records.
AI Engines: Groq Llama 3.3 (Text), Llama 4 Scout (Vision), and Gemini (Fallback).
4. Deployment Plan
Database Deployment:
Option A (Recommended): Supabase or Aiven. These provide managed PostgreSQL instances with high availability and easy backups.
Migration Strategy: The project includes "Idempotent Migrations" in index.js, meaning as soon as you connect a fresh DB, the system automatically creates all tables, enums, and seed data (like the Exam Cell account).
Application Deployment:
Backend (API): Render or Railway.app. These support Node.js and can handle long-running requests for AI processing.
Frontend: Vercel or Netlify. These provide specialized edge delivery for React apps.
File Storage: Currently uses local /uploads. For production, this should be moved to Cloudinary or AWS S3 to handle high-volume PDF/Image storage.
5. Production Readiness Assessment
Current Status: Advanced Prototype / Beta-Ready.

Why it is ready for trial:
Grievance Handling: It has a "Human-in-the-loop" system. If the AI makes a mistake, the student raises a grievance, and the teacher can override the marks with one click.
Security: Uses JWT (JSON Web Tokens) for role-based access control (RBAC).
Standardization: Use of PRN numbers, specific PRN formats, and Walchand College-specific roles.
What it needs before 100% Production deployment:
Load Testing: Testing handle-ability when 1000+ students upload at the same time.
Advanced OCR: While Vision AI is good, cursive handwriting remains a challenge; a specialized OCR layer (like Google Document AI) could be added for better precision.
6. Future Scope & Improvements
Diagram Recognition: Improving the AI's ability to grade hand-drawn flowcharts and circuit diagrams.
Plagiarism Detection: Comparing student texts with each other to flag copied answers.
Multi-Language Support: Evaluating answers written in regional languages.
ERP Integration: Directly syncing marks with the college’s main ERP/MIS system.