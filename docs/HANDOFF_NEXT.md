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
  Node.js বিল্ট-ইন `node --test`।

### chunk A2 — Frontend skeleton
- `frontend/` ফোল্ডারে **Next.js (App Router, React 19)** অ্যাপ।
- বেস ডিজাইন টোকেন `app/globals.css`-এর `:root`-এ CSS variables হিসেবে।
- `next.config.mjs`-এ `/api/:path*` → `http://127.0.0.1:3001` reverse proxy
  rewrites।

### chunk A3 — Projects হোম
- `/` পেজ ফাংশনাল: প্রজেক্ট কার্ড (নাম, current_phase ব্যাজ, updated_at),
  "+ New Project" (তৈরি → `/project/[id]` রিডাইরেক্ট), pin/unpin টগল
  (**Pinned** সেকশন উপরে), **Recently Active** সেকশন (updated_at sort)।

### chunk A4 — Project shell (গ্রুপ A শেষ — Phase 1 skeleton complete)
- `/project/[id]` শেল সম্পূর্ণ: Overview ট্যাব (নাম, তৈরির তারিখ, ফেজ ব্যাজ,
  **GitHub লিংক এডিটেবল**), Plan/Coding/Support Claude/Checker Claude ট্যাবে
  বেসিক নোট এরিয়া (`project:<id>:<tab>` ক্যাটাগরি), ৫-ট্যাব নেভিগেশন UI।
- `ProjectShell` client কম্পোনেন্ট; Jest + RTL (৩২ টা টেস্ট); `npm run build` সফল।

## গ্রুপ B — AI Accounts ম্যানেজার (Phase 2)

### chunk B1 — Account CRUD + auto-reset + Reset All + mark-used (এই চাংক ✅)
- **Account CRUD সম্পূর্ণ** — ফিল্ড: type (monkey/claude), label, login_link,
  status (available/limit_reached), note, last_used_project, last_used_at।
- **Daily auto-reset দুই লেয়ারে**:
  - `node-cron` (best-effort) — সার্ভার চালু থাকলে লোকাল মিডনাইটে
    (`0 0 * * *`) `backend/src/server.js`-এ `setupDailyResetCron(db)` চালায়
    (node-cron ^4.6.0, `backend/package.json`-এ যোগ)।
  - **Lazy-reset ফলব্যাক (নির্ভরযোগ্য মেকানিজম)** — `Settings.last_account_reset_date`
    (`YYYY-MM-DD`) দিয়ে: GET `/api/accounts` (লিস্ট) কলের শুরুতে চেক হয়
    আজকের লোকাল তারিখ `last_account_reset_date`-এর চেয়ে নতুন কিনা — হলে সব
    Account "available" + তারিখ আজকে আপডেট হয়। ফলে সার্ভার বন্ধ থাকাকালীন
    মিসড রিসেট পরের লোডেই ধরা পড়ে। লজিক `backend/src/accountReset.js`-এ
    (`getTodayKey`, `runDailyReset`, `maybeRunLazyReset`, `setupDailyResetCron`)।
  - `runDailyReset` settings singleton তৈরি/আপডেট করে; `ai_helping_enabled`/
    `gemini_api_key` প্রিজার্ভ হয়।
- **Reset All এন্ডপয়েন্ট** — `POST /api/accounts/reset-all` — সব Account
  available + `last_account_reset_date` আজকে (একই দিনে lazy-reset আর
  ওভাররাইড করে না)।
- **Mark-used এন্ডপয়েন্ট** — `POST /api/accounts/:id/mark-used`
  (`{ last_used_project }` বাধ্যতামূলক) — last_used_project +
  last_used_at (now) আপডেট করে (D1/D2 Coding/Support ট্যাব থেকে কল হবে)।
- **টেস্ট**: `accountReset.test.js` (lazy-reset mocked date দিয়ে — নতুন
  তারিখে GET করলে reset + `last_account_reset_date` আপডেট, একই দিনে দ্বিতীয়
  কল করলে reset না; node-cron mocked scheduler দিয়ে best-effort টিক টেস্ট;
  `runDailyReset`/`maybeRunLazyReset` ইউনিট) + `accounts.test.js`-এ
  reset-all/mark-used ইন্টিগ্রেশন। Backend ৯১ টা + frontend ৩২ টা টেস্ট পাস।

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
GET/POST    /api/accounts                                  (GET-এ lazy auto-reset আগে চলে)
POST        /api/accounts/reset-all                        (সব available + আজকের reset date)
GET/PUT/DELETE /api/accounts/:id
POST        /api/accounts/:id/mark-used                    ({ last_used_project } — D1/D2 থেকে কল হবে)
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
**B2 — AI Accounts পেজ + mini-widget** (গ্রুপ B-এর শেষ চাংক): `/accounts`
পেজ পূর্ণ করা (Type/Label/Login Link/Status ব্যাজ/note/লাস্ট ইউজ + filter +
sort + "Reset All" বাটন + নতুন Account যোগ), আর Overview/পাশে একটা mini-widget
যেখান থেকে quick-select করা যাবে। প্রম্পট
`docs/WORK_STATION_PANEL_GITHUB_CHUNK_PLAN.md`-এ। B2-এর mini-widget-টা
D1/D2-এ Coding/Support ট্যাবে account সিলেকশনে রিইউজ হবে (mark-used-এর সাথে
ওয়্যার করা)।

## রেফারেন্স
- `docs/WORK_STATION_PANEL_GITHUB_CHUNK_PLAN.md` — সম্পূর্ণ চাংক প্ল্যান
  (B1 সেকশন, লাইন ~511)।

## কনভেনশন
- single source of truth রাখা, duplicate না করে import করা।
- `.env`/real API key (Gemini) কখনো commit হবে না।
- সব entity `project_id` দিয়ে স্কোপড রাখা (multi-project সাপোর্টের জন্য)।
- প্রজেক্ট-স্কোপড রিসোর্সের রুট নেস্টেড প্যাটার্ন ব্যবহার করবে
  (`/api/projects/:projectId/...`)।
- Frontend: App Router (server components by default), ডিজাইন টোকেন
  `globals.css`-এর CSS variables থেকে import।
- ডেটা/তারিখ লোকাল টাইমজোন-ভিত্তিক (`getTodayKey` local date) — lazy-reset
  আর cron দুটোই একই লোকাল-ডে কনভেনশনে।
