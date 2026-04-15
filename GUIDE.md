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