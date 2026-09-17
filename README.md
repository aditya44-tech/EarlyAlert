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
- **Data Persistence:** In-memory store (Ready to be swapped for MongoDB via Mongoose).
- **Charts:** Recharts

---

## ⚙️ Core Features

1. **Deterministic Risk Engine:** A pure TypeScript, rule-based engine that calculates a 0-100 risk score based on weighted factors (Attendance 30%, Grades 25%, Backlogs 20%, Fees 15%, Engagement 10%).
2. **AI Diagnostic Narratives:** Groq AI translates the raw numbers into concise, empathetic risk narratives for mentors.
3. **Intervention Action Panel:** Mentors can assign customized interventions (Extra Classes, Counseling, Financial Aid) based on the AI's recommendations.
4. **Outcome Tracking:** Compare baseline risk scores against post-intervention scores to measure success.
5. **CSV Batch Upload:** Automatically update student data (attendance, grades, fees) via CSV uploads.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A [Groq API Key](https://console.groq.com/keys)

### 1. Installation

Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory and add your Groq API key:
```env
# Server-side only (never exposed to the browser)
GROQ_API_KEY=gsk_your_api_key_here

# (Optional) MongoDB connection URI
MONGODB_URI=
```
*(Note: If MongoDB is not configured, the app will run seamlessly using a seeded in-memory data store containing 50 mock students).*

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
│   ├── api/                 # Next.js API Routes (Students, Interventions, Groq proxy)
│   ├── _app/                # Main client application wrapper
│   ├── layout.tsx           # Root layout and metadata
│   └── page.tsx             # Entry point
├── components/              # Reusable UI components (Badges, Charts, Cards)
├── lib/
│   ├── db.ts                # In-memory database & schema (MongoDB ready)
│   ├── riskEngine.ts        # The deterministic scoring engine
│   ├── mockData.ts          # Seed data for 50 initial students
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
