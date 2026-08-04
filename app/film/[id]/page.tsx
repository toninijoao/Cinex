'use client'

import { useState, useEffect, useRef } from 'react'
import { use } from 'react'
import Link from 'next/link'
import StarRating from '@/components/film/StarRating'
import PosterImage from '@/components/film/PosterImage'
import ReviewCard from '@/components/feed/ReviewCard'
import ShelfModal from '@/components/film/ShelfModal'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function FilmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const tmdbId = parseInt(id)
  const supabase = createClient()

  const [film, setFilm] = useState<any>(null)
  const [cast, setCast] = useState<any[]>([])
  const [crew, setCrew] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [dbFilm, setDbFilm] = useState<any>(null)
  const [userEntry, setUserEntry] = useState<any>(null)
  const [shelfOpen, setShelfOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const castScrollRef = useRef<HTMLDivElement>(null)

  const scrollCast = (direction: 'left' | 'right') => {
    if (!castScrollRef.current) return
    const container = castScrollRef.current
    const scrollAmount = 400
    const { scrollLeft, scrollWidth } = container
    const singleWidth = scrollWidth / 3

    if (direction === 'right') {
      if (scrollLeft + scrollAmount >= 2 * singleWidth) {
        container.scrollLeft = scrollLeft - singleWidth
      }
      container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      })
    } else {
      if (scrollLeft - scrollAmount < singleWidth) {
        container.scrollLeft = scrollLeft + singleWidth
      }
      container.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  useEffect(() => {
    if (cast.length > 0 && castScrollRef.current) {
      const container = castScrollRef.current
      container.scrollLeft = container.scrollWidth / 3
    }
  }, [cast])

  useEffect(() => {
    const fetchData = async () => {
      // Fetch from TMDB proxy
      const res = await fetch(`/api/tmdb/film/${tmdbId}`)
      const json = await res.json()
      setFilm(json.film)
      setCast(json.cast ?? [])
      setCrew(json.crew ?? [])
      setLoading(false)

      // Check if cached in Supabase
      const { data: dbF } = await supabase
        .from('films')
        .select('*')
        .eq('tmdb_id', tmdbId)
        .single()
      setDbFilm(dbF)

      if (dbF) {
        // Fetch Cinex reviews
        const { data: entries } = await supabase
          .from('shelf_entries')
          .select(`
            id, status, rating, review, watched_at, created_at,
            user:users(username, display_name, avatar_url),
            film:films(tmdb_id, title, release_year, poster_url)
          `)
          .eq('film_id', dbF.id)
          .eq('is_public', true)
          .not('rating', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20)
        setReviews(entries ?? [])

        // User's entry
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: entry } = await supabase
            .from('shelf_entries')
            .select('*')
            .eq('user_id', authUser.id)
            .eq('film_id', dbF.id)
            .single()
          setUserEntry(entry)
        }
      }
    }

    if (!isNaN(tmdbId)) fetchData()
  }, [tmdbId])

  useEffect(() => {
    if (!film?.images || film.images.length <= 1) return
    const interval = setInterval(() => {
      setActiveImageIndex(prev => (prev + 1) % film.images.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [film?.images])

  const directors = crew.filter(c => c.job === 'director')
  const writers   = crew.filter(c => c.job === 'writer')

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={`${styles.heroSkeleton} skeleton`} />
        <div className="container">
          <div className={styles.contentSkeleton}>
            <div className={`${styles.posterSk} skeleton`} />
            <div className={styles.infoSk}>
              {[200, 140, 100, 320].map((w, i) => (
                <div key={i} className="skeleton" style={{ height: 16, width: w, borderRadius: 6 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!film) {
    return (
      <div className="container">
        <div className="empty-state" style={{ marginTop: 60 }}>
          <p>Filme não encontrado.</p>
          <Link href="/explore">← Voltar ao catálogo</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Hero backdrop */}
      <div className={styles.hero}>
        {film.backdrop_url && (
          <img
            src={film.backdrop_url}
            alt=""
            className={styles.backdrop}
          />
        )}
        <div className={styles.heroOverlay} />
      </div>

      <div className="container">
        {/* Main content */}
        <div className={styles.main}>
          {/* Poster */}
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(film.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.poster}
          >
            <PosterImage src={film.poster_url_lg} alt={film.title} />
            {film.trailer_url && (
              <button
                className={styles.trailerBtn}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setTrailerOpen(true)
                }}
                id="film-trailer-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21"/>
                </svg>
                Ver trailer
              </button>
            )}
          </a>

          {/* Info */}
          <div className={styles.info}>
            <h1 className={styles.title}>{film.title}</h1>
            {film.original_title !== film.title && (
              <p className={styles.originalTitle}>{film.original_title}</p>
            )}

            <div className={styles.meta}>
              {film.release_year && <span>{film.release_year}</span>}
              {film.runtime_minutes && <span>{film.runtime_minutes} min</span>}
              {film.origin_country && <span>{film.origin_country}</span>}
            </div>

            {/* Genres */}
            {film.genres?.length > 0 && (
              <div className={styles.genres}>
                {film.genres.map((g: { id: number; name: string }) => (
                  <span key={g.id} className={styles.genre}>{g.name}</span>
                ))}
              </div>
            )}

            {/* TMDB rating */}
            {film.tmdb_vote_average > 0 && (
              <div className={styles.tmdbRating}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--cx-gold)">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <strong>{film.tmdb_vote_average.toFixed(1)}</strong>
                <span>no TMDB</span>
              </div>
            )}

            {/* Cinex avg rating */}
            {dbFilm?.avg_rating > 0 && (
              <div className={styles.cinexRating}>
                <StarRating value={dbFilm.avg_rating} readonly size="md" />
                <span className={styles.ratingCount}>
                  {dbFilm.ratings_count} avaliação{dbFilm.ratings_count !== 1 ? 'ões' : ''} no Cinex
                </span>
              </div>
            )}

            {/* Synopsis */}
            {film.synopsis && (
              <p className={styles.synopsis}>{film.synopsis}</p>
            )}

            {/* Credits */}
            {directors.length > 0 && (
              <div className={styles.creditRow}>
                <span className={styles.creditLabel}>Direção</span>
                <span className={styles.creditNames}>{directors.map((d: any) => d.name).join(', ')}</span>
              </div>
            )}
            {writers.length > 0 && (
              <div className={styles.creditRow}>
                <span className={styles.creditLabel}>Roteiro</span>
                <span className={styles.creditNames}>{writers.map((w: any) => w.name).join(', ')}</span>
              </div>
            )}

            {/* CTA */}
            <div className={styles.cta}>
              {userEntry ? (
                <div className={styles.userEntryRow}>
                  <div className={styles.userEntryInfo}>
                    {userEntry.rating && <StarRating value={userEntry.rating} readonly size="sm" />}
                    <span className={styles.userEntryStatus}>Na sua estante</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setShelfOpen(true)}
                    id="film-edit-shelf-btn"
                  >
                    Editar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setShelfOpen(true)}
                  id="film-add-shelf-btn"
                  className={styles.addShelfBtn}
                >
                  + Adicionar à estante
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Cast */}
        {cast.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Elenco</h2>
            <div className={styles.castWrapper}>
              <button
                className={`${styles.castArrow} ${styles.castArrowLeft}`}
                onClick={() => scrollCast('left')}
                aria-label="Rolar para esquerda"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>

              <div className={styles.castScroll} ref={castScrollRef}>
                {[...cast, ...cast, ...cast].map((member: any, idx: number) => (
                  <div key={`${member.tmdb_id}-${idx}`} className={styles.castCard}>
                    <div className={styles.castPhoto}>
                      {member.profile_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.profile_url} alt={member.name} />
                      ) : (
                        <div className={styles.castNoPhoto}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className={styles.castName}>{member.name}</div>
                    {member.character && (
                      <div className={styles.castCharacter}>{member.character}</div>
                    )}
                  </div>
                ))}
              </div>

              <button
                className={`${styles.castArrow} ${styles.castArrowRight}`}
                onClick={() => scrollCast('right')}
                aria-label="Rolar para direita"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </button>
            </div>
          </section>
        )}

        {/* Images Carousel */}
        {film.images && film.images.length > 0 && (
          <section className={styles.carouselSection}>
            <h2 className={styles.sectionTitle}>Cliques de {film.title}</h2>
            <div className={styles.carouselContainer}>
              <div className={styles.carouselTrack}>
                 {film.images.map((imgUrl: string, idx: number) => {
                  const total = film.images.length
                  let diff = idx - activeImageIndex
                  if (diff > total / 2) diff -= total
                  if (diff < -total / 2) diff += total

                  let slideClass = styles.carouselSlide
                  if (diff === 0) {
                    slideClass += ` ${styles.carouselSlideActive}`
                  } else if (diff === -1) {
                    slideClass += ` ${styles.carouselSlideLeft}`
                  } else if (diff === 1) {
                    slideClass += ` ${styles.carouselSlideRight}`
                  } else if (diff < -1) {
                    slideClass += ` ${styles.carouselSlideFarLeft}`
                  } else {
                    slideClass += ` ${styles.carouselSlideFarRight}`
                  }

                  const isLeft = diff === -1
                  const isRight = diff === 1

                  return (
                    <div
                      key={idx}
                      className={slideClass}
                      onClick={() => {
                        if (isLeft) setActiveImageIndex((activeImageIndex - 1 + total) % total)
                        if (isRight) setActiveImageIndex((activeImageIndex + 1) % total)
                      }}
                    >
                      <img src={imgUrl} alt={`${film.title} - Foto ${idx + 1}`} loading="lazy" />
                    </div>
                  )
                })}
              </div>

              {/* Indicators */}
              {film.images.length > 1 && (
                <div className={styles.carouselDots}>
                  {film.images.map((_: any, idx: number) => (
                    <button
                      key={idx}
                      className={`${styles.carouselDot} ${idx === activeImageIndex ? styles.carouselDotActive : ''}`}
                      onClick={() => setActiveImageIndex(idx)}
                      aria-label={`Ir para foto ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Avaliações no Cinex
            {reviews.length > 0 && <span className={styles.reviewCount}>{reviews.length}</span>}
          </h2>
          {reviews.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p className="text-md">Seja o primeiro a avaliar!</p>
              <span>Adicione à sua estante e deixe uma review.</span>
            </div>
          ) : (
            <div className={styles.reviewsGrid}>
              {reviews.map(entry => (
                <ReviewCard key={entry.id} entry={entry} showUser />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Trailer modal */}
      {trailerOpen && film.trailer_url && (
        <div className={styles.trailerOverlay} onClick={() => setTrailerOpen(false)}>
          <div className={styles.trailerModal}>
            <button
              className={styles.trailerClose}
              onClick={() => setTrailerOpen(false)}
              aria-label="Fechar trailer"
              id="film-trailer-close-btn"
            >
              ×
            </button>
            <iframe
              src={film.trailer_url + '?autoplay=1'}
              title={`Trailer — ${film.title}`}
              allowFullScreen
              allow="autoplay"
              className={styles.trailerFrame}
            />
          </div>
        </div>
      )}

      {/* Shelf modal */}
      <ShelfModal
        isOpen={shelfOpen}
        onClose={() => setShelfOpen(false)}
        film={{
          tmdb_id: tmdbId,
          title: film.title,
          poster_url: film.poster_url_lg,
          runtime_minutes: film.runtime_minutes,
          release_year: film.release_year,
          id: dbFilm?.id,
        }}
        existingEntry={userEntry}
        onSaved={() => {
          setShelfOpen(false)
          // Refresh user entry
          const refresh = async () => {
            if (!dbFilm) return
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (authUser) {
              const { data } = await supabase
                .from('shelf_entries')
                .select('*')
                .eq('user_id', authUser.id)
                .eq('film_id', dbFilm.id)
                .single()
              setUserEntry(data)
            }
          }
          refresh()
        }}
      />
    </div>
  )
}
