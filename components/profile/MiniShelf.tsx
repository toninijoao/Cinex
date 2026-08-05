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
          </div>
          
          <div className={styles.meta}>
            <div className={styles.filmTitle}>{entry.film.title}</div>
            
            {entry.rating != null && (
              <div className={styles.ratingRow}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const starValue = i + 1
                  const isFilled = entry.rating! >= starValue
                  const isHalf = !isFilled && entry.rating! >= starValue - 0.5

                  return (
                    <svg
                      key={i}
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      className={styles.star}
                      fill={isFilled ? "var(--cx-gold)" : "none"}
                      stroke="var(--cx-gold)"
                      strokeWidth="2"
                    >
                      {isHalf ? (
                        <path
                          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                          fill="url(#halfStarMini)"
                        />
                      ) : (
                        <path
                          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        />
                      )}
                    </svg>
                  )
                })}
              </div>
            )}
          </div>
        </Link>
      ))}

      {entries.length > maxItems && (
        <Link href={`/profile/${username}/shelf`} className={styles.more}>
          +{entries.length - maxItems}
        </Link>
      )}

      {/* SVG definitions for half-filled stars */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="halfStarMini">
            <stop offset="50%" stopColor="var(--cx-gold)" />
            <stop offset="50%" stopColor="transparent" stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
