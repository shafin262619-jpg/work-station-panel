# Work Station Panel — GitHub-ভিত্তিক Multi-Agent চাংক এক্সিকিউশন প্ল্যান

**উৎস:** এই প্ল্যানটা `Work_Station_Panel_Master_Plan.md`-এ বর্ণিত পুরো
প্রোডাক্ট প্ল্যানকে (কোনো তথ্য বাদ না দিয়ে) `MASTER_PROMPT_GITHUB_CHUNK_PLANNER.md`-এ
বর্ণিত আর্কিটেকচার/নিয়ম অনুযায়ী একটা GitHub-ভিত্তিক, ছোট-ছোট-চাংক,
copy-paste-ready প্রম্পট প্ল্যানে রূপান্তর করে বানানো হয়েছে (একই স্টাইল যা
`GITHUB_AGENT_HANDOFF_PLAN.md`-এ ব্যবহার হয়েছিল)।

**⚠️ সংশোধনী (গভীর ভেরিফিকেশনের পর ঠিক করা হয়েছে ৩টা ফাংশনাল গ্যাপ):**

1. **`current_phase` কখনো এগোতো না** — আগের ভার্সনে Project.current_phase
   শুধু creation-এ ("Plan") আর Send-back-to-Plan-এ সেট হতো, মাঝে কখনো
   Coding/Support/Checker-এ auto-advance করার লজিক ছিল না — ফলে Projects
   হোমের "বর্তমান ফেজ" ব্যাজ বাস্তবে সবসময় "Plan"-এ আটকে থাকত। এখন D1
   (→Coding), D2 (→Support), E1 (→Checker)-এ forward-only auto-advance
   যোগ করা হয়েছে।
2. **Auto-reset শুধু cron-নির্ভর ছিল** — এই টুলটা ব্যক্তিগত ব্যবহারের জন্য,
   সার্ভার সবসময় চালু নাও থাকতে পারে, তাই মিডনাইট cron মিস হয়ে যেতে
   পারতো। B1-এ এখন `Settings.last_account_reset_date` দিয়ে একটা
   lazy-reset ফলব্যাক যোগ করা হয়েছে যা প্রতিবার Accounts লোড হওয়ার সময়
   চেক করবে।
3. **Send-back-to-Plan-এর পর পুরনো CheckerIssue জঞ্জাল হতো** — নতুন
   সাইকেল শুরু হলেও আগের সাইকেলের ইস্যুগুলো Checker ট্যাবে থেকে যেত,
   নতুনগুলোর সাথে মিশে যেত। এখন CheckerIssue-তে `archived` ফিল্ড যোগ করে
   E1/E2-এ প্রতি সাইকেলে আর্কাইভ + একটা "History" টগল যোগ করা হয়েছে।
4. **Settings-এর "singleton row" আসলে enforce হচ্ছিল না** — শুধু বলা ছিল
   "একটাই রো হবে" কিন্তু কোনো চাংকে সেটা কীভাবে নিশ্চিত হবে লেখা ছিল না —
   বারবার POST কল হলে একাধিক Settings রো তৈরি হয়ে যেতে পারতো, তখন AI
   Helping টগল/Gemini key/reset-date কোনটা "আসল" তা অনির্দিষ্ট হয়ে যেত।
   G1-এ এখন hardcoded id=1 + GET/PUT-only + auto-create পদ্ধতি যোগ করা
   হয়েছে।

নিচে ডেটা মডেল টেবিল, A1, B1, D1, D2, E1, E2, G1 — এই চাংকগুলোতে ⚠️
চিহ্ন দিয়ে ঠিক কোথায় বদল হয়েছে মার্ক করা আছে।

## এই ডকুমেন্ট কীভাবে ব্যবহার করবেন

1. নিচের **ধাপ ০** ফলো করে একবারের জন্য একটা খালি GitHub repo বানান।
2. **গ্রুপ A** থেকে শুরু করে ক্রমানুসারে (A1→A2→...→I2) প্রতিটা চাংক-প্রম্পট
   Monkey AI বা Claude Code-এ কপি-পেস্ট করে দিন। প্রতিটা চাংক আগেরটার উপর
   ভিত্তি করে বানানো, তাই ক্রম ভাঙবেন না।
3. প্রতিটা চাংক শেষে agent নিজেই push + tag করবে — পরের চাংক শুরু করার আগে
   GitHub-এ গিয়ে tag/কমিট/`docs/HANDOFF_NEXT.md` ঠিকমতো আপডেট হয়েছে কিনা
   একবার নিজে চোখ বুলিয়ে নিন।
4. কোনো চাংক আটকে গেলে বা ভুল করলে — একদম নিচের **"কোনো চাংক ভুল করলে"**
   সেকশন দেখুন।

---

## অনুমান (Assumptions)

মূল প্ল্যান থেকে যা অপরিবর্তিত রাখা হয়েছে:

- এটা একার ব্যবহারের জন্য — মাল্টি-ইউজার লগইন সিস্টেম প্রথম ভার্সনে নেই।
- ডেটা persist করতে হবে (ব্রাউজার বন্ধ করলে হারাবে না) — তাই localStorage
  না, হালকা backend + database (Node/Express + SQLite) ব্যবহার হবে।
- Monkey বা Master Data Collector-এর কোনো public API নেই ধরে নেওয়া
  হয়েছে — এই প্যানেল একটা **organizing/tracking dashboard**, automation
  টুল না।
- আপাতত শুধু **Gemini API** ব্যবহার হবে; AI ফিচারগুলো Settings-এর একটা
  মাস্টার টগল দিয়ে ON/OFF করা যাবে — OFF থাকলে পুরো সিস্টেম ১০০% ম্যানুয়াল।

এই GitHub-chunk প্ল্যান বানানোর জন্য নতুন যা ধরে নেওয়া হয়েছে (মূল প্ল্যানে
উল্লেখ ছিল না বলে যুক্তিসঙ্গত ডিফল্ট হিসেবে):

- **নতুন প্রজেক্ট** (শুরু থেকে বানানো), existing কোড নেই।
- **এক্সিকিউশন এজেন্ট**: Monkey AI এবং/অথবা Claude Code — দুটোতেই একই
  প্রম্পট কাজ করবে (নিচের "Monkey বনাম Claude" নোট দেখুন)।
- **OS**: Linux (Xubuntu ধরা হয়েছে, আপনার আগের প্রজেক্টের সাথে মিলিয়ে) —
  অন্য OS হলে ধাপ ০-এর কমান্ডগুলো সামান্য বদলাবে, বলবেন আপডেট করে দেব।
- **GitHub experience**: একদম বিগিনার ধরে ধাপ ০ ক্লিক-বাই-ক্লিক লেখা হয়েছে।
- **চাংক সাইজ**: ডিফল্ট অনুযায়ী যতটা সম্ভব ছোট চাংক — মোট **২৭টা চাংক**,
  ৯টা গ্রুপে (A–I) ভাগ করা, মূল প্ল্যানের Phase 1–9 রোডম্যাপের সাথে
  ১-এর-সাথে-১ ম্যাপ করা।
- ভুল অনুমান হলে বলবেন, প্ল্যান আপডেট করে দেব।

---

## Monkey AI বনাম Claude — কোনটা ব্যবহার করবেন

- **Monkey AI:** GitHub বাইন্ড করা থাকলে নিচের প্রতিটা প্রম্পট সরাসরি
  পেস্ট করলেই কাজ করা উচিত।
- **Claude:** এই ধরনের কাজের জন্য সবচেয়ে সঠিক টুল **Claude Code**
  (command line / desktop / mobile থেকে অ্যাক্সেসযোগ্য) — নিজের মেশিনে
  টার্মিনাল হিসেবে চলে বলে real `git clone`/`push` করতে পারে। plain
  claude.ai chat (browser/mobile, Code ছাড়া)-এর built-in code-tool-এ
  সাধারণত ইন্টারনেট বন্ধ থাকে, তাই সেখানে সরাসরি `git push` কাজ নাও করতে
  পারে।
- **বোনাস (ঐচ্ছিক):** Claude Code-এর official GitHub Actions integration
  (`/install-github-app`) দিয়ে `@claude` মেনশন করলেই কাজ করে — পুরোপুরি
  অটোমেটেড, কিন্তু সাধারণত আলাদা Anthropic API key/billing লাগে (claude.ai
  সাবস্ক্রিপশনের বাইরে)। বিস্তারিত/আপ-টু-ডেট শর্তের জন্য
  [code.claude.com/docs/en/github-actions](https://code.claude.com/docs/en/github-actions)
  চেক করে নেবেন।

---

## ধাপ ০ — একবারের জন্য GitHub Repo বানানো (Xubuntu, বিগিনার-ফ্রেন্ডলি)

### ০.১ — Terminal খুলুন
Whisker Menu → "Terminal" সার্চ → "Terminal Emulator" (অথবা `Ctrl+Alt+T`)।

### ০.২ — Git চেক/ইনস্টল
```bash
git --version
sudo apt update && sudo apt install git -y   # না থাকলে
```

### ০.৩ — Git-কে নাম/ইমেইল বলুন (একবারই লাগবে)
```bash
git config --global user.name "আপনার নাম"
git config --global user.email "আপনার-ইমেইল@example.com"
```

### ০.৪ — GitHub CLI ইনস্টল
```bash
sudo snap install gh
```

### ০.৫ — GitHub-এ লগইন
```bash
gh auth login
```
প্রশ্নগুলোতে ক্রমান্বয়ে বাছাই করুন: `GitHub.com` → `HTTPS` →
`Authenticate Git with your GitHub credentials?` = `Yes` →
`Login with a web browser`। কোড দেখাবে, `Enter` চাপুন — ব্রাউজার খুলবে,
"Continue" → "Authorize github" ক্লিক করুন। টার্মিনালে `✓ Logged in as ...`
দেখলে সফল।

### ০.৬ — লোকাল প্রজেক্ট ফোল্ডার বানান
```bash
mkdir -p ~/projects/work-station-panel
cd ~/projects/work-station-panel
```

### ০.৭ — GitHub ওয়েবসাইটে খালি নতুন repo বানান
1. `github.com` → উপরে-ডানে `+` → **"New repository"**।
2. **Repository name**: `work-station-panel`।
3. **Private** বাছাই করুন।
4. **⚠️ "Add a README file" চেকবক্সে টিক দেবেন না** — খালি repo বানাতে হবে।
5. সবুজ **"Create repository"** বাটন ক্লিক করুন।
6. যে URL দেখাবে (`https://github.com/আপনার-ইউজারনেম/work-station-panel.git`) কপি রাখুন।

### ০.৮ — docs ফোল্ডার + baseline commit
```bash
mkdir docs

cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
*.db
*.sqlite
*.sqlite3
.next/
dist/
build/
.DS_Store
EOF

echo "# Work Station Panel — Changelog" > docs/CHANGELOG.md
```

এবার নিচের টেমপ্লেট কপি করে টেক্সট এডিটরে (Mousepad) পেস্ট করে
`docs/HANDOFF_NEXT.md` নামে সেভ করুন:

```markdown
# HANDOFF_NEXT — বর্তমান অবস্থা

## এখন পর্যন্ত কী শেষ
- এখনো কিছুই শুরু হয়নি — এটা baseline commit।

## এরপর কী করতে হবে
**চাংক A1 — Backend skeleton (Express + SQLite + সব entity-র schema)।**
পুরো প্রম্পট repo-র `docs/WORK_STATION_PANEL_GITHUB_CHUNK_PLAN.md`-এ আছে।

## রেফারেন্স
- `docs/WORK_STATION_PANEL_GITHUB_CHUNK_PLAN.md` — সম্পূর্ণ চাংক প্ল্যান
  (ডেটা মডেল, UI ডিজাইন সিস্টেম, প্রতিটা চাংকের প্রম্পট)।

## কনভেনশন
- single source of truth রাখা, duplicate না করে import করা।
- `.env`/real API key (Gemini) কখনো commit হবে না।
- সব entity `project_id` দিয়ে স্কোপড রাখা (multi-project সাপোর্টের জন্য)।
```

তারপর `docs/` ফোল্ডারে এই প্ল্যান ফাইলটাও কপি করে রাখুন
(`docs/WORK_STATION_PANEL_GITHUB_CHUNK_PLAN.md` নামে — এই পুরো ডকুমেন্ট)।

```bash
git init
git add -A
git commit -m "baseline: empty repo, docs + plan ready for chunk A1"
git branch -M main
git remote add origin https://github.com/আপনার-ইউজারনেম/work-station-panel.git
git push -u origin main
git tag baseline-done
git push origin baseline-done
```

### ০.৯ — যাচাই
ব্রাউজারে repo পেজ রিফ্রেশ করে `docs/` ফোল্ডার দেখতে পেলে ধাপ ০ সম্পূর্ণ।

---

## Repo কনভেনশন (সব চাংকেই একই নিয়ম)

- **Branch:** সবসময় `main`।
- **Tag প্রতি চাংকের শেষে:** `chunk-A1-done`, `chunk-A2-done` ... `chunk-I2-done`
  (= `workstation-panel-final`)। ভুল হলে `git reset --hard <আগের-tag>`।
- **`docs/HANDOFF_NEXT.md`:** প্রতিটা চাংক শেষে ওভাররাইট হয়।
- **`docs/CHANGELOG.md`:** কখনো ওভাররাইট হয় না, শুধু নতুন এন্ট্রি যোগ হয়।
- **টেস্ট ফ্রেমওয়ার্ক:** ব্যাকএন্ড — Node.js `node --test` (বা Jest, প্রথম
  চাংকেই যেটা সেট হবে সেটাই পরের সব চাংক ব্যবহার করবে); ফ্রন্টএন্ড — React
  Testing Library। প্রতিটা চাংকে বিদ্যমান কনভেনশন অনুসরণ করতে হবে।
- প্রতিটা সেগমেন্ট (video/UI অংশ না — এখানে "সেগমেন্ট" মানে প্রতিটা
  entity) সবসময় `project_id` দিয়ে স্কোপড থাকবে যাতে একাধিক প্রজেক্টের
  ডেটা মিক্স না হয় (মাল্টি-প্রজেক্ট সাপোর্ট — মূল প্ল্যানের হার্ড
  requirement)।

---

## বার্ডস-আই ম্যাপিং (গ্রুপ → সাব-চাংক → মূল প্ল্যানের Phase)

| গ্রুপ | মূল প্ল্যানের Phase | সাব-চাংক | স্কোপ |
|---|---|---|---|
| A | Phase 1 — Skeleton | A1, A2, A3, A4 | Backend schema, Frontend shell, Projects হোম, Project Overview + খালি ৪ ট্যাব |
| B | Phase 2 — AI Accounts | B1, B2 | Account CRUD + auto-reset, Accounts UI + mini-widget |
| C | Phase 3 — Plan ট্যাব | C1, C2 | PlanData backend, ৪-সাব-সেকশন UI |
| D | Phase 4 — Coding + Support Claude | D1, D2, D3 | Coding ট্যাব, SupportLog backend, Prompt↔Brief Log UI + Handover Note |
| E | Phase 5 — Checker Claude | E1, E2 | CheckerIssue backend + Send-back-to-Plan, Issue Checklist UI |
| F | Phase 6 — পলিশ | F1, F2 | গ্লোবাল সার্চ + পিন পলিশ, রিমাইন্ডার নোটিফিকেশন |
| G | Phase 7 — Settings/AI Helping | G1, G2, G3, G4, G5, G6 | Settings backend+UI, Plan/Support/Checker/AI-Accounts-এ Gemini ON-state ফিচার |
| H | Phase 8 — Quick Access Menu + Notes | H1, H2, H3, H4 | Note CRUD backend, Notes UI, সিমান্টিক সার্চ (AI ON), ⋮ মেগা-মেনু ড্রয়ার |
| I | Phase 9 — Visual Design System | I1, I2 | ডিজাইন টোকেন সেটআপ, rim-glow + ৩-জোন লেআউট প্রয়োগ |

---

## রেফারেন্স — ডেটা মডেল (সব ব্যাকএন্ড চাংক এই স্কিমা ব্যবহার করবে)

| Entity | মূল ফিল্ড |
|---|---|
| Project | id, name, created_at, current_phase, github_link |
| PlanData | project_id, basic_plan, data_collector_log, final_plan, prompt_guide_file (প্রতিটার আলাদা timestamp) |
| CodingData | project_id, active_monkey_account_id, todo_list |
| SupportLog | project_id, prompt, brief, timestamp |
| CheckerIssue | project_id, source (self/claude), description, resolved, archived (bool, default false) |
| Account | id, type (monkey/claude), label, login_link, status, last_used_project, last_used_at, note |
| Settings | ai_helping_enabled (bool), gemini_api_key (encrypted), last_account_reset_date |
| Note | id, title, content, category, pinned (bool), created_at, updated_at |

**নোট (ভেরিফিকেশনের পর ঠিক করা হয়েছে):**
- `Project.current_phase` শুধু creation-এ ("Plan") আর Send-back-to-Plan-এ
  ম্যানুয়ালি সেট হয় না — এটা **forward-only auto-advance** ফিল্ড:
  Coding/Support/Checker ট্যাবে প্রথম মিনিংফুল অ্যাকশন হলে নিজে থেকে এগিয়ে
  যাবে (নিচে D1/D2/E1-এ ঠিক কোন অ্যাকশনে কখন এগোয় তা লেখা আছে) — তা না হলে
  Projects হোমের "বর্তমান ফেজ" ব্যাজ সবসময় "Plan"-এ আটকে থাকত।
- `CheckerIssue.archived` — Send-back-to-Plan হলে বর্তমান সাইকেলের সব ইস্যু
  আর্কাইভ হয়ে যাবে (হার্ড ডিলিট না), যাতে নতুন সাইকেলে Checker ট্যাব খালি
  চেকলিস্ট দিয়ে শুরু হয় কিন্তু পুরনো ইতিহাস হারিয়ে না যায় (E1/E2 দেখুন)।
- `Settings.last_account_reset_date` — AI Accounts-এর daily auto-reset শুধু
  cron-এর উপর নির্ভর করলে সমস্যা: এই টুলটা ব্যক্তিগত ব্যবহারের জন্য, সার্ভার
  সবসময় চালু নাও থাকতে পারে, তাই cron মিস হতে পারে। এই ফিল্ড দিয়ে একটা
  lazy-reset ফলব্যাক করা হয়েছে (B1 দেখুন)।

## রেফারেন্স — UI / Visual Design System

থিম: গভীর কালো ব্যাকগ্রাউন্ডে soft rim-glow — "professional workstation"
মুড। কোনো আলাদা ব্রাইট অ্যাকসেন্ট কালার নেই, শুধু glow + দুটো ফাংশনাল
স্ট্যাটাস কালার (সবুজ/লাল)।

**কালার প্যালেট**

| নাম | Hex | ব্যবহার |
|---|---|---|
| Base (background) | `#0B0C0F` | মূল ব্যাকগ্রাউন্ড |
| Surface | `#15161B` | কার্ড/প্যানেল/সাইডবার |
| Surface Elevated | `#1D1F26` | হোভার/অ্যাক্টিভ স্টেট |
| Hairline / Border | `#2A2C34` | সূক্ষ্ম বর্ডার |
| Rim-glow (signature) | `#4A4F5C` | ফোকাস/হোভার/অ্যাক্টিভ এলিমেন্টের কিনারায় glow |
| Text Primary | `#E8E9ED` | মূল টেক্সট |
| Text Muted | `#8B8D97` | সেকেন্ডারি টেক্সট/টাইমস্ট্যাম্প |
| Status: Available | `#5FD48A` | 🟢 AI Accounts |
| Status: Limit Reached | `#E5637A` | 🔴 AI Accounts |

**শেপ ল্যাঙ্গুয়েজ:** বড় border-radius (১৬–২০px), শার্প কোণা এড়িয়ে —
কার্ড, বাটন, ইনপুট, ড্রয়ার সবকিছুতে।

**টাইপোগ্রাফি**

| রোল | ফন্ট | কোথায় |
|---|---|---|
| Display/Heading | Inter Tight / General Sans | পেজ টাইটেল, ট্যাব নাম |
| Body | Inter | নোটস, প্ল্যান, সাধারণ কনটেন্ট |
| Utility/Mono | JetBrains Mono / IBM Plex Mono | GitHub লিংক, প্রম্পট/ব্রিফ লগ, টাইমস্ট্যাম্প, API key ফিল্ড |

**লেআউট:** বামে কম্প্যাক্ট নেভিগেশন রেইল, মূল কনটেন্টে কার্ড-ভিত্তিক
প্যানেল (soft border + subtle glow), ডান দিক থেকে স্লাইড করে আসা Quick
Access/Settings ড্রয়ার — ৩-জোন স্ট্রাকচার।

**সিগনেচার ইন্টারঅ্যাকশন:** বাটন হোভার, অ্যাক্টিভ ট্যাব, ফোকাসড ইনপুট,
স্ট্যাটাস ডট — এসবের কিনারায় সূক্ষ্ম glow/inner-highlight, ফ্ল্যাট রঙিন
ফিল না দিয়ে।

*(এই টোকেনগুলো গ্রুপ I-তে সিস্টেম্যাটিকভাবে বসানো হবে, কিন্তু প্রতিটা
ফ্রন্টএন্ড চাংক (A2 থেকে শুরু করে) বেস স্টাইল হিসেবে ব্যবহার করবে যাতে
পরে পুরো রিডিজাইন না লাগে।)*

---
---

# গ্রুপ A — Skeleton (Phase 1)

## A1 — Backend skeleton: DB schema + সব entity-র CRUD API

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক A1" (baseline commit থেকে শুরু, মোট ২৭টা চাংকের প্রথমটা)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag baseline-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।
3. docs/WORK_STATION_PANEL_GITHUB_CHUNK_PLAN.md-এর "রেফারেন্স — ডেটা মডেল"
   সেকশন পড়ো (নিচে হুবহু কপি দিলাম)।

তোমার স্কোপ:

Node.js + Express + SQLite (better-sqlite3 বা sequelize, তোমার পছন্দমতো
কিন্তু সিদ্ধান্ত docs/HANDOFF_NEXT.md-এ লিখে রাখবে) দিয়ে backend/ ফোল্ডারে
একটা API সার্ভার বানাও, নিচের এই এন্টিটিগুলোর টেবিল + বেসিক CRUD রুট
(GET/POST/PUT/DELETE) সহ:

- Project(id, name, created_at, current_phase, github_link) —
  `current_phase`-এর মান শুধু creation-এ ("Plan") সেট হবে; Coding/Support/
  Checker-এ auto-advance করার actual লজিক পরের চাংকে (D1/D2/E1) আসবে, এখানে
  শুধু কলাম বানাও।
- PlanData(project_id, basic_plan, data_collector_log, final_plan,
  prompt_guide_file, + প্রতিটা ফিল্ডের আলাদা updated_at timestamp)
- CodingData(project_id, active_monkey_account_id, todo_list)
- SupportLog(project_id, prompt, brief, timestamp)
- CheckerIssue(project_id, source[self|claude], description, resolved,
  archived bool default false — নতুন Plan-সাইকেল শুরু হলে পুরনো ইস্যু
  আর্কাইভ হয়ে যাবে, দেখো E1)
- Account(id, type[monkey|claude], label, login_link, status, note,
  last_used_project, last_used_at)
- Settings(id হার্ডকোডেড ১, ai_helping_enabled bool default false,
  gemini_api_key encrypted, last_account_reset_date — daily account-reset
  lazy-fallback-এর জন্য, দেখো B1 — singleton enforcement-এর ডিটেইল G1-এ)
- Note(id, title, content, category, pinned bool, created_at, updated_at)

Hard constraint: PlanData, CodingData, SupportLog, CheckerIssue — সব
`project_id` foreign key দিয়ে স্কোপড থাকতে হবে (মাল্টি-প্রজেক্ট সাপোর্ট,
প্রজেক্টের ডেটা কখনো মিক্স হবে না)। Settings একটাই singleton রো হবে (এক
ইউজারের জন্য)। gemini_api_key কখনো plain-text response-এ ফেরত পাঠাবে না —
শুধু "সেট আছে কিনা" বুলিয়ান দেবে।

এই ধাপে যা করবে না: কোনো frontend UI লিখবে না (সেটা A2 থেকে); Settings/AI
ON-state লজিক লিখবে না (গ্রুপ G-এর কাজ); Gemini API কল কিছুই না (এখনো লাগবে
না)।

টেস্ট: প্রতিটা entity-র CRUD রুটের জন্য basic integration test (node --test
বা Jest, যেটা সেট করবে সেটাই backend/tests/-এর কনভেনশন হবে)।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. `node --check` (বা equivalent) দিয়ে সব ফাইল সিনট্যাক্স-ভ্যালিড কনফার্ম করো।
3. docs/HANDOFF_NEXT.md ওভাররাইট করো: কোন DB লাইব্রেরি বেছে নিলে, কোন টেস্ট
   ফ্রেমওয়ার্ক, পরের চাংক A2 (frontend skeleton)-এর স্কোপ।
4. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
5. Commit: "chunk A1: backend skeleton — DB schema + CRUD API for all entities"
   — push করো।
6. Tag: git tag chunk-A1-done && git push origin chunk-A1-done

কাজ অসম্পূর্ণ থাকলেও ৩-৬ ধাপ করো, HANDOFF_NEXT.md-এ কী বাকি স্পষ্ট লেখো।
```

## A2 — Frontend skeleton: Next.js + routing + বেস ডিজাইন টোকেন

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক A2" (A1 শেষ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-A1-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।
3. docs/WORK_STATION_PANEL_GITHUB_CHUNK_PLAN.md-এর "রেফারেন্স — UI/Visual
   Design System" সেকশন পড়ো।
4. A1-এ বানানো backend API routes দেখে বোঝো।

তোমার স্কোপ:

frontend/ ফোল্ডারে React/Next.js অ্যাপ বানাও, নিচের রাউট স্ট্রাকচার সহ
(এখন শুধু খালি পেজ/প্লেসহোল্ডার, আসল ফিচার পরের চাংকে):

- `/` → Projects হোম (খালি)
- `/accounts` → AI Accounts (খালি)
- `/settings` → Settings (খালি)
- `/project/[id]` → Project shell, ভেতরে ৫টা ট্যাব: Overview, Plan, Coding,
  Support Claude, Checker Claude (খালি)

বেস ডিজাইন টোকেন সেটআপ করো (CSS variables বা Tailwind theme config):
রেফারেন্স ডকের কালার প্যালেট (Base #0B0C0F, Surface #15161B, Surface
Elevated #1D1F26, Hairline #2A2C34, Rim-glow #4A4F5C, Text Primary #E8E9ED,
Text Muted #8B8D97, Available #5FD48A, Limit Reached #E5637A), ফন্ট
(Inter Tight/General Sans হেডিং, Inter বডি, JetBrains Mono/IBM Plex Mono
ইউটিলিটি), border-radius ১৬–২০px গ্লোবালি। এখনই পুরো rim-glow ইন্টারঅ্যাকশন
পলিশ করার দরকার নেই (সেটা গ্রুপ I) — শুধু টোকেনগুলো এমনভাবে সেট করো যাতে
পরে সহজে সব জায়গায় প্রয়োগ করা যায়।

এই ধাপে যা করবে না: কোনো পেজের আসল ফিচার লজিক লিখবে না; API কল ওয়্যার
করবে না (A3-A4 থেকে শুরু)।

টেস্ট: প্রতিটা রাউট রেন্ডার হয় কিনা তার basic smoke test (React Testing
Library)।

শেষে (Definition of Done):
1. পুরো test suite (backend + frontend) পাশ করছে কনফার্ম করো।
2. `npm run build` সফল হয় কনফার্ম করো।
3. docs/HANDOFF_NEXT.md ওভাররাইট করো: রাউট স্ট্রাকচার + ডিজাইন টোকেন সেটআপ
   হয়েছে, পরের চাংক A3 (Projects হোম)।
4. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
5. Commit: "chunk A2: frontend skeleton — routes + base design tokens" —
   push করো।
6. Tag: git tag chunk-A2-done && git push origin chunk-A2-done
```

## A3 — Projects হোম ড্যাশবোর্ড

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক A3" (A2 শেষ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-A2-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ — `/` (Projects হোম) পেজ পুরোপুরি ফাংশনাল করো:

- সব প্রজেক্টের কার্ড/লিস্ট ভিউ — নাম, বর্তমান ফেজ (Plan/Coding/Support/
  Checker), সর্বশেষ আপডেটের সময়, স্ট্যাটাস ব্যাজ (A1-এর Project API থেকে)।
- বড় **"+ New Project"** বাটন — ক্লিক করলে নতুন Project তৈরি হয়ে (৪টা খালি
  ডেটা-সেট সহ: PlanData/CodingData ফাঁকা রো, current_phase="Plan") সেই
  প্রজেক্টের `/project/[id]` Overview পেজে রিডাইরেক্ট করবে।
- **Pin/Favorite** — প্রজেক্ট পিন/আনপিন করা যাবে, পিন করা প্রজেক্ট উপরে
  আলাদা সেকশনে দেখাবে। (এর জন্য Project এ pinned bool ফিল্ড A1-এর স্কিমায়
  যোগ করো — মাইগ্রেশন সহ।)
- **Recently Active** সেকশন — শেষ আপডেট হওয়া প্রজেক্টগুলো (updated_at
  অনুযায়ী sort) প্রথমে।

টেস্ট: New Project ফ্লো (তৈরি হয়ে সঠিক রুটে যায়), pin/unpin টগল, sort
অর্ডার (pinned আগে, তারপর recently active) — এর ইউনিট/কম্পোনেন্ট টেস্ট।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: Projects হোম সম্পূর্ণ, পরের চাংক A4 (Project shell
   + Overview + ৪ খালি ট্যাব)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk A3: Projects home — list, New Project flow, pin, recently active"
   — push করো।
5. Tag: git tag chunk-A3-done && git push origin chunk-A3-done
```

## A4 — Project shell: Overview + ৪টা খালি ট্যাব + বেসিক নোট ফিল্ড

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক A4" (A3 শেষ, গ্রুপ A-এর শেষ চাংক — Phase 1 skeleton complete হবে)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-A3-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ — `/project/[id]` শেল সম্পূর্ণ করো:

- **Overview** ট্যাব: নাম, তৈরির তারিখ, বর্তমান ফেজ, GitHub লিংক (এডিটেবল
  ফিল্ড, PATCH করে Project.github_link আপডেট করবে), আর নিচের ৪টা ট্যাবে
  যাওয়ার শর্টকাট লিংক/কার্ড।
- Plan, Coding, Support Claude, Checker Claude — এই ৪টা ট্যাব এখন শুধু
  একটা করে **বেসিক নোট এরিয়া** (প্লেইন টেক্সট, সেভ বাটন) — আসল ফিচার
  (Plan-এর ৪ সাব-সেকশন, Support-এর prompt↔brief লগ ইত্যাদি) পরের গ্রুপগুলোতে
  (C, D, E) আসবে।
- ট্যাব নেভিগেশন UI — অ্যাক্টিভ ট্যাব হাইলাইট (A2-এর ডিজাইন টোকেন ব্যবহার
  করে)।

টেস্ট: ৫টা ট্যাবের মধ্যে নেভিগেশন কাজ করে কিনা, Overview-এর github_link
এডিট+সেভ কাজ করে কিনা, বেসিক নোট এরিয়া সেভ/লোড হয় কিনা।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: "গ্রুপ A (Phase 1 — Skeleton) সম্পূর্ণ। পরের কাজ:
   গ্রুপ B (AI Accounts ম্যানেজার, B1 থেকে)।"
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk A4: project shell — overview, 5-tab nav, basic notes" —
   push করো।
5. Tag: git tag chunk-A4-done && git push origin chunk-A4-done
```

---
---

# গ্রুপ B — AI Accounts ম্যানেজার (Phase 2)

## B1 — Account CRUD + auto-reset + Reset All

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক B1" (A4 শেষ, গ্রুপ A সম্পূর্ণ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-A4-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।
3. A1-এ বানানো Account API রুট পড়ো।

তোমার স্কোপ — শুধু backend লজিক, এই চাংকে UI না:

1. Account CRUD সম্পূর্ণ ভেরিফাই/এক্সটেন্ড করো — ফিল্ড: type(monkey/claude),
   label, login_link, status(available/limit_reached), note,
   last_used_project, last_used_at।
2. **Auto-reset (⚠️ ঠিক করা হয়েছে — শুধু cron যথেষ্ট না)**: প্রতিদিন রাত
   ১২টায় সব Account-এর status "available"-এ রিসেট হওয়ার কথা। কিন্তু এটা
   একটা ব্যক্তিগত/লোকাল টুল — মেশিন/সার্ভার সবসময় চালু নাও থাকতে পারে,
   তাই শুধু node-cron-এর উপর নির্ভর করলে সার্ভার বন্ধ থাকা অবস্থায় মিডনাইট
   পার হয়ে গেলে reset মিস হয়ে যাবে। তাই দুই লেয়ারে বানাও:
   - **node-cron** (best-effort) — সার্ভার চালু থাকলে ঠিক মিডনাইটে চালাবে।
   - **Lazy-reset ফলব্যাক (আসল নির্ভরযোগ্য মেকানিজম)** — `Settings.last_account_reset_date`
     ফিল্ড ব্যবহার করে: GET /accounts (বা account লিস্ট রিটার্ন করে এমন যেকোনো
     এন্ডপয়েন্ট) কল হওয়ার সময় প্রথমে চেক করো আজকের তারিখ
     `last_account_reset_date`-এর চেয়ে নতুন কিনা — হলে রিসেট চালিয়ে সব
     Account "available" করে দাও, তারপর `last_account_reset_date` আজকের
     তারিখে আপডেট করো, তারপর লিস্ট রিটার্ন করো। এভাবে সার্ভার যতবারই
     বন্ধ-চালু হোক না কেন, পরের বার কেউ Accounts পেজ খুললেই মিসড রিসেট
     স্বয়ংক্রিয়ভাবে ধরা পড়বে।
3. **"Reset All" এন্ডপয়েন্ট** — ম্যানুয়ালি যেকোনো সময় সব অ্যাকাউন্ট
   available করার জন্য (এটাও `last_account_reset_date` আজকের তারিখে
   আপডেট করে দেবে, যাতে একই দিনে lazy-reset আবার ওভাররাইড না করে)।
4. একটা Account-এ কোনো প্রজেক্টে "ব্যবহার হলো" মার্ক করার এন্ডপয়েন্ট —
   last_used_project + last_used_at আপডেট করবে (এটা D1/D2 চাংকে
   Coding/Support Claude ট্যাব থেকে কল হবে)।

টেস্ট: lazy-reset লজিক (mock system date এক দিন এগিয়ে দিয়ে GET কল করলে
reset হয় আর `last_account_reset_date` আপডেট হয় কিনা, একই দিনে দ্বিতীয়বার
কল করলে আবার reset না হওয়া), node-cron লজিক (mock time দিয়ে, best-effort
হিসেবে), Reset All এন্ডপয়েন্ট, mark-used এন্ডপয়েন্ট।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: Account backend + auto-reset সম্পূর্ণ, পরের চাংক
   B2 (Accounts UI + mini-widget)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk B1: Account CRUD + daily auto-reset + Reset All + mark-used"
   — push করো।
5. Tag: git tag chunk-B1-done && git push origin chunk-B1-done
```

## B2 — AI Accounts পেজ + mini-widget

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক B2" (B1 শেষ, গ্রুপ B-এর শেষ চাংক)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-B1-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ:

1. `/accounts` পেজ পূর্ণ করো: টেবিল/লিস্টে Type, Label, Login Link
   (এক-ক্লিক ওপেন), Status (🟢/🔴 ম্যানুয়াল টগল), Last used on, Last used
   at, Note। **Available অ্যাকাউন্ট সবসময় আগে**, Limit Reached নিচে (sort
   order)। "Reset All" বাটন (B1-এর এন্ডপয়েন্ট কল করবে)। নতুন Account
   Add/Edit/Delete ফর্ম।
2. একটা reusable **mini-widget কম্পোনেন্ট** বানাও (কমপ্যাক্ট
   অ্যাকাউন্ট-স্ট্যাটাস লিস্ট, Available প্রথমে) — এটা এখন শুধু কম্পোনেন্ট
   হিসেবে বানাও, আসল ব্যবহার (Coding ও Support Claude ট্যাবে বসানো) হবে
   গ্রুপ D-তে।

টেস্ট: status টগল, sort order (available প্রথমে), Reset All বাটন, mini-widget
কম্পোনেন্ট রেন্ডার।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: "গ্রুপ B (Phase 2 — AI Accounts) সম্পূর্ণ। পরের কাজ:
   গ্রুপ C (Plan ট্যাব, C1 থেকে)।"
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk B2: AI Accounts page + reusable mini-widget" — push করো।
5. Tag: git tag chunk-B2-done && git push origin chunk-B2-done
```

---
---

# গ্রুপ C — Plan ট্যাব (Phase 3)

## C1 — PlanData backend wiring (৪ সাব-সেকশন + timestamps)

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক C1" (B2 শেষ, গ্রুপ B সম্পূর্ণ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-B2-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ:

PlanData API সম্পূর্ণ করো/ভেরিফাই করো — প্রতিটা প্রজেক্টের জন্য একটাই
PlanData রো, ৪টা টেক্সট ফিল্ড:
1. basic_plan
2. data_collector_log (+ টুলের লিংক ফিল্ড)
3. final_plan
4. prompt_guide_file

প্রতিটা ফিল্ডের **আলাদা** `updated_at` timestamp রাখো (একটা ফিল্ড আপডেট
হলে শুধু সেটার timestamp বদলাবে, বাকিগুলো না) — যাতে পরে ভার্সন বোঝা যায়।
আলাদা PATCH এন্ডপয়েন্ট প্রতিটা ফিল্ডের জন্য (বা একটা এন্ডপয়েন্ট যেটা
field-name প্যারামিটার নেয়)।

টেস্ট: প্রতিটা ফিল্ড আলাদাভাবে আপডেট হলে শুধু তার timestamp বদলায় কিনা।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: PlanData backend সম্পূর্ণ, পরের চাংক C2 (Plan ট্যাব UI)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk C1: PlanData backend — 4 fields with independent timestamps"
   — push করো।
5. Tag: git tag chunk-C1-done && git push origin chunk-C1-done
```

## C2 — Plan ট্যাব UI (৪ সাব-সেকশন কার্ড/অ্যাকর্ডিয়ন)

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক C2" (C1 শেষ, গ্রুপ C-এর শেষ চাংক)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-C1-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ — Plan ট্যাব (`/project/[id]` → Plan) পূর্ণ করো:

কার্ড বা অ্যাকর্ডিয়ন আকারে ৪টা সাব-সেকশন (C1-এর এন্ডপয়েন্ট ব্যবহার করে):
1. **Basic Plan** — প্রাথমিক আইডিয়া লেখার নোট এরিয়া।
2. **Master Data Collector Log** — Master Data Collector-কে কী বলা
   হয়েছে/কী ডেটা কালেক্ট হয়েছে তার লগ + টুলের লিংক ফিল্ড।
3. **Final Master Plan** — ফাইনাল প্ল্যান পেস্ট করে রাখার জায়গা।
4. **Monkey Prompt & Guide File** — Monkey-কে দেওয়ার ফাইনাল প্রম্পট লিস্ট
   ও গাইড।

প্রতিটা সাব-সেকশনে সেভ-করা timestamp দেখাবে (C1-এর per-field updated_at)।
এই চাংকে সব ম্যানুয়াল (এখনো AI Helping/Gemini generate বাটন নেই — সেটা
গ্রুপ G-এর কাজ, AI Helping ON থাকলেই এখানে সাব-সেকশন ৩ ও ৪-এ Gemini
generate বাটন যুক্ত হবে)।

টেস্ট: ৪টা সাব-সেকশন সেভ/লোড, timestamp সঠিকভাবে দেখানো।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: "গ্রুপ C (Phase 3 — Plan ট্যাব) সম্পূর্ণ, ম্যানুয়াল
   মোডে। AI ON-state জেনারেশন গ্রুপ G-তে যোগ হবে। পরের কাজ: গ্রুপ D
   (Coding + Support Claude, D1 থেকে)।"
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk C2: Plan tab UI — 4 sub-sections with timestamps" —
   push করো।
5. Tag: git tag chunk-C2-done && git push origin chunk-C2-done
```

---
---

# গ্রুপ D — Coding + Support Claude ট্যাব (Phase 4)

## D1 — Coding ট্যাব সম্পূর্ণ

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক D1" (C2 শেষ, গ্রুপ C সম্পূর্ণ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-C2-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।
3. B2-এর mini-widget কম্পোনেন্ট আর CodingData API (A1) পড়ো।

তোমার স্কোপ — Coding ট্যাব পূর্ণ করো:

- **GitHub Repo লিংক** — Overview-এর github_link ফিল্ড এখানে reuse/দেখাও
  (একবার সেট করলেই হয়, অ্যাকাউন্ট বদলালেও একই থাকে)।
- **এখন কোন Monkey অ্যাকাউন্ট ইউজ হচ্ছে** — B2-এর mini-widget বসিয়ে AI
  Accounts (type=monkey) থেকে সিলেক্ট করা যাবে, CodingData.active_monkey_account_id-তে
  সেভ থাকবে (প্রজেক্ট-নির্দিষ্ট)। সিলেক্ট করলে B1-এর mark-used এন্ডপয়েন্ট
  কল হবে (last_used_project/last_used_at আপডেট)।
- **Milestone/Todo checklist** (অপশনাল) — কোডিং-এর ধাপগুলো ট্র্যাক করার
  চেকলিস্ট (add/check/delete item)।
- নোট এরিয়া — কোডিং-স্পেসিফিক কনটেক্সট।
- **Phase auto-advance (⚠️ নতুন, ভেরিফিকেশনের পর যোগ করা)**: Monkey
  অ্যাকাউন্ট প্রথমবার সিলেক্ট হলে বা প্রথম Todo item অ্যাড হলে —
  `Project.current_phase` যদি এখনো "Plan" থাকে, তাহলে "Coding"-এ আপডেট
  করো। ইতিমধ্যে "Coding"-এর পরে (Support/Checker) থাকলে ওভাররাইট কোরো না
  — এটা forward-only, backward যাবে না।

টেস্ট: Monkey account সিলেকশন + mark-used কল, todo checklist CRUD, phase
auto-advance (Plan→Coding, আর already-Support/Checker অবস্থায় ওভাররাইট না
হওয়া)।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: Coding ট্যাব সম্পূর্ণ, পরের চাংক D2 (SupportLog
   backend)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk D1: Coding tab — repo link, monkey account select, todo list"
   — push করো।
5. Tag: git tag chunk-D1-done && git push origin chunk-D1-done
```

## D2 — SupportLog backend + active Claude account

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক D2" (D1 শেষ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-D1-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ:

1. SupportLog API সম্পূর্ণ করো — এন্ট্রি ফরম্যাট: `prompt` (Monkey-কে দেওয়া
   প্রম্পট), `brief` (Monkey-র ব্রিফ/রেসপন্স, টেক্সট), `timestamp`, সব
   project_id-স্কোপড, list এন্ডপয়েন্ট পুরনো-থেকে-নতুন বা নতুন-থেকে-পুরনো
   দুটোই সাপোর্ট করবে (scroll history-র জন্য)।
2. CodingData-এর মতোই, project-এ একটা "active_claude_account_id" ফিল্ড
   যোগ করো (SupportData নামে নতুন এন্টিটি বা CodingData-তেই এক্সটেন্ড —
   তুমি ঠিক করো, docs/HANDOFF_NEXT.md-এ লিখে রাখবে) — B1-এর mark-used-এর
   সাথে ওয়্যার করো (type=claude)।
3. **Phase auto-advance (⚠️ নতুন, ভেরিফিকেশনের পর যোগ করা, D1-এর একই
   প্যাটার্নে)**: প্রথম SupportLog এন্ট্রি সেভ হলে — `Project.current_phase`
   "Plan" বা "Coding"-এ থাকলে "Support"-এ আপডেট করো (forward-only, ইতিমধ্যে
   "Checker"-এ থাকলে ওভাররাইট কোরো না)।

টেস্ট: SupportLog CRUD + ordering, active Claude account সিলেকশন +
mark-used, phase auto-advance (→Support, forward-only নিয়ম)।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: SupportLog backend সম্পূর্ণ, পরের চাংক D3
   (Support Claude ট্যাব UI + Handover Note)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk D2: SupportLog backend + active Claude account tracking"
   — push করো।
5. Tag: git tag chunk-D2-done && git push origin chunk-D2-done
```

## D3 — Support Claude ট্যাব UI + Handover Note (ম্যানুয়াল)

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক D3" (D2 শেষ, গ্রুপ D-এর শেষ চাংক)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-D2-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ — Support Claude ট্যাব পূর্ণ করো:

- **Prompt ↔ Brief Log**: প্রতিটা এন্ট্রি
  `[Monkey-কে দেওয়া প্রম্পট] → [Monkey-র ব্রিফ/রেসপন্স] → timestamp`
  ফরম্যাটে, স্ক্রলযোগ্য পুরো হিস্ট্রি (D2-এর SupportLog API থেকে), নতুন
  এন্ট্রি অ্যাড করার ফর্ম। ব্রিফ ফিল্ডে টেক্সট পেস্ট করা যাবে (স্ক্রিনশট
  আপলোড এই চাংকে অপশনাল — শুধু টেক্সট নিশ্চিত করলেই যথেষ্ট)।
- **এখন কোন Claude অ্যাকাউন্ট ইউজ হচ্ছে** — B2-এর mini-widget বসিয়ে
  সিলেক্ট/সেভ (D2-এর active_claude_account_id সাথে ওয়্যার্ড)।
- **Handover Note (ম্যানুয়াল ভার্সন)**: "কপি সামারি" বাটন — ক্লিক করলে এই
  ট্যাবের পুরো SupportLog + Plan ট্যাবের prompt_guide_file (C1 থেকে) —
  দুটো মিলিয়ে একটা প্লেইন-টেক্সট সামারি ক্লিপবোর্ডে কপি হবে (কোনো Gemini
  কল না, শুধু concatenation) — নতুন Claude চ্যাটে পেস্ট করার জন্য।

> Gemini দিয়ে ব্রিফ অটো-স্ট্রাকচারিং ও স্মার্ট Handover Note জেনারেশন
> গ্রুপ G-তে (AI Helping ON হলে) যোগ হবে — এই চাংকে শুধু ম্যানুয়াল/OFF
> ভার্সন বানাও।

টেস্ট: লগ এন্ট্রি অ্যাড + স্ক্রল রেন্ডার, Claude account সিলেকশন, "কপি
সামারি" বাটনের আউটপুট কনটেন্ট সঠিক কিনা (SupportLog + prompt_guide_file
দুটোই আছে কিনা)।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: "গ্রুপ D (Phase 4 — Coding + Support Claude) সম্পূর্ণ,
   ম্যানুয়াল মোডে। পরের কাজ: গ্রুপ E (Checker Claude, E1 থেকে)।"
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk D3: Support Claude tab — prompt/brief log + manual handover note"
   — push করো।
5. Tag: git tag chunk-D3-done && git push origin chunk-D3-done
```

---
---

# গ্রুপ E — Checker Claude ট্যাব (Phase 5)

## E1 — CheckerIssue backend + "Send back to Plan" লজিক

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক E1" (D3 শেষ, গ্রুপ D সম্পূর্ণ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-D3-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ:

1. CheckerIssue API সম্পূর্ণ করো — ফিল্ড: source(self/claude), description,
   resolved(bool), **archived(bool, default false)**, project_id-স্কোপড।
   একটা `system_update_plan` টেক্সট ফিল্ড (Project বা নতুন CheckerData
   এন্টিটিতে, তোমার সিদ্ধান্ত)।
2. **Phase auto-advance (⚠️ নতুন, ভেরিফিকেশনের পর যোগ করা)**: প্রথম
   CheckerIssue অ্যাড হলে — `Project.current_phase` "Checker"-এ আপডেট করো
   (D1/D2-এর একই forward-only প্যাটার্ন)।
3. **"Send back to Plan" এন্ডপয়েন্ট** — CheckerData.system_update_plan-এর
   কনটেন্টকে PlanData.basic_plan-এ কপি করে দেবে (নতুন সাইকেল শুরু), আর
   Project.current_phase আবার "Plan"-এ রিসেট করবে (এখানেই একমাত্র জায়গা
   যেখানে current_phase backward যায় — বাকি সব জায়গায় forward-only) —
   যাতে Plan → Coding → Support → Checker লুপ আবার শুরু করা সহজ হয়। আগের
   basic_plan কনটেন্ট হারিয়ে যাবে না নিশ্চিত করো (Plan ট্যাবের version
   history/timestamp দিয়ে বোঝা যাবে, বা আগের ভ্যালু CHANGELOG-স্টাইল লগ
   করে রাখো — তোমার সিদ্ধান্ত, HANDOFF_NEXT.md-এ লিখবে)।
4. **CheckerIssue আর্কাইভ (⚠️ নতুন, ভেরিফিকেশনের পর যোগ করা)**: Send-back-to-Plan
   কল হলে বর্তমান সাইকেলের **সব** CheckerIssue (resolved হোক বা না হোক)
   `archived=true` মার্ক করে দাও — হার্ড ডিলিট না, ইতিহাস থেকে যাবে। এটা
   না করলে পরের সাইকেলে Checker ট্যাবে আগের সাইকেলের পুরনো ইস্যু নতুনগুলোর
   সাথে মিশে জঞ্জাল হয়ে যেত। ইস্যু লিস্ট এন্ডপয়েন্ট ডিফল্টে শুধু
   `archived=false` ফেরত দেবে, একটা `?include_archived=true` প্যারামিটার
   দিলে সবগুলো (E2-এ "History" টগলের জন্য ব্যবহার হবে)।

টেস্ট: CheckerIssue CRUD, phase auto-advance (→Checker), Send-back-to-Plan
এন্ডপয়েন্ট (basic_plan ঠিকমতো আপডেট হয়, current_phase "Plan"-এ রিসেট হয়,
বর্তমান সব ইস্যু archived=true হয়ে যায়), archived-filter এন্ডপয়েন্ট।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: Checker backend সম্পূর্ণ, পরের চাংক E2 (Checker
   Claude ট্যাব UI)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk E1: CheckerIssue backend + Send-back-to-Plan endpoint + cycle archive + phase auto-advance" —
   push করো।
5. Tag: git tag chunk-E1-done && git push origin chunk-E1-done
```

## E2 — Checker Claude ট্যাব UI

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক E2" (E1 শেষ, গ্রুপ E-এর শেষ চাংক)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-E1-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ — Checker Claude ট্যাব পূর্ণ করো:

- **Issue Checklist** — দুই কলাম: *নিজে খুঁজে পাওয়া (self)* বনাম *Claude-এর
  খুঁজে পাওয়া (claude)*, প্রতিটাতে checkbox (resolved টগল), নতুন issue
  অ্যাড ফর্ম (source বাছাই সহ)।
- **System Update Plan** — সব ইস্যু একসাথে করে বানানো ফাইনাল আপডেট প্ল্যান
  পেস্ট করার টেক্সট এরিয়া (E1-এর system_update_plan ফিল্ডে সেভ)।
- **"Send back to Plan" বাটন** — E1-এর এন্ডপয়েন্ট কল করবে, সফল হলে ইউজারকে
  কনফার্মেশন দেখিয়ে Plan ট্যাবে রিডাইরেক্ট করার অপশন দেবে (কল করার আগে
  একটা কনফার্মেশন ডায়ালগে বলে দাও যে বর্তমান সব ইস্যু আর্কাইভ হয়ে যাবে,
  যাতে ইউজার সারপ্রাইজড না হয়)।
- **"History" টগল/লিংক (⚠️ নতুন, ভেরিফিকেশনের পর যোগ করা)**: ডিফল্টে
  Issue Checklist শুধু বর্তমান সাইকেলের ইস্যু (`archived=false`) দেখাবে।
  একটা "Show history" টগল দিলে আগের সাইকেলগুলোর আর্কাইভড ইস্যুও (read-only,
  E1-এর `?include_archived=true`) দেখা যাবে — যাতে পুরনো ইস্যু হারিয়ে না
  গিয়ে রেফারেন্স হিসেবে থেকে যায়।

> Gemini দিয়ে GitHub রিভিউ + Issue Checklist অটো-জেনারেশন গ্রুপ G-তে
> (AI ON হলে) যোগ হবে — এই চাংকে ম্যানুয়াল ভার্সন।

টেস্ট: checklist toggle, System Update Plan সেভ, Send-back-to-Plan বাটন
ফ্লো (কনফার্মেশন + রিডাইরেক্ট, আর্কাইভ-হওয়ার সতর্কবার্তা দেখানো), History
টগল (আর্কাইভড ইস্যু দেখা/লুকানো)।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: "গ্রুপ E (Phase 5 — Checker Claude) সম্পূর্ণ, কোর
   Plan→Coding→Support→Checker লুপ পুরোপুরি কাজ করছে ম্যানুয়াল মোডে। পরের
   কাজ: গ্রুপ F (পলিশ, F1 থেকে)।"
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk E2: Checker Claude tab — issue checklist + update plan + send back + history toggle"
   — push করো।
5. Tag: git tag chunk-E2-done && git push origin chunk-E2-done
```

---
---

# গ্রুপ F — পলিশ (Phase 6)

## F1 — গ্লোবাল কিওয়ার্ড সার্চ + পিন/ফেভারিট পলিশ

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক F1" (E2 শেষ, গ্রুপ E সম্পূর্ণ — কোর প্রোডাক্ট রেডি)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-E2-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ:

1. একটা গ্লোবাল কিওয়ার্ড সার্চ এন্ডপয়েন্ট + UI বানাও যা Project name,
   PlanData-র ৪ ফিল্ড, SupportLog prompt/brief, CheckerIssue description —
   এসবের মধ্যে টেক্সট-ম্যাচ সার্চ করে ম্যাচিং প্রজেক্টে জাম্প করার লিংক
   দেবে। (এটা Notes-নির্দিষ্ট সার্চ থেকে আলাদা — সেটা গ্রুপ H-এ আসবে।)
2. Projects হোমের Pin/Favorite ফিচার (A3) পলিশ করো: পিন করা প্রজেক্ট
   ড্র্যাগ করে রি-অর্ডার করা যাবে (বা একটা সহজ up/down বাটন), এক-ক্লিকে
   আনপিন।

টেস্ট: সার্চ রেজাল্ট রিলেভেন্স (প্রতিটা সোর্স থেকে ম্যাচ আসে কিনা), পিন
রি-অর্ডার persist হয় কিনা।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: গ্লোবাল সার্চ + পিন পলিশ সম্পূর্ণ, পরের চাংক F2
   (রিমাইন্ডার নোটিফিকেশন)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk F1: global keyword search + pin reordering" — push করো।
5. Tag: git tag chunk-F1-done && git push origin chunk-F1-done
```

## F2 — রিমাইন্ডার নোটিফিকেশন

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক F2" (F1 শেষ, গ্রুপ F-এর শেষ চাংক)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-F1-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ:

মূল প্ল্যানে এই ফিচারের বিস্তারিত মেকানিজম উল্লেখ ছিল না — যুক্তিসঙ্গত
ডিফল্ট হিসেবে নিচেরটা বানাও (docs/HANDOFF_NEXT.md-এ ধরে নেওয়াটা স্পষ্ট
লিখে রাখবে):

1. AI Accounts-এ status "limit_reached" হলে ব্রাউজারে একটা non-intrusive
   toast/notification দেখাও (কোন অ্যাকাউন্ট, কবে থেকে)।
2. Coding ট্যাবের Milestone/Todo checklist-এ কোনো item অনেকদিন (৭ দিনের
   বেশি) আনচেকড থাকলে Projects হোমের কার্ডে একটা ছোট ⏰ ব্যাজ দেখাও।
3. এই দুটোই in-app notification (browser push/email না) — সহজ, কোনো
   এক্সটার্নাল সার্ভিস লাগবে না।

টেস্ট: toast ট্রিগার লজিক, স্ট্যালে-টুডু ব্যাজ ক্যালকুলেশন।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: "গ্রুপ F (Phase 6 — পলিশ) সম্পূর্ণ। পরের কাজ:
   গ্রুপ G (Settings/AI Helping, G1 থেকে)।"
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk F2: reminder notifications — limit-reached toast + stale-todo badge"
   — push করো।
5. Tag: git tag chunk-F2-done && git push origin chunk-F2-done
```

---
---

# গ্রুপ G — Settings: AI Helping ও Gemini Integration (Phase 7)

## G1 — Settings backend: master toggle + এনক্রিপ্টেড Gemini key

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক G1" (F2 শেষ, গ্রুপ F সম্পূর্ণ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-F2-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।
3. A1-এর Settings entity স্কিমা পড়ো।

তোমার স্কোপ:

Settings API সম্পূর্ণ করো:
- `ai_helping_enabled` (bool, **ডিফল্ট false**) সেট/গেট এন্ডপয়েন্ট।
- `gemini_api_key` সেভ এন্ডপয়েন্ট — key backend-এ এনক্রিপ্টেড/env-এ
  সংরক্ষিত হবে, **ফ্রন্টএন্ডে কখনো plain-text এক্সপোজ হবে না** (GET
  রিকোয়েস্টে শুধু "সেট আছে/নেই" বুলিয়ান ফেরত দেবে, আসল key না)।
- কোড আর্কিটেকচার provider-agnostic রাখো (একটা `aiProvider` ইন্টারফেস/
  wrapper লেয়ার বানাও যা এখন শুধু Gemini implement করে) — যাতে ভবিষ্যতে
  অন্য মডেল যোগ করা সহজ হয়, কিন্তু এখন শুধু Gemini-ই যথেষ্ট।

Hard constraint 1: `.env`-এ encryption key/master secret রাখো, কখনো commit
হবে না (.gitignore-এ আগে থেকেই `.env` আছে, ভেরিফাই করো)।

Hard constraint 2 (⚠️ নতুন, ভেরিফিকেশনের পর যোগ করা — singleton আসলে
enforce করা হচ্ছিল না): A1-এ Settings-কে "singleton row" বলা হয়েছিল কিন্তু
কীভাবে সেটা নিশ্চিত হবে তা স্পষ্ট ছিল না — এতে POST বারবার কল হলে একাধিক
Settings রো তৈরি হয়ে যেতে পারতো, আর তখন কোন রো থেকে
ai_helping_enabled/gemini_api_key/last_account_reset_date পড়া হচ্ছে তা
অনির্দিষ্ট (ইনকনসিস্টেন্ট) হয়ে যেত। তাই:
- Settings রো-এর id সবসময় হার্ডকোডেড `1` — নতুন রো তৈরির কোনো POST
  এন্ডপয়েন্ট থাকবে না, শুধু GET আর PUT (PUT সবসময় id=1 টার্গেট করবে)।
- GET /settings কল হলে যদি id=1 রো এখনো না থাকে (fresh DB), তাহলে
  ডিফল্ট ভ্যালু (ai_helping_enabled=false ইত্যাদি) দিয়ে অটো-ক্রিয়েট করে
  তারপর রিটার্ন করো।
- DB লেভেলে যদি সহজ হয়, `id` কলামে `CHECK (id = 1)` কনস্ট্রেইন্ট বা
  সমতুল্য কিছু যোগ করো যাতে দুর্ঘটনাক্রমে দ্বিতীয় রো তৈরি হতে না পারে।

টেস্ট: toggle সেট/গেট, key সেভ + "সেট আছে" চেক (raw key কখনো response-এ
আসে না তার টেস্ট), provider-agnostic wrapper ইন্টারফেস টেস্ট, singleton
enforcement (একাধিকবার PUT/GET কল করলেও সবসময় একটাই রো থাকে, দুইবার
সিকোয়েনশিয়াল রিকোয়েস্টের পরেও কাউন্ট ১)।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: Settings backend সম্পূর্ণ, পরের চাংক G2 (Settings UI)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk G1: Settings backend — AI helping toggle + encrypted Gemini key + provider-agnostic wrapper + singleton enforcement"
   — push করো।
5. Tag: git tag chunk-G1-done && git push origin chunk-G1-done
```

## G2 — Settings পেজ UI

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক G2" (G1 শেষ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-G1-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ — `/settings` পেজ পূর্ণ করো:

- **Gemini API Key ফিল্ড** — একবার বসিয়ে সেভ (masked input, "সেট আছে"
  স্ট্যাটাস দেখাবে সেভ করা থাকলে, key নিজে কখনো দেখাবে না)।
- **AI Helping মাস্টার টগল** — 🔘 ON/OFF, ডিফল্ট OFF। OFF অবস্থায় কোথাও
  কোনো Gemini কল হবে না (এখনো G3-G6 বাকি বলে এখনই এটা টেস্ট করার কিছু
  নেই — শুধু টগল স্টেট ঠিকমতো সেভ/লোড হয় সেটা নিশ্চিত করো)।
- মাস্টার টগলের নিচে একটা নোট/placeholder রাখো: "ভবিষ্যতে প্রতিটা
  ফিচারের জন্য আলাদা টগল যোগ করা যাবে" (এখন implement করার দরকার নেই)।

টেস্ট: key ফিল্ড সেভ + masked ডিসপ্লে, টগল স্টেট পার্সিস্টেন্স।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: Settings UI সম্পূর্ণ, পরের চাংক G3 (Plan ট্যাবে
   Gemini ON-state ফিচার)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk G2: Settings page UI — API key field + AI helping toggle"
   — push করো।
5. Tag: git tag chunk-G2-done && git push origin chunk-G2-done
```

## G3 — Plan ট্যাবে Gemini ON-state ফিচার

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক G3" (G2 শেষ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-G2-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।
3. C2-এর Plan ট্যাব UI আর G1-এর provider-agnostic wrapper পড়ো।

তোমার স্কোপ — শুধু `ai_helping_enabled === true` হলে সক্রিয়:

1. Plan ট্যাবে **"Generate with Gemini" বাটন** — Final Master Plan (৩)
   ও Monkey Prompt & Guide file (৪) সাব-সেকশনে। basic_plan +
   data_collector_log ইনপুট হিসেবে পাঠিয়ে Gemini দিয়ে জেনারেট করবে,
   ইউজার রিভিউ করে এডিট/সেভ করতে পারবে (অটো-সেভ না, ইউজার কনফার্ম করলে
   সেভ হবে)।
2. **Master Data Collector সার্চ-টার্ম সাজেশন** — Gemini-র Google Search
   grounding ব্যবহার করে basic_plan থেকে "কী সার্চ করতে হবে" সাজেস্ট করার
   একটা বাটন/আউটপুট এরিয়া (Master Data Collector Log সাব-সেকশনে)।
3. `ai_helping_enabled === false` হলে এই বাটনগুলো UI-তেই দেখাবে না (হাইড,
   ডিসেবল না) — পুরো সিস্টেম আগের ম্যানুয়াল মোডেই থাকবে।

টেস্ট: toggle OFF হলে বাটন hidden, toggle ON + mocked Gemini response
দিয়ে generate ফ্লো, Google Search grounding call mocked।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: Plan ট্যাব AI ON-state সম্পূর্ণ, পরের চাংক G4
   (Support Claude ট্যাবে AI ON-state)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk G3: Gemini-powered Final Plan/Prompt-Guide generation + search-term suggestion"
   — push করো।
5. Tag: git tag chunk-G3-done && git push origin chunk-G3-done
```

## G4 — Support Claude ট্যাবে Gemini ON-state ফিচার

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক G4" (G3 শেষ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-G3-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।
3. D3-এর Support Claude ট্যাব (ম্যানুয়াল Handover Note) পড়ো।

তোমার স্কোপ — শুধু `ai_helping_enabled === true` হলে সক্রিয়:

1. Monkey-র ব্রিফ পেস্ট করলে **Gemini সেটা স্ট্রাকচার্ড লগ এন্ট্রিতে
   সাজিয়ে দেবে** (key points বের করে) এবং **পরের প্রম্পট সাজেস্ট করবে**
   (একটা "Suggest next prompt" বাটন)।
2. **Handover Note এক ক্লিকে অটো-জেনারেট** — D3-এর ম্যানুয়াল
   concatenation-এর বদলে, ON থাকলে Gemini পুরো SupportLog + prompt_guide_file
   ইনপুট নিয়ে একটা সংক্ষিপ্ত, কাঠামোবদ্ধ handover summary জেনারেট করবে।
3. OFF থাকলে D3-এর ম্যানুয়াল "কপি সামারি" বাটনই কাজ করবে, এই নতুন বাটন
   hidden থাকবে।

টেস্ট: toggle OFF/ON উভয় অবস্থায় সঠিক বাটন দেখানো, mocked Gemini
structuring + handover generation।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: Support Claude AI ON-state সম্পূর্ণ, পরের চাংক G5
   (Checker Claude ট্যাবে AI ON-state)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk G4: Gemini brief-structuring + auto handover note generation"
   — push করো।
5. Tag: git tag chunk-G4-done && git push origin chunk-G4-done
```

## G5 — Checker Claude ট্যাবে Gemini ON-state ফিচার (GitHub রিভিউ)

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক G5" (G4 শেষ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-G4-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।
3. E2-এর Checker Claude ট্যাব (ম্যানুয়াল Issue Checklist) পড়ো।

তোমার স্কোপ — শুধু `ai_helping_enabled === true` হলে সক্রিয়:

Overview ট্যাবের GitHub repo লিংক থেকে Gemini (বড় context window সাপোর্ট
করা মডেল বেছে নাও — কোনটা বাছলে তা docs/HANDOFF_NEXT.md-এ লিখো) দিয়ে পুরো
কোড রিভিউ করে:
1. একটা **Issue Checklist অটো-জেনারেট** করবে (source="claude" হিসেবে
   E1-এর CheckerIssue-তে ইনসার্ট হবে)।
2. একটা **System Update Plan অটো-জেনারেট** করবে (E1-এর
   system_update_plan ফিল্ডে ড্রাফট হিসেবে বসবে, ইউজার এডিট/সেভ করবে)।

Hard constraint: GitHub রিপো fetch করার জন্য Gemini-কে repo URL পাঠানো
নিরাপদভাবে হ্যান্ডেল করো (private repo হলে access-token লাগতে পারে — এই
চাংকে শুধু public/accessible repo assume করো, private repo access
docs/HANDOFF_NEXT.md-এ "future work" হিসেবে নোট করে রাখো)।

টেস্ট: mocked Gemini response দিয়ে issue-insert + update-plan-draft ফ্লো,
toggle OFF হলে বাটন hidden।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: Checker Claude AI ON-state সম্পূর্ণ, পরের চাংক G6
   (AI Accounts-এ অপশনাল AI ফিচার, গ্রুপ G-এর শেষ চাংক)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk G5: Gemini full-repo code review — auto issue checklist + update plan"
   — push করো।
5. Tag: git tag chunk-G5-done && git push origin chunk-G5-done
```

## G6 — AI Accounts-এ অপশনাল AI ফিচার (limit-reached auto-detect)

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক G6" (G5 শেষ, গ্রুপ G-এর শেষ চাংক — Phase 7 complete হবে)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-G5-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ:

Monkey-র ব্রিফে "limit reached" জাতীয় লেখা পেলে Gemini সেই অ্যাকাউন্টের
status অটো 🔴 (limit_reached) করে দিতে পারবে — এটা **অপশনাল**, Settings
পেজে (G2) একটা আলাদা sub-toggle যোগ করো "Auto-detect limit from briefs"
(শুধু `ai_helping_enabled` ON থাকলেই এই sub-toggle দেখাবে/কাজ করবে)। D3/G4-এ
নতুন SupportLog এন্ট্রি সেভ হওয়ার সময়, এই sub-toggle ON থাকলে ব্রিফ টেক্সট
Gemini-কে পাঠিয়ে "limit reached" সিগন্যাল ডিটেক্ট করবে, পেলে B1-এর Account
status আপডেট এন্ডপয়েন্ট কল করবে।

টেস্ট: sub-toggle OFF/ON উভয় ক্ষেত্রে আচরণ, mocked Gemini detection ফ্লো।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: "গ্রুপ G (Phase 7 — Settings/AI Helping) সম্পূর্ণ,
   সব AI ON-state ফিচার (Plan/Support/Checker/Accounts) কাজ করছে, মাস্টার
   টগল দিয়ে পুরোপুরি নিয়ন্ত্রিত। পরের কাজ: গ্রুপ H (Quick Access Menu +
   Notes, H1 থেকে)।"
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk G6: optional Gemini limit-reached auto-detection for AI Accounts"
   — push করো।
5. Tag: git tag chunk-G6-done && git push origin chunk-G6-done
```

---
---

# গ্রুপ H — Global Quick Access Menu + Notes সিস্টেম (Phase 8)

## H1 — Note entity backend

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক H1" (G6 শেষ, গ্রুপ G সম্পূর্ণ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-G6-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ:

Note API সম্পূর্ণ করো — ফিল্ড: id, title, content, category (ফ্রি-টেক্সট,
ইউজার নিজের ইচ্ছামতো ক্যাটাগরি বানাতে পারবে), pinned(bool), created_at,
updated_at। এন্ডপয়েন্ট: CRUD + category দিয়ে ফিল্টার + কিওয়ার্ড সার্চ
(টাইটেল/কনটেন্টে টেক্সট-ম্যাচ — এটাই AI Helping OFF অবস্থার সার্চ)।

টেস্ট: CRUD, pin টগল, category ফিল্টার, কিওয়ার্ড সার্চ।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: Note backend সম্পূর্ণ, পরের চাংক H2 (Notes UI)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk H1: Note entity backend — CRUD, category filter, keyword search"
   — push করো।
5. Tag: git tag chunk-H1-done && git push origin chunk-H1-done
```

## H2 — Notes UI (গ্লোবাল নোটস)

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক H2" (H1 শেষ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-H1-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ:

Notes UI বানাও (এই চাংকে একটা স্ট্যান্ডঅ্যালোন `/notes` পেজ হিসেবে —
Quick Access Menu থেকে এটা ওপেন করার এন্ট্রি পয়েন্ট H4-এ যোগ হবে):

- **নোট তৈরি/এডিট**: **+ New Note** বাটন, লিখে/পেস্ট করে নতুন নোট, যেকোনো
  সময় এডিট।
- **ডিলিট** — যেকোনো নোট মুছে ফেলা।
- **পিন** — পিন করা নোট আলাদা "Pinned" সেকশনে সবার উপরে।
- **ক্যাটাগরি** — প্রতিটা নোটে ক্যাটাগরি ট্যাগ (নিজের ইচ্ছামতো বানানো
  যাবে), ক্যাটাগরি দিয়ে ফিল্টার।
- **সার্চ (AI OFF মোড)** — H1-এর কিওয়ার্ড সার্চ ওয়্যার করো, টাইটেল/কনটেন্টে
  টেক্সট মিললে দেখাবে।

টেস্ট: CRUD ফ্লো, pin সেকশন, category ফিল্টার, কিওয়ার্ড সার্চ UI।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: Notes UI (OFF-মোড সার্চ সহ) সম্পূর্ণ, পরের চাংক H3
   (সিমান্টিক সার্চ, AI ON)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk H2: Notes UI — CRUD, pin, category filter, keyword search"
   — push করো।
5. Tag: git tag chunk-H2-done && git push origin chunk-H2-done
```

## H3 — Notes সিমান্টিক সার্চ (AI ON-state)

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক H3" (H2 শেষ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-H2-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।
3. G1-এর provider-agnostic Gemini wrapper পড়ো।

তোমার স্কোপ — শুধু `ai_helping_enabled === true` হলে সক্রিয়:

Notes সার্চে Gemini দিয়ে সিমান্টিক সার্চ চালু করো — ন্যাচারাল ভাষার প্রশ্ন
(যেমন "আমি কোথায় auth নিয়ে নোট লিখেছিলাম?") দিলে এক্স্যাক্ট শব্দ না
মিললেও অর্থ বুঝে সঠিক নোট খুঁজে দেবে (Gemini-কে সব নোটের title+content
পাঠিয়ে সবচেয়ে প্রাসঙ্গিক নোটগুলোর id র‍্যাংক করিয়ে আনতে পারো, অথবা
embedding-based অ্যাপ্রোচ — কোনটা বেছে নিলে docs/HANDOFF_NEXT.md-এ লিখো)।
toggle OFF হলে H1/H2-এর কিওয়ার্ড সার্চেই ফিরে যাবে।

টেস্ট: toggle OFF/ON উভয় মোডে সঠিক সার্চ পাথ, mocked Gemini সিমান্টিক
র‍্যাংকিং।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: Notes সিমান্টিক সার্চ সম্পূর্ণ, পরের চাংক H4
   (Global Quick Access Menu, গ্রুপ H-এর শেষ চাংক)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk H3: Gemini-powered semantic search for Notes" — push করো।
5. Tag: git tag chunk-H3-done && git push origin chunk-H3-done
```

## H4 — Global Quick Access Menu (⋮)

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক H4" (H3 শেষ, গ্রুপ H-এর শেষ চাংক — Phase 8 complete হবে)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-H3-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।
3. এখন পর্যন্ত বানানো সব পেজ (`/`, `/accounts`, `/settings`, `/notes`,
   `/project/[id]` ও তার ৫ ট্যাব) পড়ে বোঝো।

তোমার স্কোপ:

প্রতিটা পেজের টপ-বারে একটা ⋮ (থ্রি-ডট) আইকন ফিক্সড বসাও — ক্লিক করলে ডান
পাশ থেকে সাইডবার ড্রয়ার খুলবে (Settings-এর মতো একই স্লাইড-ইন প্যাটার্ন)।
মেনু স্ট্রাকচার (hover করলে সাব-আইটেম ঠিক নিচে ড্রপডাউন আকারে খুলবে):

```
⋮ Quick Access
├── 📁 Projects   (hover →) + New Project / Pinned প্রজেক্টসমূহ / All Projects
├── 🗒 Notes      (hover →) Pinned নোটসমূহ / ক্যাটাগরি ব্রাউজ / Open All Notes
├── 🤖 AI Accounts (hover →) Monkey লিস্ট+স্ট্যাটাস / Claude লিস্ট+স্ট্যাটাস / Manage Accounts
├── ⚙ Settings    (hover →) AI Helping টগল (এখান থেকেই অন/অফ) / Open Settings
└── 📂 Current Project (শুধু প্রজেক্টের ভেতরে থাকলে, hover →)
      Overview / Plan / Coding / Support Claude / Checker Claude
```

- প্রতিটা ক্যাটাগরির পাশে ছোট স্ট্যাটাস ব্যাজ (যেমন AI Accounts-এ কয়টা
  🔴 Limit Reached আছে) — ড্রয়ার পুরো খোলার আগেই এক নজরে বোঝা যাবে।
- এই মেনু থেকেই সরাসরি অ্যাকশন নেওয়া যাবে (যেমন AI Helping টগল অন/অফ) —
  পুরো Settings পেজে যাওয়া বাধ্যতামূলক না।

টেস্ট: ড্রয়ার open/close, hover-flyout সাব-মেনু, স্ট্যাটাস ব্যাজ কাউন্ট,
মেনু থেকে সরাসরি AI Helping টগল কাজ করে কিনা।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: "গ্রুপ H (Phase 8 — Quick Access Menu + Notes)
   সম্পূর্ণ। পরের কাজ: গ্রুপ I (Visual Design System পুরো প্যানেল জুড়ে
   ফাইনাল পলিশ, I1 থেকে)।"
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk H4: global quick access menu (⋮) with hover-flyout categories"
   — push করো।
5. Tag: git tag chunk-H4-done && git push origin chunk-H4-done
```

---
---

# গ্রুপ I — UI / Visual Design System (Phase 9, ফাইনাল)

## I1 — ডিজাইন টোকেন কনসোলিডেশন

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর
"চাংক I1" (H4 শেষ, গ্রুপ H সম্পূর্ণ — পুরো ফিচার-সেট রেডি)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-H4-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।
3. docs/WORK_STATION_PANEL_GITHUB_CHUNK_PLAN.md-এর "রেফারেন্স — UI/Visual
   Design System" সেকশন আবার মনোযোগ দিয়ে পড়ো (কালার/টাইপোগ্রাফি/শেপ পুরো
   টেবিল)।
4. A2-এ যা বেস টোকেন সেট করেছিলে সেটা দেখো — এখন সেটাকে একটা single
   source-of-truth থিম ফাইলে (theme.ts/tailwind.config বা CSS variables
   ফাইল) consolidate করো, পুরো কোডবেসে যেখানেই hardcoded color/radius/font
   বসানো হয়েছে সব খুঁজে বের করে এই টোকেন রেফারেন্স করাও।

তোমার স্কোপ — শুধু ডিজাইন-টোকেন লেয়ার, ভিজ্যুয়াল ইন্টারঅ্যাকশন পলিশ (I2)
না:

- কালার প্যালেট হুবহু: Base `#0B0C0F`, Surface `#15161B`, Surface Elevated
  `#1D1F26`, Hairline/Border `#2A2C34`, Rim-glow `#4A4F5C`, Text Primary
  `#E8E9ED`, Text Muted `#8B8D97`, Status Available `#5FD48A`, Status
  Limit Reached `#E5637A`।
- টাইপোগ্রাফি: Display/Heading = Inter Tight/General Sans, Body = Inter,
  Utility/Mono = JetBrains Mono/IBM Plex Mono (GitHub লিংক, প্রম্পট/ব্রিফ
  লগ, টাইমস্ট্যাম্প, API key ফিল্ডে প্রয়োগ করো)।
- শেপ: border-radius ১৬–২০px গ্লোবালি সব কার্ড/বাটন/ইনপুট/ড্রয়ারে।
- কোনো আলাদা ব্রাইট অ্যাকসেন্ট কালার থাকবে না — শুধু glow + দুটো ফাংশনাল
  স্ট্যাটাস কালার।

টেস্ট: visual regression/snapshot টেস্ট (যদি ফ্রেমওয়ার্কে সাপোর্ট থাকে)
অথবা অন্তত একটা lint/grep-চেক যে hardcoded hex color কোডবেসে আর নেই (সব
টোকেন থেকে আসছে)।

শেষে (Definition of Done):
1. পুরো test suite পাশ করছে কনফার্ম করো।
2. docs/HANDOFF_NEXT.md: ডিজাইন টোকেন consolidate সম্পূর্ণ, পরের চাংক I2
   (rim-glow ইন্টারঅ্যাকশন + ৩-জোন লেআউট, ফাইনাল চাংক)।
3. docs/CHANGELOG.md-এ এন্ট্রি যোগ করো।
4. Commit: "chunk I1: design token consolidation — color, typography, shape"
   — push করো।
5. Tag: git tag chunk-I1-done && git push origin chunk-I1-done
```

## I2 — Rim-glow সিগনেচার ইন্টারঅ্যাকশন + ৩-জোন লেআউট (ফাইনাল)

```
আমি Work Station Panel প্রজেক্টে কাজ করছি, GitHub-ভিত্তিক chain-এর একদম
শেষ চাংক "I2" (I1 শেষ)।

Repo: <GITHUB_REPO_URL>  (branch: main)

প্রথমে করো:
1. Repo clone/pull করো (tag chunk-I1-done থেকে verify করো)।
2. docs/HANDOFF_NEXT.md পড়ো।

তোমার স্কোপ:

1. **সিগনেচার rim-glow ইন্টারঅ্যাকশন** পুরো প্যানেল জুড়ে সামঞ্জস্যপূর্ণভাবে
   বসাও: বাটন হোভার, অ্যাক্টিভ ট্যাব, ফোকাসড ইনপুট, স্ট্যাটাস ডট — এসবের
   কিনারায় সূক্ষ্ম glow/inner-highlight (Rim-glow `#4A4F5C`) দেখাবে, কোনো
   ফ্ল্যাট রঙিন ফিল না দিয়ে।
2. **৩-জোন লেআউট** কনসিস্টেন্টলি প্রয়োগ করো: বামে কম্প্যাক্ট নেভিগেশন
   রেইল (Projects শর্টকাট), মূল কনটেন্ট এরিয়ায় কার্ড-ভিত্তিক প্যানেল (soft
   border + subtle glow), ডান দিক থেকে স্লাইড করে আসা Quick
   Access/Settings ড্রয়ার (H4/G2 রি-ইউজ করে)।
3. প্রতিটা পেজ (Projects হোম, AI Accounts, Settings, Notes, Project-এর ৫
   ট্যাব) ঘুরে ঘুরে চেক করো ডিজাইন টোকেন (I1) আর rim-glow প্যাটার্ন
   সবখানে কনসিস্টেন্ট কিনা — অসামঞ্জস্য থাকলে ফিক্স করো।

টেস্ট: হোভার/ফোকাস স্টেটের CSS ক্লাস/টোকেন সঠিকভাবে অ্যাপ্লাই হয় তার
কম্পোনেন্ট টেস্ট, পূর্ণ regression (আগের সব ফিচার এখনো কাজ করছে)।

শেষে (Definition of Done):
1. **পুরো** test suite (backend + frontend, A1 থেকে I1 পর্যন্ত সব যোগ হয়ে
   যা আছে) ১০০% পাশ করছে কনফার্ম করো।
2. `npm run build` সফল কনফার্ম করো।
3. docs/HANDOFF_NEXT.md আপডেট করো: "সব ৯টা গ্রুপ (A–I) সম্পূর্ণ। বাকি শুধু
   ব্যবহারকারীর নিজের real Gemini API key দিয়ে end-to-end QA রান।"
4. docs/CHANGELOG.md-এ চূড়ান্ত এন্ট্রি যোগ করো।
5. একটা docs/FINAL_SUMMARY.md বানাও — গ্রুপ A থেকে I পর্যন্ত কী কী
   বানানো হলো, কোন ফাইলে কী আছে, তার সংক্ষিপ্ত সারাংশ।
6. Commit: "chunk I2: rim-glow signature interaction + 3-zone layout — final polish"
   — push করো।
7. Tag: git tag workstation-panel-final && git push origin workstation-panel-final

যদি context ফুরিয়ে যায় আর কাজ অসম্পূর্ণ থাকে, docs/HANDOFF_NEXT.md-এ
স্পষ্ট করে লিখো কোন অংশ সম্পূর্ণ আর কোনটা না — প্রয়োজনে এই চাংককেও নিজে
আরও ভেঙে (I2-১, I2-২...) পরের সেশনে চালিয়ে যাও, একই প্রোটোকল অনুসরণ করে।
```

---

## সব শেষে — যা AI দিয়ে করানো যাবে না

`workstation-panel-final` ট্যাগ হয়ে গেলেও এই কাজগুলো নিজে করতে হবে:

- **real Gemini API key দিয়ে সত্যিকারের টেস্ট রান** — Plan/Support/Checker
  ট্যাবের AI ফিচার, Notes সিমান্টিক সার্চ, Google Search grounding — real
  billing/network লাগে বলে কোনো sandboxed session এটা যাচাই করতে পারবে
  না।
- **AI Accounts-এ নিজের আসল Monkey/Claude অ্যাকাউন্টের login link/label
  বসানো** — এটা আপনার ব্যক্তিগত ডেটা, কোনো AI অনুমান করে বসাতে পারবে না।
- **রেফারেন্স ইমেজের বিরুদ্ধে ম্যানুয়াল ভিজ্যুয়াল/UX QA** — rim-glow লুক
  আসলে "ছবির টিউবের মতো" দেখাচ্ছে কিনা সেটা চোখে দেখে যাচাই করা লাগবে।
- **প্রাইভেট GitHub রিপোতে Gemini access-token সেটআপ** (G5-এ future-work
  হিসেবে ফ্ল্যাগ করা) — নিজের access-token/permission ম্যানেজ করতে হবে।
- **ক্রস-ডিভাইস/ব্রাউজার ম্যানুয়াল টেস্ট** — বিভিন্ন স্ক্রিন সাইজে ৩-জোন
  লেআউট আর ড্রয়ার আসলে কেমন লাগছে।

## কোনো চাংক ভুল করলে

- সংশ্লিষ্ট আগের tag-এ ফিরে যান: `git reset --hard chunk-B2-done` (যেমন)।
- একই প্রম্পট একটা fresh session-এ আবার পেস্ট করুন।
- কোনো চাংক নিজেই বড় মনে হলে, সেই session আরও ছোট ধাপে ভেঙে নিতে পারে —
  একই `docs/HANDOFF_NEXT.md` প্রোটোকল সেটা সামলে নেবে।

## পরবর্তী ধাপ

ধাপ ০ থেকে শুরু করুন, তারপর A1 থেকে I2 পর্যন্ত ক্রমানুসারে Monkey AI বা
Claude Code-এ পেস্ট করতে থাকুন। প্রশ্ন থাকলে বা কোনো চাংক স্কোপ ছোট/বড়
করতে চাইলে বলবেন, আপডেট করে দেব।
