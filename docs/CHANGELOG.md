# Work Station Panel — Changelog

## 2026-08-18 — chunk A1 (backend skeleton)
- `backend/` ফোল্ডারে Express + better-sqlite3 API সার্ভার।
- সব entity-র SQLite schema + CRUD রুট: Project, PlanData, CodingData,
  SupportLog, CheckerIssue, Account, Settings (singleton), Note।
- PlanData/CodingData/SupportLog/CheckerIssue সব `project_id` foreign key দিয়ে
  project-scoped (নেস্টেড রুট), project delete-এ cascade।
- Settings singleton; `gemini_api_key` কখনো response-এ ফেরত যায় না (শুধু
  `has_gemini_api_key` boolean)।
- `node --test` দিয়ে integration test suite (৬৭ টা টেস্ট পাস)।

