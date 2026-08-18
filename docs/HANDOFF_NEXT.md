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

### chunk B1 — Account CRUD + auto-reset + Reset All + mark-used (✅)
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

### chunk B2 — AI Accounts পেজ + reusable mini-widget (গ্রুপ B শেষ ✅)
- `/accounts` পেজ সম্পূর্ণ (client কম্পোনেন্ট `components/accounts/AccountsList.jsx`):
  - টেবিলে Type, Label, Login Link (এক-ক্লিক ওপেন, `target="_blank"`), Status
    (**ম্যানুয়াল টগল** — status dot + Available/Limit Reached পিল, PUT দিয়ে),
    Last used on (project), Last used at (mono টাইমস্ট্যাম্প), Note, Edit/Delete।
  - **Available সবসময় আগে, Limit Reached নিচে** — `sortAccounts()`
    (`components/accounts/accountUtils.js`, single source of truth; গ্রুপের
    মধ্যে label অনুযায়ী)।
  - **Reset All** বাটন → `POST /api/accounts/reset-all` (B1)।
  - **Add/Edit/Delete ফর্ম** — `components/accounts/AccountForm.jsx`
    (type/label/login_link/status/note; client-side validation)।
  - loading/error/empty state।
- **Reusable mini-widget** — `components/accounts/AccountMiniWidget.jsx`
  (কমপ্যাক্ট অ্যাকাউন্ট-স্ট্যাটাস লিস্ট, Available প্রথমে; নিজে `/api/accounts`
  ফেচ করে; `onSelect` অপশনাল — গ্রুপ D-তে Coding/Support ট্যাবে বসানো হবে)।
- ডিজাইন টোকেন ব্যবহার করে `globals.css`-এ accounts/table/status-dot/form/
  mini-widget স্টাইল যোগ।
- **টেস্ট** (`frontend/tests/accounts.test.jsx`): sort order (available প্রথমে),
  status টগল, Reset All, add/edit/delete ফর্ম, mini-widget render + onSelect —
  frontend ৪৩ টা + backend ৯১ টা টেস্ট পাস; `npm run build` সফল; লাইভ
  backend+dev proxy-তে smoke-test সফল।

## গ্রুপ C — Plan ট্যাব (Phase 3)

### chunk C1 — PlanData backend wiring (৪ সাব-সেকশন + timestamps) (এই চাংক ✅)
- `plan_data` singleton রো প্রতি প্রজেক্টে, ৪টা টেক্সট ফিল্ড:
  **basic_plan**, **data_collector_log** (+ নতুন **data_collector_tool_link**
  টুল লিংক ফিল্ড), **final_plan**, **prompt_guide_file**।
- প্রতিটা ফিল্ডের **আলাদা `updated_at` timestamp** (`basic_plan_updated_at`
  ইত্যাদি) — একটা ফিল্ড আপডেট হলে শুধু তার timestamp বদলায়।
  `data_collector_tool_link` নিজে আলাদা timestamp পায় না — এডিট করলে
  `data_collector_log_updated_at` বাড়ে (একই সাব-সেকশন)।
- **PATCH এন্ডপয়েন্ট** — `PATCH /api/projects/:projectId/plan/:field` body
  `{ "value": string | null }` — field-name প্যারামিটার দিয়ে একটার-একটা
  ফিল্ড আপডেট (রো না থাকলে upsert, 201); `value: null` দিলে ফিল্ড + তার
  timestamp মুছে যায়। Allowed fields: basic_plan, data_collector_log,
  data_collector_tool_link, final_plan, prompt_guide_file।
- PUT/POST-ও tool link সাপোর্ট করে (PUT partial-update + upsert)।
- `db.js` SCHEMA + `migrate()` — পুরনো DB-তে `data_collector_tool_link`
  কলাম যোগ (টেবিল থাকলে; idempotent)।
- **টেস্ট** (`planData.test.js` + `migration.test.js`): প্রতিটা ফিল্ড
  আলাদা PATCH-এ শুধু নিজের timestamp বদলানো, tool link → log timestamp
  bump, unknown field/অ-স্ট্রিং value 400, value null clear, upsert, PUT
  tool link, migration — backend ১০৪ টা + frontend ৪৩ টা টেস্ট পাস;
  সব ফাইল `node --check` পাস; লাইভ smoke-test সফল।

### chunk C2 — Plan ট্যাব UI (৪ সাব-সেকশন কার্ড + timestamps) (গ্রুপ C শেষ ✅)
- `app/project/[id]/plan/page.js`-তে NoteArea-র বদলে **PlanTab** client
  কম্পোনেন্ট (`components/project/PlanTab.jsx`) — ৪টা সাব-সেকশন কার্ড,
  প্রতিটা C1-এর `PATCH /plan/:field` এন্ডপয়েন্টে wire:
  1. **Basic Plan** (`basic_plan`) — প্রাথমিক আইডিয়া নোট এরিয়া
  2. **Master Data Collector Log** (`data_collector_log`) + **Tool link**
     (`data_collector_tool_link`) — লগ টেক্সট + টুল লিংক ইনপুট
  3. **Final Master Plan** (`final_plan`) — ফাইনাল প্ল্যান পেস্ট
  4. **Monkey Prompt & Guide File** (`prompt_guide_file`) — ফাইনাল প্রম্পট/গাইড
- প্রতিটা সাব-সেকশনে **সেভ-করা per-field timestamp** দেখায়
  (`Saved YYYY-MM-DD HH:MM`, no timestamp হলে "Not saved yet"); লগ সেকশনের
  timestamp-ই tool link-এরও (C1 কনভেনশন)।
- সব **ম্যানুয়াল** — কোনো AI Helping/Gemini generate বাটন নেই (গ্রুপ G-তে
  AI ON-state এ সাব-সেকশন ৩/৪-এ বাটন যুক্ত হবে)।
- GET 404 হলে (রো নেই) ফাঁকা সেকশন রেন্ডার; PATCH save-এ upsert।
- **টেস্ট** (`frontend/tests/plan-tab.test.jsx` + project.test.jsx আপডেট):
  ৪টা সাব-সেকশন সেভ/লোড, টিমস্ট্যাম্প সঠিক দেখানো, per-field timestamp
  independence (PATCH-এ শুধু নিজের টাইমস্ট্যাম্প বদলায়), tool link save →
  log timestamp, 404 empty state — backend ১০৪ টা + frontend ৫০ টা টেস্ট
  পাস; `npm run build` সফল; লাইভ backend+dev proxy smoke-test সফল।

## গ্রুপ D — Coding + Support Claude (Phase 4)

### chunk D1 — Coding ট্যাব (repo link + monkey account select + todo list) (এই চাংক ✅)
- `app/project/[id]/coding` পেজে NoteArea-র বদলে **CodingTab** client
  কম্পোনেন্ট (`components/project/CodingTab.jsx`) — ৩টা কার্ড + নোট এরিয়া:
  1. **GitHub Repo** — Overview-এর `github_link` এখানে read-only reuse
     (ক্লিকেবল লিংক; খালি থাকলে "set it in the Overview tab" হিন্ট)।
  2. **Active Monkey Account** — B2-এর **AccountMiniWidget** বসানো
     (`filterType="monkey"` + `activeId` highlight): সিলেক্ট করলে
     `PUT /api/projects/:projectId/coding`-এ `active_monkey_account_id` সেভ
     হয়, তারপর B1-এর `POST /api/accounts/:id/mark-used` কল হয়
     (`last_used_project` = project name → `last_used_at` আপডেট)।
  3. **Todo Checklist** — `coding_data.todo_list` (JSON array of
     `{ id, text, done }`) দিয়ে add/check(toggle)/delete; প্রতিটা মিউটেশনে
     পুরো list `PUT /coding` দিয়ে সেভ। পুরনো string-array ডেটাও
     normalize করে render হয়।
  4. NoteArea (`project:<id>:coding` ক্যাটাগরি)।
- **AccountMiniWidget-এ অপশনাল `filterType` + `activeId` prop** যোগ (নন-ব্রেকিং;
  `/accounts` পেজ/টেস্ট অপরিবর্তিত)।
- **Phase auto-advance (forward-only)**: নতুন `backend/src/phaseAdvance.js` —
  `maybeAdvancePhase(db, projectId, targetPhase)` `['Plan','Coding','Support',
  'Checker']` অর্ডারে শুধু সামনের দিকে নেয় (updated_at-ও bump)। CodingData
  POST/PUT-এ **মাংকি অ্যাকাউন্ট সিলেক্ট বা প্রথম todo অ্যাড** হলে
  `maybeAdvancePhase(..., 'Coding')`; already-Support/Checker অবস্থায়
  ওভাররাইট হয় না। (D2 একই হেল্পার দিয়ে →Support করবে।)
- **টেস্ট**: `backend/tests/phaseAdvance.test.js` (হেল্পার unit + codingData
  integration: Plan→Coding account select/todo add, empty todo/null account
  advance করে না, Support/Checker-এ ওভাররাইট হয় না) + `frontend/tests/
  coding-tab.test.jsx` (repo link/hint, monkey-only list, current account,
  select → PUT + mark-used call, todo add/toggle/delete, note area) +
  accounts.test.jsx-এ mini-widget filterType/activeId — **backend ১১৫ টা +
  frontend ৬২ টা টেস্ট পাস**; `npm run build` সফল; লাইভ backend+dev proxy
  smoke-test সফল (Plan→Coding auto-advance, forward-only নিয়ম)।

## API রুট ম্যাপ (frontend-এ wire করার জন্য)
```
GET/POST    /api/projects
GET/PUT/DELETE /api/projects/:id
GET/POST/PUT/PATCH/DELETE /api/projects/:projectId/plan    (PlanData singleton; PATCH /plan/:field — এক ফিল্ড, শুধু তার timestamp)
                                                            (fields: basic_plan, data_collector_log, data_collector_tool_link, final_plan, prompt_guide_file)
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
  `current_phase` PUT-এ set করা যায় না — forward-only auto-advance
  (`maybeAdvancePhase`): CodingData-তে account select/todo add →
  Plan→Coding (D1); D2-এ প্রথম SupportLog → →Support।
- Success: single object বা `{ "data": [...] }`; error: `{ "error": "..." }`।
- Dev: backend `npm start` (ডিফল্ট 3001), frontend `npm run dev` (ডিফল্ট 3000);
  frontend-এর `/api/*` reverse proxy হয়ে backend-এ যায়।

## এরপর কী করতে হবে
**গ্রুপ D (Phase 4 — Coding + Support Claude) শুরু, D1 (Coding ট্যাব) সম্পূর্ণ,
ম্যানুয়াল মোডে।** পরের কাজ: **chunk D2 (SupportLog backend + active Claude
account tracking)** — D2-এ SupportLog CRUD/ordering, `active_claude_account_id`
(CodingData-তেই বা নতুন entity), B1-এর mark-used (type=claude), আর D1-এরই
`maybeAdvancePhase` প্যাটার্নে →Support auto-advance। প্রম্পট
`docs/WORK_STATION_PANEL_GITHUB_CHUNK_PLAN.md`-এ (D1 লাইন ~690; D2 লাইন ~732)।

## রেফারেন্স
- `docs/WORK_STATION_PANEL_GITHUB_CHUNK_PLAN.md` — সম্পূর্ণ চাংক প্ল্যান
  (B2 সেকশন, লাইন ~565; C1 সেকশন, লাইন ~606; C2 সেকশন, লাইন ~643; D1
  সেকশন, লাইন ~690; D2 সেকশন, লাইন ~732)।

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
