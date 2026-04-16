import Link from 'next/link'
import PosterImage from '@/components/film/PosterImage'
import styles from './MiniShelf.module.css'

interface MiniShelfProps {
  entries: {
    film: {
      tmdb_id: number
      title: string
      poster_url: string | null
    }
    rating: number | null
  }[]
  username: string
  maxItems?: number
}

export default function MiniShelf({ entries, username, maxItems = 5 }: MiniShelfProps) {
  const visible = entries.slice(0, maxItems)

  if (visible.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Estante vazia</p>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {visible.map(entry => (
        <Link
          key={entry.film.tmdb_id}
          href={`/film/${entry.film.tmdb_id}`}
          className={styles.item}
          title={entry.film.title}
        >
          <div className={styles.poster}>
            <PosterImage src={entry.film.poster_url} alt={entry.film.title} />
            <div className={styles.overlay}>
              {entry.rating != null && (
                <span className={styles.rating}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--cx-gold)">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {entry.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
      {entries.length > maxItems && (
        <Link href={`/profile/${username}/shelf`} className={styles.more}>
          +{entries.length - maxItems}
        </Link>
      )}
    </div>
  )
}
