import Link from 'next/link'
import PosterImage from '@/components/film/PosterImage'
import StarRating from '@/components/film/StarRating'
import styles from './ReviewCard.module.css'

interface ReviewCardProps {
  entry: {
    id: string
    status: string
    rating: number | null
    review: string | null
    watched_at: string | null
    created_at: string
    user: {
      username: string
      display_name: string | null
      avatar_url: string | null
    }
    film: {
      tmdb_id: number
      title: string
      release_year: number | null
      poster_url: string | null
    }
  }
  showUser?: boolean
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `há ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `há ${days}d`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

const STATUS_ACTION: Record<string, string> = {
  watched:       'assistiu',
  watching:      'está assistindo',
  want_to_watch: 'quer assistir',
  dropped:       'abandonou',
  rewatching:    'está reassistindo',
}

export default function ReviewCard({ entry, showUser = true }: ReviewCardProps) {
  const { user, film } = entry
  const hasReview = entry.review && entry.review.length >= 10

  return (
    <article className={styles.card}>
      {/* Left: poster */}
      <Link href={`/film/${film.tmdb_id}`} className={styles.poster}>
        <PosterImage src={film.poster_url} alt={film.title} />
      </Link>

      {/* Right: content */}
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          {showUser && (
            <Link href={`/profile/${user.username}`} className={styles.userRow}>
              <div className={styles.avatar}>
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.display_name ?? user.username} />
                  : <span>{(user.display_name ?? user.username)[0].toUpperCase()}</span>
                }
              </div>
              <strong className={styles.displayName}>{user.display_name ?? user.username}</strong>
            </Link>
          )}
          <span className={styles.action}>
            {STATUS_ACTION[entry.status] ?? 'avaliou'}
          </span>
          <time className={styles.time} dateTime={entry.created_at}>
            {timeAgo(entry.created_at)}
          </time>
        </div>

        {/* Film info */}
        <Link href={`/film/${film.tmdb_id}`} className={styles.filmTitle}>
          {film.title}
          {film.release_year && (
            <span className={styles.filmYear}>{film.release_year}</span>
          )}
        </Link>

        {/* Rating */}
        {entry.rating != null && (
          <StarRating value={entry.rating} readonly size="sm" />
        )}

        {/* Review text */}
        {hasReview && (
          <p className={styles.review}>{entry.review}</p>
        )}

        {/* Footer actions */}
        <div className={styles.footer}>
          <button className={styles.actionBtn} id={`like-review-${entry.id}`} aria-label="Curtir">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Curtir
          </button>
          <button className={styles.actionBtn} id={`comment-review-${entry.id}`} aria-label="Comentar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Comentar
          </button>
        </div>
      </div>
    </article>
  )
}
