# Work Station Panel — Changelog

## 2026-08-18 — chunk D2 (SupportLog backend + active Claude account tracking)
- **SupportLog API সম্পূর্ণ** — `prompt`/`brief`/`timestamp` entry, সব
  `project_id`-স্কোপড; list এন্ডপয়েন্টে **দুই অর্ডার**: `?order=asc`
  (পুরনো-থেকে-নতুন, scroll history) বা `?order=desc` (**ডিফল্ট**,
  নতুন-থেকে-পুরনো) — `ORDER BY timestamp, id` tiebreak; invalid order → 400।
- **`active_claude_account_id` → নতুন **SupportData** এন্টিটি** (সিদ্ধান্ত:
  plan_data/coding_data-র মতোই আলাদা singleton `support_data` টেবিল; CodingData
  এক্সটেন্ড করা হয়নি) — `GET/POST/PUT/DELETE /api/projects/:projectId/support`,
  claude-type account validation (monkey/অ-অস্তিত্বশীল → 400), `null` দিয়ে
  ক্লিয়ার করা যায়। B1-এর `mark-used`-এর সাথে D3 UI-তে wire হবে।
- `POST /api/projects` এখন ফাঁকা `support_data` রো-ও তৈরি করে; `db.js` SCHEMA।
- **Phase auto-advance (forward-only)** — D1-এরই `maybeAdvancePhase` হেল্পার:
  **প্রথম** SupportLog এন্ট্রি সেভ হলে Plan/Coding → **Support**; already-
  Support/Checker অবস্থায় ওভাররাইট হয় না; শুধু claude account সিলেক্ট →
  advance না।
- টেস্ট: `supportLogs.test.js` (+ordering asc/desc/default/invalid), নতুন
  `supportData.test.js` (CRUD + claude-type validation + upsert + scoped),
  `phaseAdvance.test.js` D2 block (Plan→Support, Coding→Support, Checker
  ওভাররাইট নয়, account select না), `projects.test.js`/`migration.test.js`
  আপডেট — **backend ১৩৪ + frontend ৬২ টা টেস্ট পাস**; `npm run build` সফল;
  লাইভ backend smoke-test সফল।

## 2026-08-18 — chunk D1 (Coding tab — repo link, monkey account select, todo list)
- `app/project/[id]/coding` পেজে NoteArea-র বদলে **CodingTab** client
  কম্পোনেন্ট (`components/project/CodingTab.jsx`) — ৩টা কার্ড + নোট এরিয়া:
  - **GitHub Repo** — Overview-এর `github_link` read-only reuse (ক্লিকেবল
    লিংক; খালি থাকলে "set it in the Overview tab" হিন্ট)।
  - **Active Monkey Account** — B2-এর **AccountMiniWidget** বসানো
    (`filterType="monkey"` + `activeId`): সিলেক্ট করলে
    `PUT /api/projects/:projectId/coding` → `active_monkey_account_id` সেভ,
    তারপর `POST /api/accounts/:id/mark-used` (`last_used_project` =
    project name)। 
  - **Todo Checklist** — `coding_data.todo_list`-এ `{ id, text, done }`
    দিয়ে add/check/delete; পুরনো string-array ডেটা normalize হয়ে render।
- **AccountMiniWidget-এ অপশনাল `filterType` + `activeId` prop** (নন-ব্রেকিং)।
- **Phase auto-advance (forward-only)** — নতুন `backend/src/phaseAdvance.js`
  `maybeAdvancePhase()` `['Plan','Coding','Support','Checker']` অর্ডারে শুধু
  সামনে নেয়। CodingData POST/PUT-এ মাংকি account select বা প্রথম todo add
  হলে Plan→Coding; already-Support/Checker অবস্থায় ওভাররাইট হয় না।
- স্টাইল: `globals.css`-এ coding-tab/coding-repo/coding-account/coding-todos +
  mini-widget active state।
- টেস্ট: backend `phaseAdvance.test.js` (হেল্পার unit + codingData
  integration: Plan→Coding, empty todo/null account advance করে না, past-phase
  ওভাররাইট নয়) + frontend `coding-tab.test.jsx` (repo link, monkey-only
  widget, select → PUT+mark-used, todo CRUD, note area) + mini-widget
  filterType/activeId — **backend ১১৫ + frontend ৬২ টা টেস্ট পাস**;
  `npm run build` সফল; লাইভ proxy smoke-test সফল।

## 2026-08-18 — chunk C2 (Plan tab UI — 4 sub-sections with timestamps)
- `app/project/[id]/plan` পেজে NoteArea-র বদলে **PlanTab** client কম্পোনেন্ট
  (`components/project/PlanTab.jsx`) — ৪টা সাব-সেকশন কার্ড, C1-এর
  `PATCH /api/projects/:projectId/plan/:field`-এ wire:
  - **Basic Plan** (basic_plan), **Master Data Collector Log** +
    **Tool link** (data_collector_log + data_collector_tool_link),
    **Final Master Plan** (final_plan), **Monkey Prompt & Guide File**
    (prompt_guide_file)।
- প্রতিটা সাব-সেকশন নিজের **per-field timestamp** দেখায়
  (`Saved YYYY-MM-DD HH:MM` / "Not saved yet"); PATCH-এ শুধু নিজের
  timestamp বদলায়; tool link সেভে log timestamp বাড়ে।
- সব ম্যানুয়াল (AI Helping/Gemini generate বাটন নেই — গ্রুপ G)।
- GET 404 হলে ফাঁকা সেকশন; save-এ upsert।
- স্টাইল: `globals.css`-এ plan-tab/plan-section block।
- টেস্ট: `frontend/tests/plan-tab.test.jsx` (৪ সেকশন লোড/সেভ, timestamp,
  per-field independence, tool link, 404 empty) + project.test.jsx আপডেট —
  frontend ৫০ + backend ১০৪ টা টেস্ট পাস; `npm run build` সফল; লাইভ
  proxy smoke-test সফল।

## 2026-08-18 — chunk C1 (PlanData backend: 4 fields with independent timestamps)
- `plan_data` singleton রোতে প্রতিটা ফিল্ডের **আলাদা `updated_at` timestamp**
  (basic_plan, data_collector_log, final_plan, prompt_guide_file) — একটা
  ফিল্ড আপডেট করলে শুধু তার timestamp বদলায়।
- নতুন **`PATCH /api/projects/:projectId/plan/:field`** এন্ডপয়েন্ট body
  `{ "value": string | null }` — field-name প্যারামিটার দিয়ে এক ফিল্ড
  আপডেট; রো না থাকলে upsert (201); `value: null` দিলে ফিল্ড + timestamp
  ক্লিয়ার; unknown field / অ-স্ট্রিং value → 400।
- নতুন **`data_collector_tool_link`** কলাম (data_collector_log সাব-সেকশনের
  টুল লিংক) — এডিট করলে `data_collector_log_updated_at`-ই বাড়ে। PUT/POST-ও
  সাপোর্ট করে।
- `db.js`-এ SCHEMA + `migrate()` আপডেট — পুরনো DB-তে tool link কলাম যোগ
  (টেবিল থাকলে; idempotent; A3 legacy DB-তে শুধু projects থাকলে skip)।
- টেস্ট: planData.test.js (per-field timestamp independence, tool link,
  validation, null clear, upsert) + migration.test.js (C1 কলাম যোগ +
  idempotent) — backend ১০৪ টা + frontend ৪৩ টা টেস্ট পাস।

## 2026-08-18 — chunk B2 (AI Accounts page + reusable mini-widget)
- `/accounts` পেজ সম্পূর্ণ (`AccountsList` client কম্পোনেন্ট): টেবিলে Type,
  Label, Login Link (এক-ক্লিক ওপেন), Status (**ম্যানুয়াল টগল** — status dot
  + Available/Limit Reached পিল, PUT দিয়ে সেভ), Last used on/at, Note,
  Edit/Delete অ্যাকশন।
- **Available অ্যাকাউন্ট সবসময় আগে** — `sortAccounts()` (এক জায়গায়,
  mini-widget-ও একই ফাংশন ব্যবহার করে); গ্রুপের মধ্যে label অনুযায়ী।
- **Reset All** বাটন → `POST /api/accounts/reset-all` (B1), **Add/Edit/Delete
  ফর্ম** (`AccountForm`: type/label/login_link/status/note + client-side
  validation)।
- **Reusable mini-widget** (`AccountMiniWidget`) — কমপ্যাক্ট অ্যাকাউন্ট-স্ট্যাটাস
  লিস্ট, নিজে ডেটা ফেচ করে, Available প্রথমে; `onSelect` অপশনাল (গ্রুপ D-তে
  Coding/Support ট্যাবে বসানো হবে)।
- ডিজাইন টোকেন-ভিত্তিক স্টাইল `globals.css`-এ (accounts table, status-dot,
  status-toggle, account-form, mini-widget)।
- টেস্ট: sort order, status টগল, Reset All, add/edit/delete, mini-widget
  render + onSelect — frontend ৪৩ + backend ৯১ টা টেস্ট পাস; `npm run build`
  সফল; লাইভ proxy smoke-test সফল।

## 2026-08-18 — chunk B1 (Account CRUD + daily auto-reset + Reset All + mark-used)
- **Daily auto-reset দুই লেয়ারে** — `node-cron` (best-effort, লোকাল মিডনাইটে
  `0 0 * * *`, `server.js`-এ `setupDailyResetCron`) + **lazy-reset ফলব্যাক**
  (নির্ভরযোগ্য): GET `/api/accounts`-এর শুরুতে `Settings.last_account_reset_date`
  (`YYYY-MM-DD`) চেক — আজকের তারিখ নতুন হলে সব Account available + তারিখ
  আপডেট। ফলে সার্ভার বন্ধ থাকলেও পরের লোডে মিসড রিসেট ধরা পড়ে।
  লজিক `backend/src/accountReset.js`-এ (reset-এ settings singleton
  create/update, `ai_helping_enabled`/`gemini_api_key` প্রিজার্ভ)।
- **Reset All এন্ডপয়েন্ট** — `POST /api/accounts/reset-all` — সব Account
  available + `last_account_reset_date` আজকে (একই দিনে lazy-reset আবার
  ওভাররাইড করে না)।
- **Mark-used এন্ডপয়েন্ট** — `POST /api/accounts/:id/mark-used`
  (`{ last_used_project }`) — last_used_project + last_used_at আপডেট
  (D1/D2 Coding/Support ট্যাব থেকে কল হবে)।
- Account CRUD ভেরিফাই/এক্সটেন্ড (type/label/login_link/status/note/
  last_used_project/last_used_at) — আগে থেকেই A1-এ ছিল, এখন লেআউটে আলাদা
  reset-all + mark-used রুট।
- `node-cron ^4.6.0` dependency যোগ (backend)।
- টেস্ট: lazy-reset mocked date দিয়ে (নতুন দিনে GET → reset + date আপডেট;
  একই দিনে দ্বিতীয় GET → reset না), node-cron mocked scheduler দিয়ে
  best-effort টিক টেস্ট, reset-all, mark-used — backend ৯১ + frontend ৩২
  টা টেস্ট পাস; সব backend ফাইল `node --check` পাস।

## 2026-08-18 — chunk A4 (project shell + overview + basic notes)
- `/project/[id]` শেল সম্পূর্ণ (গ্রুপ A শেষ — Phase 1 skeleton complete)।
- Overview ট্যাব: নাম, তৈরির তারিখ, বর্তমান ফেজ ব্যাজ, GitHub লিংক এডিটেবল
  ফিল্ড (PUT `/api/projects/:id` দিয়ে সেভ), ৪টা ট্যাবে শর্টকাট কার্ড।
- Plan / Coding / Support Claude / Checker Claude ট্যাবে বেসিক নোট এরিয়া
  (প্লেইন টেক্সট + সেভ) — notes API-তে `project:<id>:<tab>` ক্যাটাগরিতে
  সেভ/লোড। আসল ফিচার গ্রুপ C/D/E-তে।
- অ্যাক্টিভ ট্যাব হাইলাইট (aria-current + design tokens)।
- `ProjectShell` client কম্পোনেন্ট — হেডারে প্রজেক্টের নাম দেখায়।
- টেস্ট: ৫-ট্যাব নেভিগেশন, github_link edit+save, note save/load — frontend
  ৩২ + backend ৭৩ টা টেস্ট পাস; `npm run build` সফল।

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

