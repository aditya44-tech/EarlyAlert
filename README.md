# Sentinel — Predictive Student Dropout Detection 🚀

Sentinel is an AI-powered academic retention platform built for **Hack2Ignite**. It helps mentors and educators identify at-risk students before they drop out, by analyzing key factors like attendance, grades, backlogs, fee status, and engagement. 

The platform features a deterministic risk engine and uses **Groq AI (Llama 3.1)** to generate human-readable diagnostic explanations for educators.

---

## 🛠️ Tech Stack

This project was migrated from Vite to a full-stack **Next.js 15** architecture.

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, Lucide React (Icons), Framer Motion (Animations)
- **Backend / API:** Next.js Serverless Route Handlers
- **AI Integration:** Groq API (`llama-3.1-8b-instant`) — processed 100% server-side for security.
- **Data Persistence:** MongoDB via Mongoose (with fallback in-memory store).
- **Charts:** Recharts

---

## ⚙️ Core Features

1. **Deterministic Risk Engine:** A pure TypeScript, rule-based engine that calculates a 0-100 risk score based on weighted factors (Attendance 30%, Grades 25%, Backlogs 20%, Fees 15%, Engagement 10%).
2. **AI Diagnostic Narratives:** Groq AI translates the raw numbers into concise, empathetic risk narratives for mentors.
3. **Intervention Action Panel:** Mentors can assign customized interventions (Extra Classes, Counseling, Financial Aid) based on the AI's recommendations.
4. **Outcome Tracking:** Compare baseline risk scores against post-intervention scores to measure success. Current score and checkpoint dates dynamically update with new data uploads.
5. **CSV Batch Upload:** Automatically update student data (attendance, grades, fees) via CSV uploads. All uploads are logged and tracked in the history ledger.
6. **Student Facing View:** Students log into their own portal to track their active interventions and assigned schedules.

---

## 🔄 Full Workflow

### 1. Data Setup & Ingestion
Student data is ingested via CSV batch uploads (Weekly Attendance, Term Tests, Backlogs, Fee Status). The data updates the MongoDB student profiles in real-time.

### 2. Risk Scoring & Detection
The engine calculates a continuous risk score (0-100) and categorizes students into Low, Medium, and High risk bands. High-risk students are flagged on the Mentor Dashboard. 

### 3. Intervention Assignment
The mentor clicks on a flagged student, reviews the AI-generated diagnostic narrative, and assigns an intervention. The system automatically recommends an intervention type (e.g., "Extra Class" for low grades, "Counseling" for low attendance).

### 4. Student Visibility
The assigned student receives the active intervention plan on their personal dashboard (e.g., "Extra Class assigned: Data Structures, Tue/Thu 4pm"). 

### 5. Monitoring & Outcome Tracking
As new data is uploaded in the following weeks, the system recalculates the student's current risk score. Mentors can view the **Outcome Comparison** screen to see a before-and-after trajectory (Baseline Risk vs. Current Risk) and determine if the intervention was successful (Improving, Worsening, or No Change).

### 6. Resolution
Once a student has stabilized, the mentor marks the intervention as "Resolved." Safeguards are in place to warn mentors if they attempt to resolve an intervention that hasn't shown significant improvement.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A [Groq API Key](https://console.groq.com/keys)
- A MongoDB Connection String

### 1. Installation

Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory and add your API keys:
```env
# Server-side only (never exposed to the browser)
GROQ_API_KEY=gsk_your_api_key_here

# MongoDB connection URI (Required for persistence)
MONGODB_URI=mongodb+srv://...
```

### 3. Run the Development Server

Start the Next.js local server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📁 Project Structure

```text
hack2ignite/
├── app/
│   ├── api/                 # Next.js API Routes (Students, Interventions, History, Groq)
│   ├── _app/                # Main client application wrapper
│   ├── layout.tsx           # Root layout and metadata
│   └── page.tsx             # Entry point
├── components/              # Reusable UI components (Badges, Charts, Cards)
├── lib/
│   ├── db.ts                # In-memory database & Mongoose fallbacks
│   ├── dbConnect.ts         # MongoDB Connection Utility
│   ├── models.ts            # Mongoose Schemas (Student, UploadHistory, Outcome)
│   ├── riskEngine.ts        # The deterministic scoring engine
│   ├── mockData.ts          # Seed data for initial students
│   └── types.ts             # TypeScript interfaces
├── views/                   # Major application screens (Dashboard, Detail, Action Panel)
└── .env                     # Environment variables
```

---

## 🧠 How the AI Works

Unlike standard LLM wrappers, **Sentinel uses AI exclusively as a translation layer, never for scoring.** 

1. The deterministic engine calculates that a student has a score of `78/100` due to a 20% attendance drop and 3 backlogs.
2. The server-side API securely sends this structured data to the Groq API (`llama-3.1-8b-instant`).
3. Groq generates a readable sentence: *"This student is at high risk due to a sharp attendance decline over the last 3 weeks, compounded by 3 active backlogs."*
4. If the Groq API fails or is rate-limited, the system automatically falls back to a locally generated, rule-based text explanation so the UI never breaks during a demo.

---

*Built for Hack2Ignite 2026.*
