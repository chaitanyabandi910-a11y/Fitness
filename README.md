# Fitness Tracker

A daily fitness/calorie tracker: log food from a USDA-backed nutrition database,
snap a photo of a nutrition label or a plate of food for an AI-powered estimate,
and track calories/macros/weight/exercise against personal goals.

- **Frontend**: React + TypeScript + Vite + Tailwind CSS v4, React Router, TanStack Query
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions), all tables behind Row Level Security
- **Nutrition data**: USDA FoodData Central (Foundation + SR Legacy datasets)
- **Photo analysis**: a swappable open-weight vision model (default: Qwen2.5-VL via OpenRouter's
  free tier) called server-side from a Supabase Edge Function — change providers any time by
  editing env vars, not code (see [supabase/functions/_shared/vision.ts](supabase/functions/_shared/vision.ts))

## 1. One-time setup

### Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Once it's ready, go to **Project Settings → API** and copy:
   - Project URL
   - `anon` `public` key
   - `service_role` key (keep this secret — never put it in frontend code)
3. Go to **Project Settings → General** and copy the **Reference ID** (also visible in the project URL).

### Get API keys

- **USDA FoodData Central**: sign up free at [api.data.gov/signup](https://api.data.gov/signup) —
  the key arrives by email instantly. This is the **US** government food database API. It is not
  the same as `data.gov.in` (India's open data portal) — that site has no equivalent
  food-nutrition API, so a `data.gov.in` key will not work with `scripts/ingest-usda.ts`.
- **Vision model (photo feature)**: sign up free at [openrouter.ai](https://openrouter.ai) →
  Keys → Create Key. OpenRouter proxies many open-weight vision models; several are entirely
  free (no card required) — the app defaults to `qwen/qwen2.5-vl-72b-instruct:free`.

### Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with the values above. `VITE_`-prefixed vars are used by the frontend;
`SUPABASE_SERVICE_ROLE_KEY`, `USDA_API_KEY` are used only by local scripts and are gitignored.

### Link and migrate the Supabase project

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # applies supabase/migrations/*.sql
```

This creates all tables (`profiles`, `foods`, `food_logs`, `photo_scans`, `body_metrics`,
`exercise_logs`), their RLS policies, and the private `food-photos` storage bucket.

### Deploy the photo-analysis Edge Function

The vision API key must live as a **Supabase secret**, never in frontend code:

```bash
npx supabase secrets set VISION_API_KEY=sk-or-v1-...
npx supabase functions deploy analyze-food-photo
```

**To switch vision providers/models later**, no code changes are needed — just update secrets
and redeploy:

```bash
npx supabase secrets set VISION_API_BASE_URL=https://api.together.xyz/v1
npx supabase secrets set VISION_MODEL=meta-llama/Llama-Vision-Free
npx supabase secrets set VISION_API_KEY=...
npx supabase functions deploy analyze-food-photo
```

Any OpenAI-compatible `/chat/completions` endpoint works: OpenRouter, Together.ai, Fireworks,
a self-hosted Ollama/vLLM server, or a paid provider like OpenAI — see
[supabase/functions/_shared/vision.ts](supabase/functions/_shared/vision.ts).

### Seed the food database from USDA

```bash
npm run ingest:usda
```

This pulls the USDA Foundation + SR Legacy datasets (~9,000 whole foods — vegetables, fruits,
meats, grains, dairy, etc.) via the official API and upserts them into the `foods` table. Safe
to re-run; it upserts on `usda_fdc_id`. Takes a few minutes.

## 2. Run the app

```bash
npm install
npm run dev
```

Open http://localhost:5173, sign up, and start logging. New accounts get a default `profiles`
row automatically; fill in body stats on the Profile page to get suggested calorie/macro goals.

## 3. How the photo feature works

1. User uploads/takes a photo in the app → it's uploaded to the private `food-photos` storage
   bucket under `<user_id>/...` (RLS-scoped, so users can only read their own photos).
2. The app calls the `analyze-food-photo` Edge Function with the storage path.
3. The function downloads the image, sends it to the configured vision model requesting
   structured JSON output, and auto-detects:
   - **Nutrition label visible** → OCRs the exact printed values (`label_ocr`, high confidence).
   - **No label (plate/produce/etc.)** → identifies each food item and estimates macros from
     portion size (`food_vision`, lower confidence).
4. Every scan is logged to `photo_scans` for auditing; the user reviews/edits the parsed result
   before it's saved as a `food_logs` entry.

## Project structure

```
src/
  components/   Layout, route guard, shared UI (progress bars)
  contexts/     Supabase auth context
  lib/          Supabase client, nutrition/BMR math
  pages/        Dashboard, Log Food, Scan Photo, History, Profile
  types/        Hand-written Supabase Database types
supabase/
  migrations/   SQL schema + RLS policies
  functions/
    analyze-food-photo/  Edge Function entrypoint (Deno)
    _shared/vision.ts    swappable vision-model client (change env vars, not code)
scripts/
  ingest-usda.ts  USDA FoodData Central ingestion script
```

## Notes on the data model

- `foods` is a shared, read-only (to clients) nutrition database seeded from USDA. All macro
  columns are **per 100g**.
- `food_logs` snapshots the computed macros at log time, so later edits to `foods` never rewrite
  a user's history.
- Mobile app: this backend (Supabase schema, Edge Function, RLS policies) is reusable as-is for
  a future React Native/Expo app — only the frontend would need to be rebuilt.
