-- Fitness tracker schema: profiles, food database, logs, photo scans.
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, holds body stats + daily goals
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  sex text check (sex in ('male', 'female', 'other')),
  date_of_birth date,
  height_cm numeric check (height_cm > 0),
  weight_kg numeric check (weight_kg > 0),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')) default 'moderate',
  goal text check (goal in ('lose', 'maintain', 'gain')) default 'maintain',
  daily_calorie_goal numeric,
  daily_protein_goal_g numeric,
  daily_carbs_goal_g numeric,
  daily_fat_goal_g numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- foods: shared nutrition database (USDA-seeded), read-only to clients
-- all macro columns are per 100g of the food unless noted
-- ---------------------------------------------------------------------------
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  usda_fdc_id integer unique,
  name text not null,
  brand text,
  category text,
  source text not null check (source in ('usda_foundation', 'usda_sr_legacy', 'usda_branded', 'open_food_facts', 'user', 'ai_vision')),
  calories_kcal numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  saturated_fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  potassium_mg numeric,
  cholesterol_mg numeric,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index foods_name_trgm_idx on public.foods using gin (name gin_trgm_ops);
create index foods_category_idx on public.foods (category);
create unique index foods_usda_fdc_id_idx on public.foods (usda_fdc_id) where usda_fdc_id is not null;

alter table public.foods enable row level security;

-- every signed-in user can browse the shared food database
create policy "foods_select_all" on public.foods
  for select using (auth.role() = 'authenticated');

-- users may only add their own ad-hoc foods (source must be 'user' and created_by = self)
create policy "foods_insert_own" on public.foods
  for insert with check (auth.uid() = created_by and source = 'user');

-- ---------------------------------------------------------------------------
-- food_logs: per-user diary entries. Macros are snapshotted at log time so
-- edits to the shared `foods` row never rewrite history.
-- ---------------------------------------------------------------------------
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references public.foods(id),
  custom_name text,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  quantity_g numeric not null check (quantity_g > 0),
  calories_kcal numeric not null,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  source text not null check (source in ('manual', 'search', 'photo_label', 'photo_vision')) default 'manual',
  photo_url text,
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint food_logs_has_food check (food_id is not null or custom_name is not null)
);

create index food_logs_user_logged_at_idx on public.food_logs (user_id, logged_at desc);

alter table public.food_logs enable row level security;

create policy "food_logs_select_own" on public.food_logs
  for select using (auth.uid() = user_id);
create policy "food_logs_insert_own" on public.food_logs
  for insert with check (auth.uid() = user_id);
create policy "food_logs_update_own" on public.food_logs
  for update using (auth.uid() = user_id);
create policy "food_logs_delete_own" on public.food_logs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- photo_scans: audit trail of every vision-API call (debugging + reprocessing)
-- ---------------------------------------------------------------------------
create table public.photo_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  scan_type text not null check (scan_type in ('label_ocr', 'food_vision')),
  raw_response jsonb,
  parsed_result jsonb,
  food_log_id uuid references public.food_logs(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.photo_scans enable row level security;

create policy "photo_scans_select_own" on public.photo_scans
  for select using (auth.uid() = user_id);
create policy "photo_scans_insert_own" on public.photo_scans
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- body_metrics: weight / body-fat tracking over time
-- ---------------------------------------------------------------------------
create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null default current_date,
  weight_kg numeric check (weight_kg > 0),
  body_fat_pct numeric check (body_fat_pct >= 0 and body_fat_pct <= 100),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, logged_date)
);

alter table public.body_metrics enable row level security;

create policy "body_metrics_all_own" on public.body_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- exercise_logs: calories burned, to net against intake
-- ---------------------------------------------------------------------------
create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity text not null,
  duration_minutes numeric check (duration_minutes > 0),
  calories_burned numeric not null default 0,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index exercise_logs_user_logged_at_idx on public.exercise_logs (user_id, logged_at desc);

alter table public.exercise_logs enable row level security;

create policy "exercise_logs_all_own" on public.exercise_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- storage bucket for food photos (private; access via signed URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('food-photos', 'food-photos', false)
on conflict (id) do nothing;

create policy "food_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "food_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
