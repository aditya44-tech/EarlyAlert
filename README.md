# Sentinel — AI-Powered Student Dropout Prediction Platform 🎯

> **Identifying at-risk students before they drop out — using deterministic scoring + AI-powered narratives.**

Sentinel is a full-stack web application that helps college mentors detect, understand, and intervene with students at risk of dropping out. It analyzes attendance, grades, backlogs, fee status, and engagement to produce a 0–100 risk score, generates human-readable AI explanations, and tracks intervention outcomes over time.

Built for **Hack2Ignite 2026**.

---

## 📋 Table of Contents

- [Demo Overview](#-demo-overview)
- [Login Credentials](#-login-credentials)
- [Key Features](#-key-features)
- [How It Works](#-how-it-works)
- [Risk Engine Deep Dive](#-risk-engine-deep-dive)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Demo Data](#-demo-data)

---

## 🎬 Demo Overview

### What you can do in the live demo:

1. **Log in as a Mentor** → See the dashboard with 50 pre-seeded students, sorted by risk score
2. **View high-risk students** → Click any student to see their full risk breakdown with AI-generated explanations
3. **Upload CSV data** → Update attendance, grades, or backlogs for students and watch risk scores recalculate in real-time
4. **Assign interventions** → Assign tutoring, counseling, or financial aid to at-risk students
5. **Track outcomes** → Compare baseline risk scores against current scores to measure intervention success
6. **Log in as a Student** → Students see their own risk profile, active interventions, and suggested actions

### Key screens:
- **Dashboard** — Student list with risk badges, distribution chart, upload history
- **Student Detail** — Full risk breakdown, attendance trend chart, grade comparison, AI narrative, intervention panel
- **Outcome Comparison** — Before/after intervention risk scores with improvement indicators

---

## 🔐 Login Credentials

| Role | ID / Username | Password |
|------|---------------|----------|
| **Mentor** | `mentor` | `sentinel123` |
| **Student** | `S001` through `S050` | _(no password — just enter the ID)_ |

Examples for student login:
- `S006` — Kabir Kale (High Risk, declining attendance)
- `S019` — Radhika Reddy (High Risk, fee overdue)
- `S022` — Ruchi Reddy (High Risk, 3 backlogs)
- `S001` — Mohit Chopra (Low Risk, stable high performance)

---

## 🔑 Key Features

| Feature | Description |
|---------|-------------|
| **Deterministic Risk Engine** | Pure TypeScript rule engine — no ML, no randomness. Every score is auditable and explainable. |
| **AI-Powered Narratives** | Groq AI translates raw numbers into empathetic, human-readable explanations for mentors. |
| **Dual-Risk Explanation** | AI narrative when available, deterministic fallback text when not — the UI never breaks. |
| **Real-Time Recomputation** | Upload a CSV → risk scores recalculate instantly across the entire student body. |
| **Intervention Management** | Assign, track, and resolve interventions with full audit trail. |
| **Outcome Tracking** | Before/after comparison shows if interventions are working (Improving/Worsening/No Change). |
| **Dual-Layer Storage** | In-memory store (zero-config) + optional MongoDB (persistent). Works without any database. |
| **Input Validation** | Dirty CSV data (negative scores, >100% attendance) is filtered — never inflates risk scores. |

---

## 🔄 How It Works

### Complete Workflow (A–Z)

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: DATA INGESTION                                         │
│  Mentor uploads CSV files (attendance, grades, backlogs, fees)  │
│  → Parsed client-side, validated, stored in-memory + MongoDB    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: RISK SCORING                                           │
│  Deterministic engine analyzes 5 weighted factors:              │
│  Attendance (30) + Grades (25) + Backlogs (20) +               │
│  Fees (15) + Engagement (10) = 0–100 total                     │
│  → Risk Level: Low (0-30) | Medium (31-60) | High (61-100)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: AI EXPLANATION                                         │
│  Server-side Groq API call translates scores → human text       │
│  Primary: qwen/qwen3.8-27b | Fallback: llama-3.3-70b-versatile │
│  If API unavailable → deterministic fallback text (never errors)│
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: INTERVENTION                                           │
│  Mentor reviews student detail → assigns intervention:          │
│  • Extra Class / Tutoring (for grade decline)                   │
│  • Counseling / Check-in (for attendance/engagement decline)    │
│  • Financial Aid Referral (for fee overdue)                     │
│  • Academic Support (for backlogs)                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: STUDENT VISIBILITY                                     │
│  Student logs in → sees their risk profile, active intervention │
│  with schedule, instructor, and subject details                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: OUTCOME TRACKING                                       │
│  Next week: mentor uploads new attendance/grades                │
│  → Risk score recalculates → compared against baseline          │
│  → Outcome: Improving / Worsening / No Change                   │
│  → Mentor marks intervention as Resolved when student stabilizes│
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧮 Risk Engine Deep Dive

The engine in `lib/riskEngine.ts` is the core of Sentinel. It is **100% deterministic** — no ML, no LLM involvement in scoring, no randomness. Every score can be traced back to specific input values.

### Five Weighted Factors

#### 1. Attendance (0–30 points)
Uses the last 4 weeks of attendance data. Scores smoothly within bands using linear interpolation:

| Latest Attendance | Base Points | Trend Bonus |
|---|---|---|
| < 60% | 30 | — |
| 60–74% | 20–30 (interpolated) | +8 if dropping fast |
| 75–84% | 8–20 (interpolated) | +10 if dropping fast |
| ≥ 85% | 0–12 (if large drop) | +5 for moderate drops |

Trend detection uses linear regression (slope) over 4 data points:
- Slope < -2 → "declining trend" (adds risk points)
- Slope > 2 → "improving trend"
- Slope ≈ 0 → "stable"

#### 2. Grades (0–25 points)
Scores Unit Test 1 and Unit Test 2 with name normalization (case-insensitive, whitespace-trimmed):

| Score | Points |
|---|---|
| < 40 | 25 |
| 40–54 | 18 |
| 55–64 | 12 |
| 65–74 | 5 |
| ≥ 75 | 0 |

When both UT1 and UT2 exist, the engine calculates the **delta** (improvement or decline) and adjusts:
- UT2 improved by 15+ → subtract 15 points (strong recovery)
- UT2 dropped by 15+ → add 10 points (significant decline)

#### 3. Backlogs (0–20 points)
| Count | Points |
|---|---|
| 0 | 0 |
| 1 | 6 |
| 2 | 13 |
| 3 | 17 |
| 4+ | 20 |

#### 4. Fee Overdue (0–15 points)
| Days Overdue | Points |
|---|---|
| 0 | 0 |
| 1–10 | 6 |
| 11–30 | 12 |
| 30+ | 15 |

#### 5. Engagement / Submission Rate (0–10 points)
| Rate | Points |
|---|---|
| < 40% | 10 |
| 40–54% | 7 |
| 55–64% | 4 |
| 65–74% | 2 |
| ≥ 75% | 0 |

### Aggregation

```
Total = clamp(attendance + grade + backlog + fee + engagement, 0, 100)

Risk Level:
  0–30   → Low     (green badge)
  31–60  → Medium  (yellow badge)
  61–100 → High    (red badge)
```

### Suggested Actions

The engine automatically recommends interventions based on the **dominant factor** (highest-pointing):

| Dominant Factor | Recommended Action |
|---|---|
| Grade Decline | Extra Class / Tutoring: {weakest subject} |
| Attendance Decline | Counseling / Check-in |
| Fee Overdue | Financial Aid Referral |
| Backlogs | Academic Support |
| Low Engagement | Counseling / Check-in |
| None | Monitor |

---

## 🤖 How the AI Works

Sentinel uses AI **exclusively as a translation layer, never for scoring.**

1. The deterministic engine calculates that a student has a score of `78/100` due to a 20% attendance drop and 3 backlogs
2. The server-side API securely sends this structured data to the Groq API
3. Groq generates a readable narrative: *"This student is at high risk due to a sharp attendance decline over the last 3 weeks, compounded by 3 active backlogs in DBMS, Computer Network, and Python Programming."*
4. If the Groq API fails, is rate-limited, or no API key is configured, the system automatically falls back to locally generated, rule-based text — **the UI never breaks during a demo**

### Two AI Modes

| Mode | Purpose | Output |
|------|---------|--------|
| `explain` | Risk narrative for a student | 2–3 sentence summary |
| `rationale` | Why a specific intervention was recommended | 1 sentence (max 30 words) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript (strict mode) |
| **UI** | React 19, Tailwind CSS v4 |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **AI** | Groq API (`qwen/qwen3.8-27b` primary, `llama-3.3-70b-versatile` fallback) |
| **Database** | MongoDB via Mongoose (optional — in-memory fallback) |
| **Testing** | Node.js built-in test runner (31 tests) |
| **Build** | `next build`, `tsc --noEmit` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ (v24 recommended for native test runner)
- A [Groq API Key](https://console.groq.com/keys) (free tier available)
- MongoDB connection string (optional — app works without it)

### 1. Install Dependencies


```bash
npm install
```

### 2. Configure Environment


Create `.env.local` in the project root:

```env
# Required for AI narratives (get from https://console.groq.com/keys)
GROQ_API_KEY=gsk_your_api_key_here

# Optional — enables persistent storage across server restarts
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/sentinel

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note:** If `GROQ_API_KEY` is not set, the app still works — AI narratives fall back to deterministic text. If `MONGODB_URI` is not set, data persists in memory for the session.

### 3. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Run Tests

```bash
npm test
```

Expected output: `31 passing, 0 failing`

---

## 📁 Project Structure

```
sentinel/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (providers, header, fonts)
│   ├── page.tsx                      # Login page → redirects to dashboard/student
│   ├── providers.tsx                 # Global state (SentinelProvider context)
│   ├── globals.css                   # Tailwind + custom styles
│   │
│   ├── dashboard/                    # Mentor views
│   │   ├── page.tsx                  # Dashboard: student list, charts, uploads
│   │   └── student/[id]/page.tsx     # Student detail: full profile + AI + interventions
│   │
│   ├── student/                      # Student self-view
│   │   └── page.tsx                  # Students see their own risk profile
│   │
│   └── api/                          # Server-side API routes
│       ├── students/route.ts         # GET/POST/DELETE students
│       ├── students/[id]/route.ts    # GET/PATCH individual student
│       ├── groq/explain/route.ts     # Groq AI proxy (explain + rationale)
│       ├── history/route.ts          # Upload history CRUD
│       ├── interventions/            # Intervention management
│       └── outcomes/                 # Outcome comparison data
│
├── components/                       # Reusable UI components
│   └── Header.tsx                    # Top navigation bar
│
├── views/                            # Major application screens
│   ├── LoginView.tsx                 # Login screen (mentor/student selection)
│   ├── DashboardView.tsx             # Main dashboard with charts
│   ├── StudentDetailView.tsx         # Full student profile + risk breakdown
│   └── OutcomeComparisonView.tsx     # Before/after intervention comparison
│
├── lib/                              # Core logic & utilities
│   ├── riskEngine.ts                 # Deterministic scoring engine (0–100)
│   ├── types.ts                      # Shared TypeScript interfaces
│   ├── db.ts                         # In-memory data store
│   ├── dbConnect.ts                  # MongoDB connection (optional)
│   ├── models.ts                     # Mongoose schemas
│   └── mockData.ts                   # 50 pre-seeded CS students
│
├── tests/                            # Test suite (31 tests)
│   ├── riskEngine.test.ts            # 28 engine unit tests
│   ├── groq.test.ts                  # 6 AI integration tests
│   ├── ts-register.mjs              # TypeScript test bootstrap
│   └── ts-resolve-hooks.mjs         # Module resolution hook
│
└── data/                             # Raw CSV files (attendance, grades, etc.)
```

---

## 📡 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/students` | GET | List all students (summaries) |
| `/api/students` | POST | Bulk upsert students |
| `/api/students` | DELETE | Clear all students |
| `/api/students/[id]` | GET | Get full student detail |
| `/api/students/[id]` | PATCH | Update student risk/intervention |
| `/api/groq/explain` | POST | Generate AI narrative (explain/rationale) |
| `/api/history` | GET | List upload history |
| `/api/history` | POST | Log a new upload |
| `/api/history` | DELETE | Remove upload record |
| `/api/interventions` | GET | List all interventions |
| `/api/interventions` | POST | Create new intervention |
| `/api/interventions/[id]` | PATCH | Update intervention status |
| `/api/outcomes/[id]` | GET | Get outcome comparison |

---

## 🧪 Testing

The project includes **31 automated tests** using Node.js built-in test runner:

### Risk Engine Tests (28 tests)
- Baseline healthy student scoring
- All 5 factor scoring tiers (attendance, grades, backlogs, fees, engagement)
- Grade delta calculation (UT2 improvement/decline vs UT1)
- Risk level boundaries (30/31/60/61)
- Factor ranking and tie-breaking
- Edge cases: empty data, negative inputs, invalid values
- Term test name normalization (case-insensitive, whitespace-trimmed)
- Smooth interpolation at tier boundaries

### Groq Integration Tests (6 tests)
- Prompt construction accuracy
- Live API calls (when server + API key available)
- Malformed input handling
- Invalid mode rejection

```bash
npm test          # Run all tests
npx tsc --noEmit  # Type-check without emitting
```

---

## 📊 Demo Data

Sentinel ships with **50 pre-seeded Computer Science students** (S001–S050) with realistic data:

| Trend Profile | Students | Description |
|---|---|---|
| Stable High | 16 | Consistent good attendance + grades (low risk) |
| Stable Mid | 16 | Average performance (medium risk) |
| Declining | 8 | Dropping attendance + grades over 4 weeks (high risk) |
| Stable Low | 6 | Consistently poor performance (high risk) |
| Improving | 4 | Rising attendance + grades (recovering) |

### Pre-Seeded Interventions (for demo)

| Student | Risk Score | Intervention | Status |
|---------|-----------|--------------|--------|
| S006 — Kabir Kale | 78 (High) | Extra Class: DS & DBMS, Tue/Thu 4PM | Active |
| S019 — Radhika Reddy | 72 (High) | Counseling, Mon 3PM | Active |
| S022 — Ruchi Reddy | 70 (High) | Academic Support, Wed/Fri 5PM | Active |

---

## 🏗️ Architecture Decisions

| Decision | Why |
|----------|-----|
| **Deterministic scoring (no ML)** | Transparent, auditable, works offline, no training data needed |
| **In-memory primary + MongoDB optional** | Zero-config for demo, persistence when needed |
| **Groq API** | Faster (450 tps), cheaper, free tier available |
| **Client-side CSV parsing** | No server upload needed, instant feedback |
| **Fire-and-forget server sync** | UI updates immediately, background persistence |
| **Dual-risk explanation** | AI narrative when available, deterministic fallback when not |

---

## 🧩 Bug Fixes & Robustness

| Fix | Issue | Solution |
|-----|-------|----------|
| Name normalization | `"unit test 1"` vs `"Unit Test 1"` missed matches | Trim + lowercase before comparison |
| UT2-without-UT1 | Low UT2 scored as "stable" (0 pts) | UT2-only now scores against baseline tiers |
| Smooth interpolation | Hard cliffs at 60%/75%/85% boundaries | Linear interpolation within each band |
| Input validation | Negative scores / >100% inflated risk | All scorers filter invalid values |
| API key resilience | Expired key → silent fallback | Automatic model fallback + clear logging |

---

---

## 📄 License

Built for **Hack2Ignite 2026**.

---

*Sentinel — Because every student deserves a chance to succeed.*
