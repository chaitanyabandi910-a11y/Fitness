-- Manual entries and photo-scan results should also grow the shared `foods`
-- library (source='user' / 'ai_vision'), not just create one-off log rows.
-- The original policy only allowed source='user'; broaden it to match.
drop policy "foods_insert_own" on public.foods;

create policy "foods_insert_own" on public.foods
  for insert with check (auth.uid() = created_by and source in ('user', 'ai_vision'));
