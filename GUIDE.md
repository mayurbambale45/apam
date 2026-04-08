# AI-Based Answer Script Evaluation System — Complete Guide

Welcome to the **Answer Script Evaluation System**, a comprehensive platform built on the PERN stack (PostgreSQL, Express, React, Node.js) integrated with the Gemini AI Vision model. This system provides an automated pipeline for evaluating handwritten and printed college examination sheets using an intelligent OCR/Extraction and multi-parameter Rubric evaluation.

---

## 🚀 How to Run the Program

The application runs in two parts: a Node.js API backend and a Vite+React frontend.

### Prerequisites
1. **Node.js** (v18+ recommended)
2. **PostgreSQL** (v14+ recommended)
3. **Gemini API Key** (Set up via Google AI Studio)

### 1. Database Setup
Ensure PostgreSQL is running locally on port `5432` with a database name of your choice (e.g., `answer_evaluation_db`).
The system uses `database_schema.sql` and `upgrade_pipeline.sql` for structure. (This is already applied to your setup, but for fresh installations, you would run those scripts).

### 2. Configure Environment Variables
Inside the `d:\PROJECTS\APAM` folder, there should be a `.env` file containing:
```
PORT=3000
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=answer_evaluation_db
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start the Backend Server
Open a terminal in the root directory (`d:\PROJECTS\APAM`) and run:
```bash
npm install
node index.js
```
*The server will start on port 3000.*

### 4. Start the Frontend Application
Open a **second terminal** and navigate to the `frontend` folder:
```bash
cd d:\PROJECTS\APAM\frontend
npm install
npm run dev
```
*The local development server will start on port 5173. Open your browser to `http://localhost:5173`.*

---

## 🌟 Overall Features Guide

The platform is strictly role-based, granting specific features to specific users (Role definitions: P = Administrator, E = Exam Cell, T = Teacher, S = Student).

### 1. The Exam Cell Module (Role: `examination_system`)
The Exam Cell is the "Global Control Center" of the evaluation pipeline.
* **Dashboard Overview:** Monitor high-level statistics like Total Submissions, Pending Pipelines, and Failed Uploads.
* **Bulk Upload:** Drag and Drop multiple student answer PDFs at once. The system will automatically detect student PRN numbers from filenames (e.g., `2022027001_John.pdf`). Orphaned files can be manually connected.
* **Pipeline Monitor (Background Queue):** Once uploaded, the Exam coordinator presses **Run Pipeline**. This triggers an asynchronous queue that pulls jobs continuously:
   * 🔄 *Uploading*
   * 🔍 *Extracting Text (Gemini Vision)*
   * 🤖 *Evaluating Logic (Gemini Engine)*
   * ✅ *Completed*
* **Publish Mechanism:** The coordinator controls the ultimate visibility of the results. Toggling "Publish Results" updates the exams to visible for students.

### 2. The Instructor Module (Role: `teacher`)
The teacher governs the logic of the exam.
* **Exam Creation & Management:** Create new examination courses and assign maximum marks.
* **Automated Answer Key Structuring:** Teachers upload a PDF containing their model answers. The system automatically reads the text and structures it into standardized *Questions*, *Model Answers*, and *Keywords*.
* **Rubric System Builder:** Teachers configure strict rule-based rubrics dictating what marks require what mandatory keywords, adjusting the difficulty of the AI.
* **Evaluation Override:** View AI-assessed answers. If a teacher disagrees, they click **Re-Evaluate** or manually override the Score.
* **Analytics Dashboard:** Visual charts analyzing Class Average, Question-Level performance (identifying weakly understood topics across the class), and Top Performers.

### 3. The Student Module (Role: `student`)
Students track their performance transparently.
* **Real-time Status Tracking:** Submissions showcase the pipeline status (e.g., waiting for evaluation, uploading).
* **Detailed AI Feedback Viewer:** Once results are "Published", students click to see a breakdown containing:
   * **Exact Marks** given per Question.
   * **AI Justification** for grading decisions.
   * **Missing Points** pinpointing what their answer lacked versus the Model Answer.
   * Broad level **Strengths**, **Weaknesses**, and **Suggestions**.
* **Grievances:** Found a legitimately incorrect evaluation? Students can raise a single Grievance per exam to flag the paper for Teacher manual review.

### 4. Administrator Module (Role: `administrator`)
Central IT user management.
* Handles CRUD access for creating student, teacher, or exam cell user profiles.
* Global system monitoring.

---

## 🛠 Advanced Features Under The Hood
* **Native Gemini Vision Multi-modality:** The system does not use basic Tesseract OCR; it directly feeds PDF/Image binaries into Gemini 1.5/2.5 for context-aware interpretation of hand-written math, text, and unstructured drawings.
* **Database Job Queuing:** Relies on robust native Postgres row-locking via `SKIP LOCKED` within `evaluation_jobs` table to prevent duplicated or crashed processing loops without needing external Redis overhead.
* **Idempotent Retries:** Network timeout midway through a 50 file bulk upload? Re-running the pipeline gracefully ignores graded sheets and resumes exactly where it crashed.
