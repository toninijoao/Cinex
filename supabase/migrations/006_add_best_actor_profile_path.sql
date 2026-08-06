-- Add best_actor_profile_path column to shelf_entries
alter table public.shelf_entries add column if not exists best_actor_profile_path text;

-- Backfill profile path for existing ratings of popular actors
update public.shelf_entries
set best_actor_profile_path = 'https://image.tmdb.org/t/p/w185/ajNaPmXVVMJFg9GWmu6MJzTaXdV.jpg'
where best_actor_tmdb_id = 287 and best_actor_profile_path is null;

update public.shelf_entries
set best_actor_profile_path = 'https://image.tmdb.org/t/p/w185/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg'
where best_actor_tmdb_id = 6193 and best_actor_profile_path is null;
