-- ============================================================
-- CINEX — Add RLS policies for cache tables
-- Allow authenticated users to insert/update cached films
-- ============================================================

drop policy if exists "Authenticated users can insert films" on public.films;
create policy "Authenticated users can insert films"
  on public.films for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update films" on public.films;
create policy "Authenticated users can update films"
  on public.films for update
  using (auth.role() = 'authenticated');
