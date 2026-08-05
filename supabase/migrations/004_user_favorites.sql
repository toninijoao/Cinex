-- ============================================================
-- CINEX — User Favorite Films, Favorite Actors, and Best Actor
-- ============================================================

-- 1. Table for User Favorite Films (Top 4, ordered by position 1-4)
create table if not exists public.user_favorite_films (
  user_id uuid references public.users(id) on delete cascade not null,
  film_id uuid references public.films(id) on delete cascade not null,
  position integer not null check (position between 1 and 4),
  created_at timestamptz not null default now(),
  primary key (user_id, position)
);

alter table public.user_favorite_films enable row level security;

drop policy if exists "Favorite films are public" on public.user_favorite_films;
create policy "Favorite films are public"
  on public.user_favorite_films for select using (true);

drop policy if exists "Users can manage their favorite films" on public.user_favorite_films;
create policy "Users can manage their favorite films"
  on public.user_favorite_films for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Table for User Favorite Actors (Top 3 Podium, positions 1-3)
create table if not exists public.user_favorite_actors (
  user_id uuid references public.users(id) on delete cascade not null,
  actor_tmdb_id integer not null,
  actor_name text not null,
  actor_profile_path text,
  position integer not null check (position between 1 and 3),
  created_at timestamptz not null default now(),
  primary key (user_id, position)
);

alter table public.user_favorite_actors enable row level security;

drop policy if exists "Favorite actors are public" on public.user_favorite_actors;
create policy "Favorite actors are public"
  on public.user_favorite_actors for select using (true);

drop policy if exists "Users can manage their favorite actors" on public.user_favorite_actors;
create policy "Users can manage their favorite actors"
  on public.user_favorite_actors for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Add columns to shelf_entries to elect the best actor in a film
alter table public.shelf_entries add column if not exists best_actor_tmdb_id integer;
alter table public.shelf_entries add column if not exists best_actor_name text;

-- Index for searching who voted for who as best actor
create index if not exists idx_shelf_entries_best_actor on public.shelf_entries(best_actor_tmdb_id) where (best_actor_tmdb_id is not null);
