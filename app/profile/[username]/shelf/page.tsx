'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FilmCard from '@/components/film/FilmCard'
import FilterPill from '@/components/ui/FilterPill'
import ShelfModal from '@/components/film/ShelfModal'
import styles from './page.module.css'

type StatusFilter = 'all' | 'watched' | 'watching' | 'want_to_watch' | 'dropped' | 'rewatching'
type SortOption = 'date' | 'rating' | 'title' | 'year'
type ViewMode = 'grid' | 'list'

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'watched', label: 'Assistidos' },
  { value: 'watching', label: 'Assistindo' },
  { value: 'want_to_watch', label: 'Quero assistir' },
  { value: 'rewatching', label: 'Reassistindo' },
  { value: 'dropped', label: 'Abandonados' },
]

export default function ShelfPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const supabase = createClient()

  const [entries, setEntries] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [loading, setLoading] = useState(true)
  const [shelfModal, setShelfModal] = useState<{ film: any; entry: any } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const [{ data: prof }, { data: { user } }] = await Promise.all([
        supabase.from('users').select('id, username, display_name').eq('username', username).single(),
        supabase.auth.getUser(),
      ])
      setProfile(prof)
      setCurrentUserId(user?.id ?? null)
      if (!prof) { setLoading(false); return }

      const isOwn = user?.id === prof.id
      let query = supabase
        .from('shelf_entries')
        .select('id, status, rating, review, watched_at, is_public, rewatch_count, film:films(id, tmdb_id, title, release_year, poster_url, runtime_minutes, avg_rating, ratings_count)')
        .eq('user_id', prof.id)
      if (!isOwn) query = query.eq('is_public', true)

      const { data } = await query.order('watched_at', { ascending: false })
      setEntries(data ?? [])
      setLoading(false)
    }
    fetchData()
  }, [username])

  useEffect(() => {
    let result = [...entries]

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(e => e.status === statusFilter)
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
      if (sortBy === 'title') return a.film.title.localeCompare(b.film.title)
      if (sortBy === 'year') return (b.film.release_year ?? 0) - (a.film.release_year ?? 0)
      // date
      return new Date(b.watched_at ?? b.created_at).getTime() - new Date(a.watched_at ?? a.created_at).getTime()
    })

    setFiltered(result)
  }, [entries, statusFilter, sortBy])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.grid}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className={`${styles.cardSk} skeleton`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div>
            <Link href={`/profile/${username}`} className={styles.back}>
              ← {profile?.display_name ?? username}
            </Link>
            <h1 className={styles.title}>Estante</h1>
          </div>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewActive : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Visualização em grade"
              id="shelf-view-grid"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewActive : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="Visualização em lista"
              id="shelf-view-list"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.statusPills}>
            {STATUS_FILTERS.map(s => (
              <FilterPill
                key={s.value}
                label={s.label}
                active={statusFilter === s.value}
                color="red"
                onClick={() => setStatusFilter(s.value as StatusFilter)}
                id={`shelf-status-${s.value}`}
              />
            ))}
          </div>

          <div className={styles.sortRow}>
            <span className={styles.sortLabel}>Ordenar:</span>
            <select
              id="shelf-sort"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className={styles.select}
            >
              <option value="date">Data</option>
              <option value="rating">Nota</option>
              <option value="title">Título</option>
              <option value="year">Ano</option>
            </select>
            <span className={styles.count}>{filtered.length} filme{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Films */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum filme nesta categoria</p>
            <span>Adicione filmes à sua estante para vê-los aqui.</span>
          </div>
        ) : viewMode === 'grid' ? (
          <div className={styles.grid}>
            {filtered.map(entry => (
              <FilmCard
                key={entry.id}
                tmdbId={entry.film.tmdb_id}
                title={entry.film.title}
                year={entry.film.release_year}
                posterUrl={entry.film.poster_url}
                avgRating={entry.film.avg_rating}
                ratingsCount={entry.film.ratings_count}
                userRating={entry.rating}
                userStatus={entry.status}
                onAddToShelf={() => setShelfModal({ film: entry.film, entry })}
              />
            ))}
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map(entry => (
              <div key={entry.id} className={styles.listRow}>
                <Link href={`/film/${entry.film.tmdb_id}`} className={styles.listPoster}>
                  {entry.film.poster_url && <img src={entry.film.poster_url} alt={entry.film.title} />}
                </Link>
                <div className={styles.listInfo}>
                  <Link href={`/film/${entry.film.tmdb_id}`} className={styles.listTitle}>
                    {entry.film.title}
                  </Link>
                  <span className={styles.listYear}>{entry.film.release_year}</span>
                  {entry.rating && (
                    <div className={styles.listRating}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--cx-gold)">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      {entry.rating.toFixed(1)}
                    </div>
                  )}
                  {entry.review && <p className={styles.listReview}>{entry.review}</p>}
                </div>
                <button
                  className={styles.listEdit}
                  onClick={() => setShelfModal({ film: entry.film, entry })}
                  aria-label="Editar entrada"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {shelfModal && (
        <ShelfModal
          isOpen={true}
          onClose={() => setShelfModal(null)}
          film={shelfModal.film}
          existingEntry={shelfModal.entry}
          onSaved={async () => {
            setShelfModal(null)
            // Refresh entries
            const { data: prof } = await supabase.from('users').select('id').eq('username', username).single()
            if (!prof) return
            const { data } = await supabase
              .from('shelf_entries')
              .select('id, status, rating, review, watched_at, is_public, rewatch_count, film:films(id, tmdb_id, title, release_year, poster_url, runtime_minutes, avg_rating, ratings_count)')
              .eq('user_id', prof.id)
              .order('watched_at', { ascending: false })
            setEntries(data ?? [])
          }}
        />
      )}
    </div>
  )
}
