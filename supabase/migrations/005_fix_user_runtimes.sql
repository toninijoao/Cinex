-- 1. Update Bastardos Inglórios (TMDB 16869) runtime and details
update public.films
set runtime_minutes = 153,
    original_title = 'Inglourious Basterds',
    synopsis = 'Durante a Segunda Guerra Mundial, na França ocupada, um grupo de soldados judeus americanos, conhecidos como "Os Bastardos", é selecionado para espalhar o medo entre os nazistas. Paralelamente, uma jovem judia busca vingança pela morte de sua família em um cinema parisiense.'
where tmdb_id = 16869;

-- 2. Recalculate stats for all users based on their actual watched entries in shelf_entries
update public.users u
set total_runtime_minutes = coalesce(
      (
        select sum(coalesce(f.runtime_minutes, 0))
        from public.shelf_entries se
        join public.films f on se.film_id = f.id
        where se.user_id = u.id and se.status in ('watched', 'rewatching')
      ),
      0
    ),
    films_count = coalesce(
      (
        select count(*)
        from public.shelf_entries se
        where se.user_id = u.id and se.status in ('watched', 'rewatching')
      ),
      0
    );
