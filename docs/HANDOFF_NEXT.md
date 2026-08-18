# HANDOFF_NEXT — বর্তমান অবস্থা

## এখন পর্যন্ত কী শেষ (chunk A1 — Backend skeleton)
- `backend/` ফোল্ডারে **Express + SQLite (better-sqlite3)** API সার্ভার বানানো হয়েছে।
- **DB লাইব্রেরি**: `better-sqlite3` (সিঙ্ক্রোনাস, হালকা, স্কিমা নিয়ন্ত্রণ সহজ —
  Sequelize-এর ভারী ORM-এর দরকার ছিল না)।
- **টেস্ট ফ্রেমওয়ার্ক**: Node.js বিল্ট-ইন `node --test` (কোনো অতিরিক্ত
  ডিপেন্ডেন্সি নেই, `npm test` দিয়ে চলে)।
- সব entity-র টেবিল + CRUD রুট:
  - `Project` — creation-এ `current_phase` সবসময় `"Plan"` (auto-advance
    লজিক D1/D2/E1-এ)
  - `PlanData` — প্রতিটা ফিল্ডের আলাদা `*_updated_at` timestamp
  - `CodingData` — `active_monkey_account_id` (monkey-type account ভেরিফায়েড),
    `todo_list` (JSON array হিসেবে round-trip)
  - `SupportLog`
  - `CheckerIssue` — `source` (self/claude) ভ্যালিডেশন, `resolved`/`archived` bool
  - `Account` — `type` (monkey/claude), `status` (available/limit_reached)
  - `Settings` — **singleton (id=1)**; `gemini_api_key` কখনো response-এ
    ফেরত যায় না, শুধু `has_gemini_api_key` boolean। (এনক্রিপশন লজিক G-গ্রুপে)
  - `Note` — `pinned` bool, `?category=` / `?pinned=` ফিল্টার
- **Hard constraint পূরণ**: PlanData/CodingData/SupportLog/CheckerIssue সব
  `project_id` foreign key দিয়ে স্কোপড (নেস্টেড রুট
  `/api/projects/:projectId/...`), project delete হলে `ON DELETE CASCADE`।
  Settings একটাই singleton রো।

## API রুট ম্যাপ (A2-এর জন্য)
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
- Success: single object বা `{ "data": [...] }`; error: `{ "error": "..." }`।
- সার্ভার: `npm start` (PORT env, ডিফল্ট 3001), `npm run dev` (watch mode),
  ডাটাবেস ফাইল `backend/data/work-station-panel.db` (gitignore করা আছে)।

## এই চাংকে ইচ্ছাকৃতভাবে বাকি রাখা হয়েছে (পরের চাংকে)
- `Project.current_phase`-এর forward-only auto-advance লজিক (D1/D2/E1)
- Settings/AI ON-state লজিক (গ্রুপ G)
- `gemini_api_key`-এর real encryption (গ্রুপ G)
- Account lazy-reset (`last_account_reset_date`) লজিক (B1)
- কোনো frontend UI নেই

## এরপর কী করতে হবে
**চাংক A2 — Frontend skeleton (Next.js + routing + বেস ডিজাইন টোকেন)।**
- `frontend/` ফোল্ডারে React/Next.js অ্যাপ: `/`, `/accounts`, `/settings`,
  `/project/[id]` (ভেতরে Overview/Plan/Coding/Support Claude/Checker Claude
  ট্যাব) — সব খালি প্লেসহোল্ডার পেজ।
- ডিজাইন সিস্টেম টোকেন সেটআপ (কালার প্যালেট, ফন্ট, border-radius)।
- টেস্ট: প্রতিটা রাউটের basic smoke test (React Testing Library)।
- API কল এখনো ওয়্যার করবে না (A3-A4 থেকে)।

## রেফারেন্স
- `docs/WORK_STATION_PANEL_GITHUB_CHUNK_PLAN.md` — সম্পূর্ণ চাংক প্ল্যান।

## কনভেনশন
- single source of truth রাখা, duplicate না করে import করা।
- `.env`/real API key (Gemini) কখনো commit হবে না।
- সব entity `project_id` দিয়ে স্কোপড রাখা (multi-project সাপোর্টের জন্য)।
- প্রজেক্ট-স্কোপড রিসোর্সের রুট নেস্টেড প্যাটার্ন ব্যবহার করবে
  (`/api/projects/:projectId/...`)।
