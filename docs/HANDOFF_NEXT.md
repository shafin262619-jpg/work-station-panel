# HANDOFF_NEXT — বর্তমান অবস্থা

## এখন পর্যন্ত কী শেষ (chunk A1 — Backend skeleton)
- `backend/` ফোল্ডারে **Express + SQLite (better-sqlite3)** API সার্ভার।
- সব entity-র টেবিল + CRUD রুট (Project, PlanData, CodingData, SupportLog,
  CheckerIssue, Account, Settings singleton, Note)। বিস্তারিত নিচের
  "API রুট ম্যাপ" ও রেফারেন্সে।
- **DB লাইব্রেরি**: `better-sqlite3` | **টেস্ট ফ্রেমওয়ার্ক (backend)**:
  Node.js বিল্ট-ইন `node --test`।

## এখন পর্যন্ত কী শেষ (chunk A2 — Frontend skeleton)
- `frontend/` ফোল্ডারে **Next.js (App Router, React 19)** অ্যাপ।
- রাউট স্ট্রাকচার:
  - `/` → Projects হোম
  - `/accounts` → AI Accounts
  - `/settings` → Settings
  - `/project/[id]` → Project shell + **৫টা ট্যাব** (Overview, Plan, Coding,
    Support Claude, Checker Claude) — sub-route সহ।
- বেস ডিজাইন টোকেন `app/globals.css`-এর `:root`-এ CSS variables হিসেবে।
- কম্পোনেন্ট: `SideNav`, `ProjectShell` + `ProjectTabs`।
- **টেস্ট ফ্রেমওয়ার্ক (frontend)**: **Jest + React Testing Library**
  (`npm test`)।
- `next.config.mjs`-এ `/api/:path*` → `http://127.0.0.1:3001` reverse proxy
  rewrites (frontend-backend separated setup-এর জন্য)।

## এখন পর্যন্ত কী শেষ (chunk A3 — Projects হোম)
- `/` পেজ পুরোপুরি ফাংশনাল:
  - সব প্রজেক্টের কার্ড লিস্ট — নাম, current_phase ব্যাজ (Plan/Coding/Support/
    Checker), সর্বশেষ আপডেটের সময় (`updated_at`, mono টাইমস্ট্যাম্প)।
  - কার্ডে ক্লিক করলে `/project/[id]` (Overview) পেজে যায়।
  - বড় **"+ New Project"** বাটন — ক্লিকে `POST /api/projects` দিয়ে নতুন
    প্রজেক্ট তৈরি হয় (নাম "Untitled Project", current_phase="Plan") সাথে
    **৪টা খালি ডেটা-সেট**: ফাঁকা PlanData রো + ফাঁকা CodingData রো
    (SupportLog/CheckerIssue লিস্ট, তাই কোনো রো দরকার নেই) — তারপর
    `/project/[id]` Overview পেজে রিডাইরেক্ট।
  - **Pin/Favorite** — প্রতিটা কার্ডে pin/unpin বাটন (`PUT /api/projects/:id`
    দিয়ে `pinned` টগল)। পিন করা প্রজেক্ট উপরে আলাদা **Pinned** সেকশনে।
  - **Recently Active** সেকশন — বাকি প্রজেক্টগুলো `updated_at` (না থাকলে
    `created_at`) অনুযায়ী descending sort।
- **Backend বদল (A3)**:
  - `projects` টেবিলে নতুন ফিল্ড `pinned` (INTEGER, default 0) ও `updated_at`
    (TEXT) — **মাইগ্রেশন সহ** (`db.js`-এর `migrate()`: পুরনো DB-তে `ALTER
    TABLE` দিয়ে কলাম যোগ করে, `updated_at` backfill `created_at` থেকে)।
  - `POST /api/projects` এখন প্রজেক্টের সাথে ফাঁকা PlanData/CodingData রো-ও
    তৈরি করে।
  - `PUT /api/projects/:id` এখন `pinned` টগল সাপোর্ট করে এবং প্রতিটা update-এ
    `updated_at` বাম্প করে। `current_phase` এখনো এখানে set করা যায় না
    (D1/D2/E1-এর forward-only auto-advance)।

## এই চাংকে ইচ্ছাকৃতভাবে বাকি রাখা হয়েছে (পরের চাংকে)
- Project shell-এর Overview/ট্যাব কনটেন্ট আসলে খালি প্লেসহোল্ডার (A4 থেকে)।
- `Project.current_phase` auto-advance (D1/D2/E1), Settings/AI ON-state
  লজিক (G), `gemini_api_key` encryption (G), Account lazy-reset (B1)।

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
- `Project` রেসপন্সে এখন `pinned` (0/1) ও `updated_at` (ISO string) থাকে।
- Success: single object বা `{ "data": [...] }`; error: `{ "error": "..." }`।
- Dev: backend `npm start` (ডিফল্ট 3001), frontend `npm run dev` (ডিফল্ট 3000);
  frontend-এর `/api/*` reverse proxy হয়ে backend-এ যায়।

## এরপর কী করতে হবে
**চাংক A4 — Project shell: Overview + ৪টা খালি ট্যাব + বেসিক নোট ফিল্ড।**
`/project/[id]` শেল সম্পূর্ণ করো: Overview ট্যাব (নাম, তৈরির তারিখ, বর্তমান
ফেজ, এডিটেবল GitHub লিংক PATCH, ৪টা ট্যাবে শর্টকাট কার্ড), Plan/Coding/
Support Claude/Checker Claude ট্যাবে বেসিক নোট এরিয়া (প্লেইন টেক্সট + সেভ
বাটন), অ্যাক্টিভ ট্যাব হাইলাইট।

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
