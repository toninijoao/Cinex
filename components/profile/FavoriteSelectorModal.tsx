'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import styles from './FavoriteSelectorModal.module.css'

interface FavoriteSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'film' | 'actor'
  onSelect: (item: any) => void
}

const HOLLYWOOD_FILMS = [
  {
    tmdb_id: 27205,
    title: "A Origem",
    release_year: 2010,
    poster_url: "https://image.tmdb.org/t/p/w342/9e3Dz7aCANy5aRUQF745IlNloJ1.jpg"
  },
  {
    tmdb_id: 157336,
    title: "Interestelar",
    release_year: 2014,
    poster_url: "https://image.tmdb.org/t/p/w342/6ricSDD83BClJsFdGB6x7cM0MFQ.jpg"
  },
  {
    tmdb_id: 238,
    title: "O Poderoso Chefão",
    release_year: 1972,
    poster_url: "https://image.tmdb.org/t/p/w342/oJagOzBu9Rdd9BrciseCm3U3MCU.jpg"
  },
  {
    tmdb_id: 155,
    title: "Batman: O Cavaleiro das Trevas",
    release_year: 2008,
    poster_url: "https://image.tmdb.org/t/p/w342/4lj1ikfsSmMZNyfdi8R8Tv5tsgb.jpg"
  },
  {
    tmdb_id: 680,
    title: "Pulp Fiction: Tempo de Violência",
    release_year: 1994,
    poster_url: "https://image.tmdb.org/t/p/w342/tptjnB2LDbuUWya9Cx5sQtv5hqb.jpg"
  },
  {
    tmdb_id: 550,
    title: "Clube da Luta",
    release_year: 1999,
    poster_url: "https://image.tmdb.org/t/p/w342/mCICnh7QBH0gzYaTQChBDDVIKdm.jpg"
  },
  {
    tmdb_id: 597,
    title: "Titanic",
    release_year: 1997,
    poster_url: "https://image.tmdb.org/t/p/w342/As0zX43h3w6kD2NS4uVHu9HKdEh.jpg"
  },
  {
    tmdb_id: 603,
    title: "Matrix",
    release_year: 1999,
    poster_url: "https://image.tmdb.org/t/p/w342/lDqMDI3xpbB9UQRyeXfei0MXhqb.jpg"
  }
]

const HOLLYWOOD_ACTORS = [
  {
    tmdb_id: 6193,
    name: "Leonardo DiCaprio",
    profile_path: "https://image.tmdb.org/t/p/w185/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg"
  },
  {
    tmdb_id: 287,
    name: "Brad Pitt",
    profile_path: "https://image.tmdb.org/t/p/w185/ajNaPmXVVMJFg9GWmu6MJzTaXdV.jpg"
  },
  {
    tmdb_id: 1245,
    name: "Scarlett Johansson",
    profile_path: "https://image.tmdb.org/t/p/w185/druW5adKddizHNSoPbI0q7Mvn0K.jpg"
  },
  {
    tmdb_id: 234352,
    name: "Margot Robbie",
    profile_path: "https://image.tmdb.org/t/p/w185/euDPyqLnuwaWMHajcU3oZ9uZezR.jpg"
  },
  {
    tmdb_id: 500,
    name: "Tom Cruise",
    profile_path: "https://image.tmdb.org/t/p/w185/maf8PhSvDCdEwjEMbYfGpojR5RP.jpg"
  },
  {
    tmdb_id: 3223,
    name: "Robert Downey Jr.",
    profile_path: "https://image.tmdb.org/t/p/w185/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg"
  },
  {
    tmdb_id: 85,
    name: "Johnny Depp",
    profile_path: "https://image.tmdb.org/t/p/w185/k2xt6EUxQDwYRKIyI4IBdZxfs8n.jpg"
  },
  {
    tmdb_id: 2037,
    name: "Cillian Murphy",
    profile_path: "https://image.tmdb.org/t/p/w185/2lKs67r7FI4bPu0AXxMUJZxmUXn.jpg"
  }
]

export default function FavoriteSelectorModal({
  isOpen,
  onClose,
  type,
  onSelect,
}: FavoriteSelectorModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const suggestions = (type === 'film' ? HOLLYWOOD_FILMS : HOLLYWOOD_ACTORS) as any[]

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setLoading(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true)
      try {
        const endpoint =
          type === 'film'
            ? `/api/tmdb/search?q=${encodeURIComponent(query)}`
            : `/api/tmdb/search/person?q=${encodeURIComponent(query)}`

        const res = await fetch(endpoint)
        const json = await res.json()
        setResults(json.results ?? [])
      } catch (err) {
        console.error('Error searching favorites:', err)
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => clearTimeout(delayDebounce)
  }, [query, type])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={type === 'film' ? 'Adicionar Filme Favorito' : 'Adicionar Ator Favorito'}
    >
      <div className={styles.container}>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="search"
            placeholder={type === 'film' ? 'Buscar filme por título...' : 'Buscar ator ou atriz por nome...'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
        </div>

        <div className={styles.resultsList}>
          {loading && (
            <p className={styles.statusMsg}>Buscando...</p>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className={styles.statusMsg}>Nenhum resultado encontrado.</p>
          )}

          {!loading && query.trim().length < 2 && (
            <div className={styles.suggestionsContainer}>
              <h4 className={styles.suggestionsHeading}>Sugestões populares</h4>
              <div className={styles.suggestionsList}>
                {suggestions.map(item => (
                  <button
                    key={item.tmdb_id}
                    type="button"
                    onClick={() => {
                      onSelect(item)
                      onClose()
                    }}
                    className={styles.resultItem}
                  >
                    <div className={styles.avatarWrap}>
                      {type === 'film' ? (
                        item.poster_url ? (
                          <img src={item.poster_url} alt="" className={styles.poster} />
                        ) : (
                          <div className={styles.posterFallback}>🎬</div>
                        )
                      ) : (
                        item.profile_path ? (
                          <img src={item.profile_path} alt="" className={styles.avatar} />
                        ) : (
                          <div className={styles.avatarFallback}>👤</div>
                        )
                      )}
                    </div>
                    <div className={styles.meta}>
                      <div className={styles.name}>{type === 'film' ? item.title : item.name}</div>
                      {type === 'film' && item.release_year && (
                        <div className={styles.sub}>{item.release_year}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && query.trim().length >= 2 &&
            results.map(item => (
              <button
                key={item.tmdb_id}
                type="button"
                onClick={() => {
                  onSelect(item)
                  onClose()
                }}
                className={styles.resultItem}
              >
                <div className={styles.avatarWrap}>
                  {type === 'film' ? (
                    item.poster_url ? (
                      <img src={item.poster_url} alt="" className={styles.poster} />
                    ) : (
                      <div className={styles.posterFallback}>🎬</div>
                    )
                  ) : (
                    item.profile_path ? (
                      <img src={item.profile_path} alt="" className={styles.avatar} />
                    ) : (
                      <div className={styles.avatarFallback}>👤</div>
                    )
                  )}
                </div>
                <div className={styles.meta}>
                  <div className={styles.name}>{type === 'film' ? item.title : item.name}</div>
                  {type === 'film' && item.release_year && (
                    <div className={styles.sub}>{item.release_year}</div>
                  )}
                </div>
              </button>
            ))}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
