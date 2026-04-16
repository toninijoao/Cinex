'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import FilmCard from '@/components/film/FilmCard'
import ReviewCard from '@/components/feed/ReviewCard'
import ShelfModal from '@/components/film/ShelfModal'
import StatsCard from '@/components/stats/StatsCard'
import MiniShelf from '@/components/profile/MiniShelf'
import FilterPill from '@/components/ui/FilterPill'
import { createClient } from '@/lib/supabase/client'
import { ClapperboardIcon, FlameIcon, TrophyIcon } from '@/components/ui/Icons'
import styles from './page.module.css'

type TabType = 'feed' | 'catalog'

export default function HomePage() {
  const supabase = createClient()
  const [tab, setTab] = useState<TabType>('feed')
  const [feedEntries, setFeedEntries] = useState<any[]>([])
  const [popularFilms, setPopularFilms] = useState<any[]>([])
  const [nowPlaying, setNowPlaying] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [miniShelf, setMiniShelf] = useState<any[]>([])
  const [shelfModal, setShelfModal] = useState<{ film: any } | null>(null)
  const [loadingFeed, setLoadingFeed] = useState(true)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [genreFilter, setGenreFilter] = useState<string | null>(null)

  const GENRE_FILTERS = ['Ação', 'Drama', 'Comédia', 'Terror', 'Ficção Científica', 'Animação']

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data } = await supabase
          .from('users')
          .select('username, display_name, avatar_url, films_count, total_runtime_minutes')
          .eq('id', authUser.id)
          .single()
        setUser(data)

        const { data: shelf } = await supabase
          .from('shelf_entries')
          .select('rating, film:films(tmdb_id, title, poster_url)')
          .eq('user_id', authUser.id)
          .eq('status', 'watched')
          .order('watched_at', { ascending: false })
          .limit(10)
        setMiniShelf(shelf ?? [])
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    const fetchFeed = async () => {
      setLoadingFeed(true)
      const { data } = await supabase
        .from('shelf_entries')
        .select(`
          id, status, rating, review, watched_at, created_at, is_public,
          user:users(username, display_name, avatar_url),
          film:films(tmdb_id, title, release_year, poster_url)
        `)
        .eq('is_public', true)
        .not('status', 'eq', 'want_to_watch')
        .order('created_at', { ascending: false })
        .limit(20)
      setFeedEntries(data ?? [])
      setLoadingFeed(false)
    }
    fetchFeed()
  }, [])

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoadingCatalog(true)
      const [pop, np] = await Promise.all([
        fetch('/api/tmdb/popular?page=1').then(r => r.json()),
        fetch('/api/tmdb/now-playing?page=1').then(r => r.json()),
      ])
      setPopularFilms((pop.results ?? []).slice(0, 12))
      setNowPlaying((np.results ?? []).slice(0, 8))
      setLoadingCatalog(false)
    }
    if (tab === 'catalog') fetchCatalog()
  }, [tab])

  function runtimeDisplay(mins: number) {
    const days = Math.floor(mins / 1440)
    const hrs = Math.floor((mins % 1440) / 60)
    if (days > 0) return `${days}d ${hrs}h`
    return `${hrs}h ${mins % 60}m`
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <div className="layout-feed">
          {/* ── Main column ── */}
          <main>
            {/* Tab toggle */}
            <div className={styles.toggleRow}>
              <div className={styles.toggle}>
                <button
                  id="tab-feed"
                  className={`${styles.toggleBtn} ${tab === 'feed' ? styles.toggleActive : ''}`}
                  onClick={() => setTab('feed')}
                >
                  Avaliações
                </button>
                <button
                  id="tab-catalog"
                  className={`${styles.toggleBtn} ${tab === 'catalog' ? styles.toggleActive : ''}`}
                  onClick={() => setTab('catalog')}
                >
                  Catálogo
                </button>
              </div>
            </div>

            {/* FEED TAB */}
            {tab === 'feed' && (
              <div className={styles.feed}>
                {loadingFeed ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`${styles.cardSkeleton} skeleton`} />
                  ))
                ) : feedEntries.length === 0 ? (
                  <div className="empty-state">
                    <p>Ainda não há avaliações por aqui.</p>
                    <span>Seja o primeiro — adicione filmes à sua estante!</span>
                  </div>
                ) : (
                  feedEntries.map(entry => (
                    <ReviewCard key={entry.id} entry={entry} showUser />
                  ))
                )}
              </div>
            )}

            {/* CATALOG TAB */}
            {tab === 'catalog' && (
              <div>
                {/* Genre filters */}
                <div className={styles.filters}>
                  <FilterPill
                    label="Todos"
                    active={genreFilter === null}
                    color="blue"
                    onClick={() => setGenreFilter(null)}
                    id="genre-all"
                  />
                  {GENRE_FILTERS.map(g => (
                    <FilterPill
                      key={g}
                      label={g}
                      active={genreFilter === g}
                      color="blue"
                      onClick={() => setGenreFilter(g)}
                      id={`genre-${g}`}
                    />
                  ))}
                </div>

                {loadingCatalog ? (
                  <div className={styles.filmGrid}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className={`${styles.filmSkeleton} skeleton`} />
                    ))}
                  </div>
                ) : (
                  <>
                    <section>
                      <h2 className={styles.sectionTitle}><ClapperboardIcon size={17} color="var(--cx-red)" /> Em cartaz</h2>
                      <div className={styles.filmGrid}>
                        {nowPlaying.map(film => (
                          <FilmCard
                            key={film.tmdb_id}
                            tmdbId={film.tmdb_id}
                            title={film.title}
                            year={film.release_year}
                            posterUrl={film.poster_url}
                            avgRating={film.tmdb_vote_average}
                            onAddToShelf={() => setShelfModal({ film })}
                          />
                        ))}
                      </div>
                    </section>

                    <section className={styles.section}>
                      <h2 className={styles.sectionTitle}><FlameIcon size={17} color="var(--cx-red)" /> Populares</h2>
                      <div className={styles.filmGrid}>
                        {popularFilms.map(film => (
                          <FilmCard
                            key={film.tmdb_id}
                            tmdbId={film.tmdb_id}
                            title={film.title}
                            year={film.release_year}
                            posterUrl={film.poster_url}
                            avgRating={film.tmdb_vote_average}
                            onAddToShelf={() => setShelfModal({ film })}
                          />
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>
            )}
          </main>

          {/* ── Sidebar ── */}
          <aside className={styles.sidebar}>
            {/* Mini profile */}
            {user ? (
              <div className={styles.sideProfile}>
                <div className={styles.sideAvatar}>
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt={user.display_name} />
                    : <span>{(user.display_name ?? 'U')[0].toUpperCase()}</span>
                  }
                </div>
                <div className={styles.sideName}>{user.display_name}</div>
                <div className={styles.sideStats}>
                  <div className={styles.sideStat}>
                    <span className={styles.sideStatNum} style={{ color: 'var(--cx-red)' }}>
                      {user.films_count ?? 0}
                    </span>
                    <span className={styles.sideStatLabel}>Filmes</span>
                  </div>
                  <div className={styles.sideStatDivider} />
                  <div className={styles.sideStat}>
                    <span className={styles.sideStatNum} style={{ color: 'var(--cx-blue)' }}>
                      {runtimeDisplay(user.total_runtime_minutes ?? 0)}
                    </span>
                    <span className={styles.sideStatLabel}>Assistidos</span>
                  </div>
                </div>

                {/* Mini shelf */}
                <div className={styles.sideSection}>
                  <div className={styles.sideSectionHeader}>
                    <span>Últimos assistidos</span>
                    <Link href={`/profile/${user.username}/shelf`} className={styles.seeAll}>
                      Ver tudo
                    </Link>
                  </div>
                  <MiniShelf entries={miniShelf} username={user.username} />
                </div>

                <Link href="/explore" className={styles.exploreBtn} id="sidebar-explore-btn">
                  Explorar filmes
                </Link>
              </div>
            ) : (
              <div className={styles.sideGuest}>
                <p className={styles.sideGuestTitle}>Sua estante vazia</p>
                <p className={styles.sideGuestSub}>
                  O Cinex foi engarrafado para cinéfilos. Crie sua conta para registrar os filmes que você assiste, salvar na lista de pendências e acompanhar seu ranking de minutos tela.
                </p>
                <div className={styles.sideGuestActions}>
                  <Link href="/register" className={styles.sideGuestBtn} id="sidebar-register-btn">
                    Criar conta
                  </Link>
                  <Link href="/login" className={styles.sideGuestLogin}>
                    Já tem conta?
                  </Link>
                </div>
              </div>
            )}

            {/* Weekly ranking placeholder */}
            <div className={styles.sideCard}>
              <div className={styles.sideSectionHeader}>
                <span className={styles.sideCardTitle}><TrophyIcon size={13} color="var(--cx-gold)" /> Mais avaliados</span>
              </div>
              <p className={styles.sideCardSub}>Em breve — ranking semanal</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Shelf modal */}
      {shelfModal && (
        <ShelfModal
          isOpen={true}
          onClose={() => setShelfModal(null)}
          film={shelfModal.film}
          onSaved={() => setShelfModal(null)}
        />
      )}
    </div>
  )
}
