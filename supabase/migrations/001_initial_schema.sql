-- ============================================================
-- CINEX — Initial Database Schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS (extends auth.users)
-- ============================================================
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  email text not null,
  display_name text,
  avatar_url text,
  bio text,
  location text,
  total_runtime_minutes integer not null default 0,
  films_count integer not null default 0,
  is_public boolean not null default true,
  annual_goal integer default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Limpeza da política caso ela já exista para evitar erros na recriação
drop policy if exists "Public profiles are viewable by everyone" on public.users;
create policy "Public profiles are viewable by everyone"
  on public.users for select
  using (is_public = true or auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- ============================================================
-- GENRES
-- ============================================================
create table if not exists public.genres (
  id serial primary key,
  tmdb_id integer unique not null,
  name text not null
);

alter table public.genres enable row level security;

drop policy if exists "Genres are public" on public.genres;
create policy "Genres are public" on public.genres for select using (true);

drop policy if exists "Service role can manage genres" on public.genres;
create policy "Service role can manage genres" on public.genres for all using (auth.role() = 'service_role');

-- ============================================================
-- FILMS (TMDB cache)
-- ============================================================
create table if not exists public.films (
  id uuid primary key default uuid_generate_v4(),
  tmdb_id integer unique not null,
  title text not null,
  original_title text,
  release_year integer,
  runtime_minutes integer,
  synopsis text,
  poster_url text,
  backdrop_url text,
  trailer_url text,
  avg_rating numeric(3,2) default 0,
  ratings_count integer default 0,
  tmdb_vote_average numeric(4,2),
  origin_country text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.films enable row level security;

drop policy if exists "Films are public" on public.films;
create policy "Films are public" on public.films for select using (true);

drop policy if exists "Service role can manage films" on public.films;
create policy "Service role can manage films" on public.films for all using (auth.role() = 'service_role');

-- ============================================================
-- FILM GENRES (many-to-many)
-- ============================================================
create table if not exists public.film_genres (
  film_id uuid references public.films(id) on delete cascade,
  genre_id integer references public.genres(id) on delete cascade,
  primary key (film_id, genre_id)
);

alter table public.film_genres enable row level security;

drop policy if exists "Film genres are public" on public.film_genres;
create policy "Film genres are public" on public.film_genres for select using (true);

drop policy if exists "Service role can manage film genres" on public.film_genres;
create policy "Service role can manage film genres" on public.film_genres for all using (auth.role() = 'service_role');

-- ============================================================
-- PEOPLE (cast/crew cache)
-- ============================================================
create table if not exists public.people (
  id uuid primary key default uuid_generate_v4(),
  tmdb_id integer unique not null,
  name text not null,
  profile_url text,
  created_at timestamptz not null default now()
);

alter table public.people enable row level security;

drop policy if exists "People are public" on public.people;
create policy "People are public" on public.people for select using (true);

drop policy if exists "Service role can manage people" on public.people;
create policy "Service role can manage people" on public.people for all using (auth.role() = 'service_role');

-- ============================================================
-- FILM CREDITS
-- ============================================================
create table if not exists public.film_credits (
  id uuid primary key default uuid_generate_v4(),
  film_id uuid references public.films(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  job text not null, -- 'actor' | 'director' | 'writer'
  character_name text,
  display_order integer default 0,
  unique(film_id, person_id, job)
);

alter table public.film_credits enable row level security;

drop policy if exists "Film credits are public" on public.film_credits;
create policy "Film credits are public" on public.film_credits for select using (true);

drop policy if exists "Service role can manage film credits" on public.film_credits;
create policy "Service role can manage film credits" on public.film_credits for all using (auth.role() = 'service_role');

-- ============================================================
-- SHELF ENTRIES (the heart of the system)
-- ============================================================
do $$ begin
  create type public.shelf_status as enum (
    'watched', 'watching', 'want_to_watch', 'dropped', 'rewatching'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.shelf_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  film_id uuid references public.films(id) on delete cascade not null,
  status public.shelf_status not null default 'want_to_watch',
  rating numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5 and rating * 2 = floor(rating * 2))),
  review text,
  is_public boolean not null default true,
  rewatch_count integer not null default 0,
  watched_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, film_id)
);

alter table public.shelf_entries enable row level security;

drop policy if exists "Public shelf entries are viewable by everyone" on public.shelf_entries;
create policy "Public shelf entries are viewable by everyone"
  on public.shelf_entries for select
  using (
    is_public = true
    or auth.uid() = user_id
    or exists (
      select 1 from public.users u where u.id = user_id and u.is_public = true
    )
  );

drop policy if exists "Users can manage their own shelf" on public.shelf_entries;
create policy "Users can manage their own shelf"
  on public.shelf_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: Update user runtime + films_count on shelf change
-- ============================================================
create or replace function public.update_user_stats()
returns trigger language plpgsql security definer as $$
declare
  v_runtime integer;
  old_counts boolean;
  new_counts boolean;
begin
  -- Determine if old/new status counts toward watched
  old_counts := (TG_OP = 'UPDATE' or TG_OP = 'DELETE') 
    and OLD.status in ('watched', 'rewatching');
  new_counts := (TG_OP = 'INSERT' or TG_OP = 'UPDATE') 
    and NEW.status in ('watched', 'rewatching');

  -- Get film runtime
  select runtime_minutes into v_runtime
  from public.films
  where id = coalesce(NEW.film_id, OLD.film_id);

  v_runtime := coalesce(v_runtime, 0);

  if TG_OP = 'INSERT' and new_counts then
    update public.users
    set total_runtime_minutes = greatest(0, total_runtime_minutes + v_runtime),
        films_count = films_count + 1,
        updated_at = now()
    where id = NEW.user_id;

  elsif TG_OP = 'DELETE' and old_counts then
    update public.users
    set total_runtime_minutes = greatest(0, total_runtime_minutes - v_runtime),
        films_count = greatest(0, films_count - 1),
        updated_at = now()
    where id = OLD.user_id;

  elsif TG_OP = 'UPDATE' then
    if not old_counts and new_counts then
      update public.users
      set total_runtime_minutes = greatest(0, total_runtime_minutes + v_runtime),
          films_count = films_count + 1,
          updated_at = now()
      where id = NEW.user_id;
    elsif old_counts and not new_counts then
      update public.users
      set total_runtime_minutes = greatest(0, total_runtime_minutes - v_runtime),
          films_count = greatest(0, films_count - 1),
          updated_at = now()
      where id = NEW.user_id;
    end if;
  end if;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists shelf_stats_trigger on public.shelf_entries;
create trigger shelf_stats_trigger
  after insert or update or delete on public.shelf_entries
  for each row execute function public.update_user_stats();

-- ============================================================
-- Update film avg_rating on shelf change
-- ============================================================
create or replace function public.update_film_rating()
returns trigger language plpgsql security definer as $$
declare
  v_film_id uuid;
begin
  v_film_id := coalesce(NEW.film_id, OLD.film_id);
  update public.films
  set avg_rating = (
        select coalesce(avg(rating), 0)
        from public.shelf_entries
        where film_id = v_film_id and rating is not null
      ),
      ratings_count = (
        select count(*)
        from public.shelf_entries
        where film_id = v_film_id and rating is not null
      )
  where id = v_film_id;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists film_rating_trigger on public.shelf_entries;
create trigger film_rating_trigger
  after insert or update or delete on public.shelf_entries
  for each row execute function public.update_film_rating();

-- ============================================================
-- WATCHLISTS
-- ============================================================
create table if not exists public.watchlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  description text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.watchlists enable row level security;

drop policy if exists "Public watchlists viewable by everyone" on public.watchlists;
create policy "Public watchlists viewable by everyone"
  on public.watchlists for select
  using (is_public = true or auth.uid() = user_id);

drop policy if exists "Users manage their own watchlists" on public.watchlists;
create policy "Users manage their own watchlists"
  on public.watchlists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.watchlist_films (
  watchlist_id uuid references public.watchlists(id) on delete cascade,
  film_id uuid references public.films(id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (watchlist_id, film_id)
);

alter table public.watchlist_films enable row level security;

drop policy if exists "Watchlist films viewable if list is public" on public.watchlist_films;
create policy "Watchlist films viewable if list is public"
  on public.watchlist_films for select
  using (exists (
    select 1 from public.watchlists w
    where w.id = watchlist_id and (w.is_public = true or w.user_id = auth.uid())
  ));

drop policy if exists "List owners manage watchlist films" on public.watchlist_films;
create policy "List owners manage watchlist films"
  on public.watchlist_films for all
  using (exists (
    select 1 from public.watchlists w
    where w.id = watchlist_id and w.user_id = auth.uid()
  ));

-- ============================================================
-- FOLLOWS
-- ============================================================
create table if not exists public.follows (
  follower_id uuid references public.users(id) on delete cascade,
  following_id uuid references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.follows enable row level security;

drop policy if exists "Follows are public" on public.follows;
create policy "Follows are public" on public.follows for select using (true);

drop policy if exists "Users manage their own follows" on public.follows;
create policy "Users manage their own follows"
  on public.follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

-- ============================================================
-- LIKES (polymorphic)
-- ============================================================
create table if not exists public.likes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  target_type text not null check (target_type in ('review', 'watchlist', 'comment')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique(user_id, target_type, target_id)
);

alter table public.likes enable row level security;

drop policy if exists "Likes are public" on public.likes;
create policy "Likes are public" on public.likes for select using (true);

drop policy if exists "Users manage their own likes" on public.likes;
create policy "Users manage their own likes"
  on public.likes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- COMMENTS (polymorphic)
-- ============================================================
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  target_type text not null check (target_type in ('review', 'watchlist', 'film')),
  target_id uuid not null,
  content text not null check (length(content) >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments enable row level security;

drop policy if exists "Comments are public" on public.comments;
create policy "Comments are public" on public.comments for select using (true);

drop policy if exists "Users manage their own comments" on public.comments;
create policy "Users manage their own comments"
  on public.comments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  actor_id uuid references public.users(id) on delete cascade,
  type text not null check (type in (
    'new_follower', 'like_review', 'comment_review',
    'like_list', 'comment_film', 'like_comment'
  )),
  target_type text,
  target_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users see their own notifications" on public.notifications;
create policy "Users see their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "System can create notifications" on public.notifications;
create policy "System can create notifications"
  on public.notifications for insert
  with check (true);

drop policy if exists "Users can mark their notifications read" on public.notifications;
create policy "Users can mark their notifications read"
  on public.notifications for update
  using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_shelf_entries_user_id on public.shelf_entries(user_id);
create index if not exists idx_shelf_entries_film_id on public.shelf_entries(film_id);
create index if not exists idx_shelf_entries_status on public.shelf_entries(status);
create index if not exists idx_shelf_entries_watched_at on public.shelf_entries(watched_at desc);
create index if not exists idx_films_tmdb_id on public.films(tmdb_id);
create index if not exists idx_films_synced_at on public.films(synced_at);
create index if not exists idx_follows_follower on public.follows(follower_id);
create index if not exists idx_follows_following on public.follows(following_id);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_watchlist_films_list on public.watchlist_films(watchlist_id, position);

-- ============================================================
-- AUTO-UPDATE updated_at helper
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists shelf_entries_updated_at on public.shelf_entries;
create trigger shelf_entries_updated_at before update on public.shelf_entries
  for each row execute function public.set_updated_at();

drop trigger if exists watchlists_updated_at on public.watchlists;
create trigger watchlists_updated_at before update on public.watchlists
  for each row execute function public.set_updated_at();

drop trigger if exists comments_updated_at on public.comments;
create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

-- ============================================================
-- Auto-create user profile on sign-up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, username, email, display_name, avatar_url)
  values (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
