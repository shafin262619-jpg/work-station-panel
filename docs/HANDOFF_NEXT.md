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
