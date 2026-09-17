# Sentinel — Complete Project Report

**Date:** September 17, 2026
**Version:** 1.1
**Stack:** Next.js 15 + TypeScript + Tailwind CSS + MongoDB (optional) + Groq AI
**Purpose:** AI-powered student dropout prediction and intervention management system

---

## 1. What Sentinel Does

Sentinel is a **predictive student dropout detection platform** for college mentors. It:

1. **Ingests** student data via CSV uploads (attendance with subject breakdown, grades, backlogs, fees, engagement)
2. **Scores** each student's dropout risk (0–100) using a deterministic rule engine
3. **Explains** the risk via AI-generated narratives (Groq API) or fallback text
4. **Recommends** targeted interventions (tutoring, counseling, financial aid, etc.)
5. **Tracks** intervention outcomes over time (before/after risk comparison)
6. **Visualizes** everything on a dashboard with charts, tables, and drill-down views

---

## 2. Recent Updates (v1.1)

### Subject-Level Attendance Merged into Overall

**Before:** Two separate fields — `attendanceHistory` (overall) and `subjectAttendance` (per-subject, last week only)

**After:** Single unified field with subject breakdown:
```typescript
attendanceHistory: [{
  week: "Week 1",
  percentage: 85,
  subjects: [
    { subject: "DBMS", percentage: 82 },
    { subject: "Computer Network", percentage: 85 },
    { subject: "Python Programming", percentage: 88 }
  ]
}]
```

**Benefits:**
- Single source of truth for all attendance data
- UI shows overall trend + per-subject lines on one chart
- Subject attendance upload merges into matching week (recalculates overall as average)
- Weekly attendance upload preserves existing subject breakdown

### Realistic Mock Data (50 Students, 9 Patterns)

| Pattern | Count | Description | Risk |
|---|---|---|---|
| Stable High | 10 | 85-95% att, 85-95 scores | Low |
| Stable Mid | 9 | 74-80% att, 62-72 scores | Medium |
| Stable Low | 5 | 46-53% att, 34-47 scores | High |
| Declining | 6 | Started 72-78%, dropped to 47-55% | High |
| Was Good Then Bad | 5 | Strong W1-W2, sharp crash W3-W4 | High |
| Improving | 5 | Started 50-65%, trending up | Medium |
| Good Att, Bad Grades | 4 | 78-87% att, 30-50 scores | High |
| Spike Then Drop | 3 | One good week then complete crash | High |
| Recovering | 3 | Was declining, now bouncing back | Medium |

### Upload Revert System

Deleting an upload from history now **restores the exact pre-upload state**:
- Snapshots student data before each upload
- On delete, restores from snapshot (not just "remove entry")
- Students created by upload are removed entirely
- Risk scores recalculated from restored data

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript (strict mode) |
| **UI** | React 19, Tailwind CSS v4 |
| **Icons** | Lucide React |
| **Charts** | Recharts (custom AttendanceChart with subject lines) |
| **AI** | Groq API (`qwen/qwen3.8-27b` primary, `llama-3.3-70b-versatile` fallback) |
| **Database** | MongoDB via Mongoose (optional — in-memory fallback) |
| **Testing** | Node.js built-in test runner (31 tests) |

---

## 4. Project Structure

```
sentinel/
├── app/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Login page
│   ├── providers.tsx             # Global state (SentinelProvider)
│   ├── dashboard/                # Mentor views
│   │   ├── page.tsx              # Dashboard
│   │   └── student/[id]/page.tsx # Student detail
│   ├── student/                  # Student self-view
│   └── api/                      # Server routes
│       ├── students/route.ts
│       ├── groq/explain/route.ts
│       ├── history/route.ts
│       └── interventions/
├── components/
│   ├── Header.tsx
│   ├── TrendChart.tsx            # Generic line chart
│   └── AttendanceChart.tsx       # NEW: Attendance with subject lines
├── views/
│   ├── LoginView.tsx
│   ├── DashboardView.tsx
│   ├── StudentDetailView.tsx
│   └── OutcomeComparisonView.tsx
├── lib/
│   ├── riskEngine.ts             # Scoring engine
│   ├── types.ts                  # TypeScript interfaces
│   ├── db.ts                     # In-memory store
│   ├── dbConnect.ts              # MongoDB connection
│   ├── models.ts                 # Mongoose schemas
│   └── mockData.ts               # 50 students, 9 patterns
└── tests/
    ├── riskEngine.test.ts        # 28 engine tests
    └── groq.test.ts              # 6 integration tests
```

---

## 5. Login Credentials

| Role | ID / Username | Password |
|------|---------------|----------|
| **Mentor** | `mentor` | `sentinel123` |
| **Student** | `S001` through `S050` | _(no password)_ |

---

## 6. Data Flow

### Upload → Risk Score → Dashboard

```
1. Mentor uploads CSV (WeeklyAttendance, SubjectAttendance, UnitTest, etc.)
2. handleDataUpload() in providers.tsx:
   a. Snapshots each affected student's current state
   b. Parses CSV rows, updates student data:
      - WeeklyAttendance → upserts by week label (preserves subject data)
      - SubjectAttendance → merges into attendanceHistory week (recalculates overall)
      - UnitTest1/2 → replaces test entry
      - Backlogs/FeeStatus → updates directly
   c. Calls computeRiskScore() for each affected student
   d. Syncs to server (fire-and-forget)
3. Dashboard re-renders with updated risk scores
```

### Upload Delete → Revert → Dashboard

```
1. Mentor clicks delete on upload history entry
2. handleDeleteUpload() in providers.tsx:
   a. Finds upload log with snapshot data
   b. For each student in rawData:
      - If snapshot exists → restore all fields from snapshot
      - If no snapshot (student created by upload) → remove student
   c. Recalculates risk scores from restored data
   d. Syncs to server
3. Dashboard re-renders with original data
```

---

## 7. API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/students` | GET/POST/DELETE | Student CRUD |
| `/api/students/[id]` | GET/PATCH | Individual student |
| `/api/groq/explain` | POST | AI narrative (explain/rationale) |
| `/api/history` | GET/POST/DELETE | Upload history with snapshots |
| `/api/interventions` | GET/POST | Intervention management |
| `/api/outcomes/[id]` | GET | Outcome comparison |

---

## 8. Testing

**31 tests total:**
- 28 risk engine unit tests (all passing)
- 6 Groq integration tests (5 skipped without dev server, 1 unit test passing)

**Key test categories:**
- All 5 scoring factors (attendance, grades, backlogs, fees, engagement)
- Risk level boundaries (30/31/60/61)
- Grade delta calculation (UT2 improvement/decline vs UT1)
- Name normalization (case-insensitive, whitespace-trimmed)
- UT2-only baseline scoring
- Smooth interpolation at tier boundaries
- Edge cases (empty data, negative inputs, invalid values)

---

## 9. Architecture Decisions

| Decision | Why |
|----------|-----|
| **Deterministic scoring (no ML)** | Transparent, auditable, works offline |
| **In-memory primary + MongoDB optional** | Zero-config for demo, persistence when needed |
| **Groq API** | Faster (450 tps), cheaper, free tier available |
| **Snapshot-based upload revert** | Perfect undo — restores exact pre-upload state |
| **Merged subject attendance** | Single source of truth, unified chart display |
| **9 mock data patterns** | Realistic demo with varied risk profiles |

---

*Report generated by Sentinel automated testing system.*
