# Work Station Panel — Changelog

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

