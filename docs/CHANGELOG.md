# Work Station Panel — Changelog

## 2026-08-18 — chunk A3 (Projects home)
- `/` Projects হোম পেজ ফাংশনাল: প্রজেক্ট কার্ড লিস্ট (নাম, current_phase
  ব্যাজ, সর্বশেষ আপডেটের সময়), কার্ড ক্লিকে `/project/[id]` নেভিগেশন।
- "+ New Project" বাটন — নতুন প্রজেক্ট তৈরি (৪টা খালি ডেটা-সেট সহ: ফাঁকা
  PlanData/CodingData রো, current_phase="Plan") → `/project/[id]` রিডাইরেক্ট।
- Pin/Favorite — প্রজেক্ট pin/unpin টগল, পিন করা প্রজেক্ট আলাদা Pinned
  সেকশনে; বাকিগুলো Recently Active সেকশনে (updated_at অনুযায়ী sort)।
- `projects` টেবিলে `pinned` + `updated_at` ফিল্ড যোগ (মাইগ্রেশন সহ —
  পুরনো DB-তে `ALTER TABLE`, `updated_at` backfill); `POST /api/projects`
  এখন PlanData/CodingData ফাঁকা রো-ও তৈরি করে; `PUT` `pinned` সাপোর্ট করে।
- Frontend-এ `/api` reverse proxy rewrites (Next.js → backend 3001)।
- টেস্ট: New Project ফ্লো, pin/unpin টগল, sort অর্ডার (pinned আগে, তারপর
  recently active), migration test — backend ৭৩ + frontend ২৩ টা টেস্ট পাস;
  `npm run build` সফল।

## 2026-08-18 — chunk A2 (frontend skeleton)
- `frontend/` ফোল্ডারে Next.js (App Router, React 19) অ্যাপ।
- রাউট: `/`, `/accounts`, `/settings`, `/project/[id]` (৫টা ট্যাব sub-route সহ:
  Overview/Plan/Coding/Support Claude/Checker Claude) — সব খালি প্লেসহোল্ডার।
- বেস ডিজাইন টোকেন (কালার, ফন্ট, border-radius) `globals.css`-এ CSS
  variables হিসেবে সেটআপ।
- SideNav (বাম নেভিগেশন রেইল) + ProjectShell/ProjectTabs কম্পোনেন্ট।
- Jest + React Testing Library দিয়ে প্রতিটা রাউটের smoke test (১৫ টা টেস্ট পাস);
  `npm run build` সফল।

## 2026-08-18 — chunk A1 (backend skeleton)
- `backend/` ফোল্ডারে Express + better-sqlite3 API সার্ভার।
- সব entity-র SQLite schema + CRUD রুট: Project, PlanData, CodingData,
  SupportLog, CheckerIssue, Account, Settings (singleton), Note।
- PlanData/CodingData/SupportLog/CheckerIssue সব `project_id` foreign key দিয়ে
  project-scoped (নেস্টেড রুট), project delete-এ cascade।
- Settings singleton; `gemini_api_key` কখনো response-এ ফেরত যায় না (শুধু
  `has_gemini_api_key` boolean)।
- `node --test` দিয়ে integration test suite (৬৭ টা টেস্ট পাস)।

