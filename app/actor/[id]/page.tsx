'use client'

import { useState, useEffect, useRef } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function ActorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const personId = parseInt(id)

  const [person, setPerson] = useState<any>(null)
  const [cast, setCast] = useState<any[]>([])
  const [cinexPoints, setCinexPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const movieScrollRef = useRef<HTMLDivElement>(null)

  const scrollMovies = (direction: 'left' | 'right') => {
    if (!movieScrollRef.current) return
    const container = movieScrollRef.current
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
    if (cast.length > 0 && movieScrollRef.current) {
      const container = movieScrollRef.current
      container.scrollLeft = container.scrollWidth / 3
    }
  }, [cast])

  useEffect(() => {
    const fetchActorData = async () => {
      try {
        const res = await fetch(`/api/tmdb/person/${personId}`)
        if (!res.ok) throw new Error('Não foi possível carregar os detalhes do ator.')
        const data = await res.json()
        setPerson(data.person)
        setCast(data.cast)

        // Query Cinex Points (count how many times this actor was elected best actor in reviews)
        const supabase = createClient()
        const { count } = await supabase
          .from('shelf_entries')
          .select('*', { count: 'exact', head: true })
          .eq('best_actor_tmdb_id', personId)
          .eq('is_public', true)

        setCinexPoints(count ?? 0)
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Erro ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }

    if (personId) {
      fetchActorData()
    }
  }, [personId])

  // Helper formatting functions
  function formatBirthday(dateStr: string | null) {
    if (!dateStr) return 'Não informada'
    try {
      const parts = dateStr.split('-')
      if (parts.length !== 3) return dateStr
      const year = parts[0]
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ]
      const month = monthNames[parseInt(parts[1]) - 1]
      const day = parseInt(parts[2])
      const age = calculateAge(dateStr)
      return `${day} de ${month} de ${year} ${age ? `(${age} anos)` : ''}`
    } catch (e) {
      return dateStr
    }
  }

  function calculateAge(dateStr: string | null) {
    if (!dateStr) return null
    try {
      const birthDate = new Date(dateStr)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const m = today.getMonth() - birthDate.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age
    } catch (e) {
      return null
    }
  }

  function getGenderLabel(gender: number) {
    switch (gender) {
      case 1: return 'Feminino'
      case 2: return 'Masculino'
      case 3: return 'Não binário'
      default: return 'Não especificado'
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.heroSkeleton} />
        <div className="container">
          <div className={styles.contentSkeleton}>
            <div className={styles.posterSk} />
            <div className={styles.infoSk}>
              <div style={{ height: 40, width: '40%', background: 'var(--cx-surface3)', borderRadius: 6, marginBottom: 20 }} />
              <div style={{ height: 20, width: '100%', background: 'var(--cx-surface2)', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 20, width: '90%', background: 'var(--cx-surface2)', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 20, width: '95%', background: 'var(--cx-surface2)', borderRadius: 4, marginBottom: 8 }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !person) {
    return (
      <div className="container">
        <div className="empty-state" style={{ marginTop: 60 }}>
          <p>{error || 'Ator não encontrado.'}</p>
          <Link href="/explore">← Voltar ao catálogo</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Hero backdrop (blurred, showing their most popular movie) */}
      <div className={styles.hero}>
        {person.backdrop_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.backdrop_url}
            alt=""
            className={styles.backdrop}
          />
        )}
        <div className={styles.heroOverlay} />
      </div>

      <div className="container">
        <div className={styles.main}>
          {/* Sidebar Left: Profile Image & Personal Info */}
          <div className={styles.sidebar}>
            <div className={styles.profileContainer}>
              {person.profile_url_lg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.profile_url_lg} alt={person.name} className={styles.profileImg} />
              ) : (
                <div className={styles.noProfile}>
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Personal Details */}
            <div className={styles.personalInfo}>
              <h3 className={styles.infoTitle}>Informações Pessoais</h3>
              
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Nascimento</span>
                <span className={styles.infoValue}>{formatBirthday(person.birthday)}</span>
              </div>

              {person.place_of_birth && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Local de Nascimento</span>
                  <span className={styles.infoValue}>{person.place_of_birth}</span>
                </div>
              )}

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Gênero</span>
                <span className={styles.infoValue}>{getGenderLabel(person.gender)}</span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Filmes creditados</span>
                <span className={styles.infoValue}>{person.total_movies} trabalhos</span>
              </div>
            </div>
          </div>

          {/* Main Column Right: Name, Bio & Works Carousel */}
          <div className={styles.content}>
            <h1 className={styles.name}>{person.name}</h1>
            <div className={styles.statsRow}>
              <div className={styles.cinexPointsBadge} title="Pontos acumulados quando eleito(a) como Melhor Atuação em avaliações de filmes">
                <span>🏆</span>
                <span className={styles.pointsCount}>{cinexPoints}</span>
                <span className={styles.pointsLabel}>Cinex Points</span>
              </div>
            </div>
            {person.awards && person.awards.length > 0 && (
              <div className={styles.awardsRow}>
                {person.awards.map((award: any, index: number) => {
                  let icon = null
                  if (award.type === 'oscar') {
                    icon = (
                      <svg viewBox="0 0 24 24" className={styles.awardIcon}>
                        <path fill="currentColor" d="M12,2A2,2,0,0,1,14,4a1.88,1.88,0,0,1-.5,1.2L13,6.5V17h1.5a.5.5,0,0,1,.5.5V19H9V17.5a.5.5,0,0,1,.5-.5H11V6.5l-.5-1.3A1.88,1.88,0,0,1,10,4,2,2,0,0,1,12,2Z"/>
                      </svg>
                    )
                  } else if (award.type === 'golden_globe') {
                    icon = (
                      <svg viewBox="0 0 24 24" className={styles.awardIcon}>
                        <path fill="currentColor" d="M12,2a5,5,0,1,0,5,5A5,5,0,0,0,12,2Zm0,9a4,4,0,1,1,4-4A4,4,0,0,1,12,11ZM11,13h2v4a2,2,0,0,1,2,2H9a2,2,0,0,1,2,-2Z"/>
                      </svg>
                    )
                  } else if (award.type === 'sag') {
                    icon = (
                      <svg viewBox="0 0 24 24" className={styles.awardIcon}>
                        <path fill="currentColor" d="M12,2a2,2,0,1,0,2,2A2,2,0,0,0,12,2Zm1,6h1.5l-1.5,4v6h1a.5.5,0,0,1,.5.5V20H9V18.5a.5.5,0,0,1,.5-.5H11V11.5L9.5,8H11l1,2.5ZM14.5,9a1,1,0,1,1,-1,-1A1,1,0,0,1,14.5,9Z"/>
                      </svg>
                    )
                  } else if (award.type === 'bafta') {
                    icon = (
                      <svg viewBox="0 0 24 24" className={styles.awardIcon}>
                        <path fill="currentColor" d="M12,2A7,7,0,0,0,5,9c0,5,3,9.5,7,12,4-2.5,7-7,7-12A7,7,0,0,0,12,2Zm-3,7a1.5,1.5,0,1,1,1.5,1.5A1.5,1.5,0,0,1,9,9Zm6,0a1.5,1.5,0,1,1,1.5,1.5A1.5,1.5,0,0,1,15,9Zm-3,6a3,3,0,0,1,-2.5,-1.5h5A3,3,0,0,1,12,15Z"/>
                      </svg>
                    )
                  } else if (award.type === 'emmy') {
                    icon = (
                      <svg viewBox="0 0 24 24" className={styles.awardIcon}>
                        <path fill="currentColor" d="M12,2a3,3,0,1,0,3,3A3,3,0,0,0,12,2Zm3,7.5V11l-3,3v4.5a2,2,0,0,1,2,2H10a2,2,0,0,1,2,-2V14L9,11V9.5c0,-1,1.5,-2.5,3,-2.5S15,8.5,15,9.5Z"/>
                      </svg>
                    )
                  }

                  return (
                    <div key={index} className={styles.awardBadge} title={`${award.count}x ${award.name}`}>
                      {icon}
                      <span className={styles.awardCount}>{award.count}x</span>
                      <span className={styles.awardName}>{award.name}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {person.biography && (
              <div className={styles.bioSection}>
                <h2 className={styles.sectionTitle}>Biografia</h2>
                <p className={styles.biography}>{person.biography}</p>
              </div>
            )}

            {/* "Atuou em" Carousel Section */}
            {cast.length > 0 && (
              <section className={styles.worksSection}>
                <h2 className={styles.sectionTitle}>Atuou em</h2>
                <div className={styles.worksWrapper}>
                  {/* Left arrow */}
                  <button
                    className={`${styles.worksArrow} ${styles.worksArrowLeft}`}
                    onClick={() => scrollMovies('left')}
                    aria-label="Rolar para esquerda"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                  </button>

                  {/* Horizontal Scroll Track */}
                  <div className={styles.worksScroll} ref={movieScrollRef}>
                    {[...cast, ...cast, ...cast].map((movie: any, idx: number) => (
                      <Link
                        href={`/film/${movie.id}`}
                        key={`${movie.id}-${idx}`}
                        className={styles.movieCard}
                      >
                        <div className={styles.posterContainer}>
                          {movie.poster_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={movie.poster_url} alt={movie.title} className={styles.moviePoster} />
                          ) : (
                            <div className={styles.noPoster}>
                              <span>{movie.title}</span>
                            </div>
                          )}
                        </div>
                        <div className={styles.movieTitle}>{movie.title}</div>
                        {movie.character && (
                          <div className={styles.movieCharacter}>como {movie.character}</div>
                        )}
                      </Link>
                    ))}
                  </div>

                  {/* Right arrow */}
                  <button
                    className={`${styles.worksArrow} ${styles.worksArrowRight}`}
                    onClick={() => scrollMovies('right')}
                    aria-label="Rolar para direita"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
