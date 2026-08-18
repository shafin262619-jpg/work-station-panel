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
- রাউট স্ট্রাকচার (সব খালি প্লেসহোল্ডার):
  - `/` → Projects হোম
  - `/accounts` → AI Accounts
  - `/settings` → Settings
  - `/project/[id]` → Project shell + **৫টা ট্যাব** (Overview, Plan, Coding,
    Support Claude, Checker Claude)। ট্যাবগুলো আলাদা sub-route:
    `/project/[id]` (Overview), `/project/[id]/plan`, `/project/[id]/coding`,
    `/project/[id]/support`, `/project/[id]/checker`।
- বেস ডিজাইন টোকেন `app/globals.css`-এর `:root`-এ CSS variables হিসেবে:
  - কালার: `--color-base` (#0B0C0F), `--color-surface` (#15161B),
    `--color-surface-elevated` (#1D1F26), `--color-hairline` (#2A2C34),
    `--color-rim-glow` (#4A4F5C), `--color-text-primary` (#E8E9ED),
    `--color-text-muted` (#8B8D97), `--color-status-available` (#5FD48A),
    `--color-status-limit-reached` (#E5637A)
  - ফন্ট: `--font-display` (Inter Tight/General Sans), `--font-body` (Inter),
    `--font-mono` (JetBrains Mono/IBM Plex Mono) — system fallback stack
  - radius: `--radius-sm/md/lg` (16/18/20px), `--radius-global` (18px)
- কম্পোনেন্ট: `SideNav` (বামে নেভিগেশন রেইল), `ProjectShell` + `ProjectTabs`।
- **টেস্ট ফ্রেমওয়ার্ক (frontend)**: **Jest + React Testing Library**
  (`npm test`); প্রতিটা রাউটের smoke test — মোট ১৫টা টেস্ট পাস।
- `next.config.mjs`-এ `experimental.allowedHosts: ['.monkeycode-ai.live']`
  (preview host allow-এর জন্য)।

## এই চাংকে ইচ্ছাকৃতভাবে বাকি রাখা হয়েছে (পরের চাংকে)
- কোনো পেজের আসল ফিচার লজিক নেই (খালি প্লেসহোল্ডার)।
- API কল ওয়্যার করা হয়নি (A3-A4 থেকে)।
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
- Success: single object বা `{ "data": [...] }`; error: `{ "error": "..." }`।
- Dev: backend `npm start` (ডিফল্ট 3001), frontend `npm run dev` (ডিফল্ট 3000)।

## এরপর কী করতে হবে
**চাংক A3 — Projects হোম (frontend)।** Project list + create UI, API কল
ওয়্যার করা (backend-এর `/api/projects`), project-এর `current_phase` ব্যাজ,
project shell-এ click করে `/project/[id]`-এ যাওয়া।

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
