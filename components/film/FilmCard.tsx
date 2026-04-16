'use client'

import Link from 'next/link'
import { useState } from 'react'
import PosterImage from './PosterImage'
import StarRating from './StarRating'
import styles from './FilmCard.module.css'

interface FilmCardProps {
  tmdbId: number
  title: string
  year?: number | null
  posterUrl?: string | null
  avgRating?: number
  ratingsCount?: number
  userRating?: number | null
  userStatus?: string | null
  onAddToShelf?: () => void
  size?: 'sm' | 'md' | 'lg'
}

const STATUS_LABEL: Record<string, string> = {
  watched: 'Assistido',
  watching: 'Assistindo',
  want_to_watch: 'Quero assistir',
  dropped: 'Abandonei',
  rewatching: 'Reassistindo',
}

export default function FilmCard({
  tmdbId,
  title,
  year,
  posterUrl,
  avgRating,
  ratingsCount,
  userRating,
  userStatus,
  onAddToShelf,
  size = 'md',
}: FilmCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={`${styles.card} ${styles[size]}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link href={`/film/${tmdbId}`} className={styles.posterLink} aria-label={`Ver ${title}`}>
        <div className={styles.poster}>
          <PosterImage src={posterUrl} alt={title} />

          {/* Hover overlay */}
          {hovered && (
            <div className={styles.overlay}>
              {userRating != null ? (
                <StarRating value={userRating} readonly size="sm" />
              ) : avgRating != null && avgRating > 0 ? (
                <div className={styles.avgRating}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--cx-gold)">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span>{avgRating.toFixed(1)}</span>
                </div>
              ) : null}

              {userStatus && (
                <span className={`${styles.statusBadge} ${styles[userStatus]}`}>
                  {STATUS_LABEL[userStatus] ?? userStatus}
                </span>
              )}

              <button
                className={styles.addBtn}
                onClick={e => { e.preventDefault(); onAddToShelf?.() }}
                aria-label={userStatus ? 'Editar na estante' : 'Adicionar à estante'}
                id={`add-shelf-${tmdbId}`}
              >
                {userStatus ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </Link>

      <div className={styles.info}>
        <Link href={`/film/${tmdbId}`} className={styles.title} title={title}>
          {title}
        </Link>
        {year && <span className={styles.year}>{year}</span>}
        {avgRating != null && avgRating > 0 && size !== 'sm' && (
          <div className={styles.rating}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--cx-gold)">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span>{avgRating.toFixed(1)}</span>
            {ratingsCount != null && <span className={styles.count}>({ratingsCount})</span>}
          </div>
        )}
      </div>
    </div>
  )
}
