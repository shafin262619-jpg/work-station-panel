# HANDOFF_NEXT — বর্তমান অবস্থা

## গ্রুপ A (Phase 1 — Skeleton) সম্পূর্ণ ✅

### chunk A1 — Backend skeleton
- `backend/` ফোল্ডারে **Express + SQLite (better-sqlite3)** API সার্ভার।
- সব entity-র টেবিল + CRUD রুট (Project, PlanData, CodingData, SupportLog,
  CheckerIssue, Account, Settings singleton, Note)। API রুট ম্যাপ নিচে।
- `projects` টেবিলে `pinned` (default 0) + `updated_at`; `db.js`-এর
  `migrate()` পুরনো DB-তে কলাম যোগ করে (A3)।
- `POST /api/projects` প্রজেক্টের সাথে ফাঁকা PlanData/CodingData রো-ও তৈরি
  করে (A3)।
- **DB লাইব্রেরি**: `better-sqlite3` | **টেস্ট ফ্রেমওয়ার্ক (backend)**:
  Node.js বিল্ট-ইন `node --test` (৭৩ টা টেস্ট)।

### chunk A2 — Frontend skeleton
- `frontend/` ফোল্ডারে **Next.js (App Router, React 19)** অ্যাপ।
- বেস ডিজাইন টোকেন `app/globals.css`-এর `:root`-এ CSS variables হিসেবে।
- `next.config.mjs`-এ `/api/:path*` → `http://127.0.0.1:3001` reverse proxy
  rewrites।

### chunk A3 — Projects হোম
- `/` পেজ ফাংশনাল: প্রজেক্ট কার্ড (নাম, current_phase ব্যাজ, updated_at),
  "+ New Project" (তৈরি → `/project/[id]` রিডাইরেক্ট), pin/unpin টগল
  (**Pinned** সেকশন উপরে), **Recently Active** সেকশন (updated_at sort)।

### chunk A4 — Project shell (এই চাংক)
- `/project/[id]` শেল সম্পূর্ণ:
  - **Overview ট্যাব**: নাম, তৈরির তারিখ, বর্তমান ফেজ ব্যাজ, **GitHub
    লিংক এডিটেবল ফিল্ড** (PUT `/api/projects/:id` দিয়ে সেভ), নিচে ৪টা
    ট্যাবে যাওয়ার শর্টকাট কার্ড।
  - **Plan / Coding / Support Claude / Checker Claude** — প্রতিটায় একটা
    **বেসিক নোট এরিয়া** (প্লেইন টেক্সট + সেভ বাটন)। নোট `notes` API-তে
    `category: "project:<id>:<tab>"` নামস্পেসে সেভ হয় (উদা. `project:5:plan`)।
    আসল ফিচার (Plan-এর ৪ সাব-সেকশন, Support-এর prompt↔brief লগ ইত্যাদি)
    পরের গ্রুপ C/D/E-তে।
  - **ট্যাব নেভিগেশন UI**: অ্যাক্টিভ ট্যাব হাইলাইট (`aria-current="page"` +
    `tabs__tab--active`), A2-এর ডিজাইন টোকেন ব্যবহার করে।
- `ProjectShell` এখন client কম্পোনেন্ট — প্রজেক্টের নাম হেডারে দেখায়
  (লোড না হওয়া পর্যন্ত "Project #<id>" fallback)।
- **টেস্ট ফ্রেমওয়ার্ক (frontend)**: Jest + React Testing Library (৩২ টা
  টেস্ট); `npm run build` সফল।

## API রুট ম্যাপ (frontend-এ wire করার জন্য)
```
GET/POST    /api/projects
GET/PUT/DELETE /api/projects/:id
GET/POST/PUT/DELETE /api/projects/:projectId/plan          (PlanData, singleton)
GET/POST/PUT/DELETE /api/projects/:projectId/coding        (CodingData, singleton)
GET/POST    /api/projects/:projectId/support-logs
GET/PUT/DELETE /api/projects/:projectId/support-logs/:id
GET/POST    /api/projects/:projectId/checker-issues        (?resolved= / ?archived= ফিল্টার)
GET/PUT/DELETE /api/projects/:projectId/checker-issues/:id
GET/POST    /api/accounts
GET/PUT/DELETE /api/accounts/:id
GET/POST/PUT/DELETE /api/settings                          (singleton)
GET/POST    /api/notes                                     (?category= / ?pinned= ফিল্টার)
GET/PUT/DELETE /api/notes/:id
```
- `Project` রেসপন্সে `pinned` (0/1) ও `updated_at` (ISO string) থাকে;
  `current_phase` PUT-এ set করা যায় না (D1/D2/E1-এ forward-only
  auto-advance)।
- Success: single object বা `{ "data": [...] }`; error: `{ "error": "..." }`।
- Dev: backend `npm start` (ডিফল্ট 3001), frontend `npm run dev` (ডিফল্ট 3000);
  frontend-এর `/api/*` reverse proxy হয়ে backend-এ যায়।

## এরপর কী করতে হবে
**গ্রুপ B — AI Accounts ম্যানেজার (B1 থেকে)।**
B1: Account CRUD + daily auto-reset (node-cron + lazy-reset ফলব্যাক,
`Settings.last_account_reset_date`) + Reset All endpoint + mark-used
endpoint — backend লজিক, UI পরে (B2)। প্রম্পট
`docs/WORK_STATION_PANEL_GITHUB_CHUNK_PLAN.md`-এ।

## রেফারেন্স
- `docs/WORK_STATION_PANEL_GITHUB_CHUNK_PLAN.md` — সম্পূর্ণ চাংক প্ল্যান।

## কনভেনশন
- single source of truth রাখা, duplicate না করে import করা।
- `.env`/real API key (Gemini) কখনো commit হবে না।
- সব entity `project_id` দিয়ে স্কোপড রাখা (multi-project সাপোর্টের জন্য)।
- প্রজেক্ট-স্কোপড রিসোর্সের রুট নেস্টেড প্যাটার্ন ব্যবহার করবে
  (`/api/projects/:projectId/...`)।
- Frontend: App Router (server components by default), ডিজাইন টোকেন
  `globals.css`-এর CSS variables থেকে import।
