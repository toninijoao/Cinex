'use client'

import { useState, useEffect, useCallback } from 'react'
import FilmCard from '@/components/film/FilmCard'
import FilterPill from '@/components/ui/FilterPill'
import ShelfModal from '@/components/film/ShelfModal'
import styles from './page.module.css'

type SortOption = 'popular' | 'rating' | 'newest'

const GENRES = [
  { label: 'Ação', tmdbId: 28 },
  { label: 'Aventura', tmdbId: 12 },
  { label: 'Animação', tmdbId: 16 },
  { label: 'Comédia', tmdbId: 35 },
  { label: 'Crime', tmdbId: 80 },
  { label: 'Drama', tmdbId: 18 },
  { label: 'Fantasia', tmdbId: 14 },
  { label: 'Terror', tmdbId: 27 },
  { label: 'Romance', tmdbId: 10749 },
  { label: 'Ficção Científica', tmdbId: 878 },
  { label: 'Thriller', tmdbId: 53 },
  { label: 'Documentário', tmdbId: 99 },
]

const DECADES = ['2020s', '2010s', '2000s', '1990s', '1980s', 'Clássicos']

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'popular', label: 'Mais populares' },
  { value: 'rating', label: 'Melhor nota' },
  { value: 'newest', label: 'Mais recentes' },
]

export default function ExplorePage() {
  const [films, setFilms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [selectedDecade, setSelectedDecade] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [shelfModal, setShelfModal] = useState<{ film: any } | null>(null)

  const fetchFilms = useCallback(async () => {
    setLoading(true)
    try {
      let url: string
      if (searchQuery.trim().length > 1) {
        url = `/api/tmdb/search?q=${encodeURIComponent(searchQuery)}&page=${page}`
      } else {
        const params = new URLSearchParams()
        params.set('page', String(page))
        if (selectedGenre) params.set('with_genres', String(selectedGenre))
        if (selectedDecade) {
          const startYear = selectedDecade === 'Clássicos' ? '1900' : selectedDecade.slice(0, 4)
          const endYear = selectedDecade === 'Clássicos' ? '1979' : String(parseInt(startYear) + 9)
          params.set('primary_release_date.gte', `${startYear}-01-01`)
          params.set('primary_release_date.lte', `${endYear}-12-31`)
        }
        if (sortBy === 'popular') params.set('sort_by', 'popularity.desc')
        else if (sortBy === 'rating') params.set('sort_by', 'vote_average.desc')
        else params.set('sort_by', 'primary_release_date.desc')

        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(selectedGenre ? 'all' : 'popular')}&page=${page}`)
        const json = await res.json()
        setFilms(json.results ?? [])
        setTotalPages(json.total_pages ?? 1)
        setLoading(false)
        return
      }

      const res = await fetch(url)
      const json = await res.json()
      setFilms(json.results ?? [])
      setTotalPages(json.total_pages ?? 1)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedGenre, selectedDecade, sortBy, page])

  useEffect(() => {
    const timer = setTimeout(fetchFilms, 300)
    return () => clearTimeout(timer)
  }, [fetchFilms])

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Explorar filmes</h1>

          {/* Search */}
          <div className={styles.searchBar}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              id="explore-search"
              type="search"
              placeholder="Buscar por título..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Gênero</span>
            <div className={styles.pills}>
              <FilterPill
                label="Todos"
                active={selectedGenre === null}
                color="blue"
                onClick={() => { setSelectedGenre(null); setPage(1) }}
                id="genre-all"
              />
              {GENRES.map(g => (
                <FilterPill
                  key={g.tmdbId}
                  label={g.label}
                  active={selectedGenre === g.tmdbId}
                  color="blue"
                  onClick={() => { setSelectedGenre(g.tmdbId); setPage(1) }}
                  id={`genre-${g.tmdbId}`}
                />
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Década</span>
            <div className={styles.pills}>
              {DECADES.map(d => (
                <FilterPill
                  key={d}
                  label={d}
                  active={selectedDecade === d}
                  color="red"
                  onClick={() => { setSelectedDecade(p => p === d ? null : d); setPage(1) }}
                  id={`decade-${d}`}
                />
              ))}
            </div>
          </div>

          <div className={styles.sortRow}>
            <span className={styles.filterLabel}>Ordenar por:</span>
            <select
              id="explore-sort"
              value={sortBy}
              onChange={e => { setSortBy(e.target.value as SortOption); setPage(1) }}
              className={styles.select}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className={`${styles.skeleton} skeleton`} />
            ))}
          </div>
        ) : films.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum filme encontrado</p>
            <span>Tente ajustar os filtros ou buscar outro título</span>
          </div>
        ) : (
          <div className={styles.grid}>
            {films.map(film => (
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              id="page-prev"
            >
              ← Anterior
            </button>
            <span className={styles.pageInfo}>Página {page} de {Math.min(totalPages, 500)}</span>
            <button
              className={styles.pageBtn}
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              id="page-next"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>

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
