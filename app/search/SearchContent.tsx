'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import FilmCard from '@/components/film/FilmCard'
import ShelfModal from '@/components/film/ShelfModal'
import { FilmIcon, UserIcon } from '@/components/ui/Icons'
import { getHighResAvatarUrl } from '@/lib/avatar'
import styles from './page.module.css'

type SearchTab = 'films' | 'users'

export default function SearchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQuery)
  const [tab, setTab] = useState<SearchTab>('films')
  const [films, setFilms] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [shelfModal, setShelfModal] = useState<{ film: any } | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setFilms([]); setUsers([]); return }
    setLoading(true)

    const [filmRes, userRes] = await Promise.allSettled([
      fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`).then(r => r.json()),
      fetch(`/api/users/search?q=${encodeURIComponent(q)}`).then(r => r.json()),
    ])

    setFilms(filmRes.status === 'fulfilled' ? filmRes.value.results ?? [] : [])
    setUsers(userRes.status === 'fulfilled' ? userRes.value.users ?? [] : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      doSearch(query)
      if (query) {
        router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false })
      }
    }, 300)
    return () => clearTimeout(debounce)
  }, [query, doSearch, router])

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>Buscar</h1>

        <div className={styles.searchBar}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            id="search-input"
            type="search"
            placeholder="Buscar filmes ou usuários..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
        </div>

        <div className={styles.tabs}>
          <button
            id="search-tab-films"
            className={`${styles.tabBtn} ${tab === 'films' ? styles.tabActive : ''}`}
            onClick={() => setTab('films')}
          >
            <FilmIcon size={15} /> Filmes {films.length > 0 && <span className={styles.badge}>{films.length}</span>}
          </button>
          <button
            id="search-tab-users"
            className={`${styles.tabBtn} ${tab === 'users' ? styles.tabActive : ''}`}
            onClick={() => setTab('users')}
          >
            <UserIcon size={15} /> Usuários {users.length > 0 && <span className={styles.badge}>{users.length}</span>}
          </button>
        </div>

        {loading ? (
          <div className={styles.filmGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`${styles.cardSk} skeleton`} />
            ))}
          </div>
        ) : query.trim().length < 2 ? (
          <div className="empty-state">
            <p>Digite pelo menos 2 caracteres para buscar</p>
          </div>
        ) : tab === 'films' ? (
          films.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum filme encontrado para &quot;{query}&quot;</p>
            </div>
          ) : (
            <div className={styles.filmGrid}>
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
          )
        ) : (
          users.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum usuário encontrado para &quot;{query}&quot;</p>
            </div>
          ) : (
            <div className={styles.userList}>
              {users.map((u: any) => (
                <Link key={u.id} href={`/profile/${u.username}`} className={styles.userCard} id={`search-user-${u.username}`}>
                  <div className={styles.userAvatar}>
                    {u.avatar_url
                      ? <img src={getHighResAvatarUrl(u.avatar_url) || ''} alt={u.display_name} />
                      : <span>{(u.display_name ?? u.username ?? 'U')[0].toUpperCase()}</span>
                    }
                  </div>
                  <div>
                    <div className={styles.userName}>{u.display_name}</div>
                    <div className={styles.userHandle}>@{u.username}</div>
                  </div>
                  <div className={styles.userFilms}>{u.films_count ?? 0} filmes</div>
                </Link>
              ))}
            </div>
          )
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
