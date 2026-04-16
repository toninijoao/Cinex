'use client'

import { useState } from 'react'
import styles from './StarRating.module.css'

interface StarRatingProps {
  value: number        // 0-5, steps of 0.5
  onChange?: (v: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const display = hovered ?? value
  const interactive = !readonly && !!onChange

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
    if (!interactive) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    setHovered(x < rect.width / 2 ? starIndex - 0.5 : starIndex)
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
    if (!interactive) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newVal = x < rect.width / 2 ? starIndex - 0.5 : starIndex
    onChange?.(newVal === value ? 0 : newVal) // deselect if same
  }

  return (
    <div
      className={`${styles.stars} ${styles[size]}`}
      role={interactive ? 'group' : undefined}
      aria-label={interactive ? 'Avaliação' : `Nota: ${value} de 5`}
      onMouseLeave={() => interactive && setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map(i => {
        const filled = display >= i
        const half   = !filled && display >= i - 0.5

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            aria-label={`${i} estrela${i > 1 ? 's' : ''}`}
            className={`${styles.star} ${interactive ? styles.interactive : ''}`}
            onMouseMove={e => handleMouseMove(e, i)}
            onClick={e => handleClick(e, i)}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Full fill */}
              {filled && (
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill="var(--cx-gold)"
                />
              )}
              {/* Half fill */}
              {half && (
                <>
                  <defs>
                    <clipPath id={`half-${i}`}>
                      <rect x="0" y="0" width="12" height="24" />
                    </clipPath>
                  </defs>
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill="var(--cx-surface2)"
                  />
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill="var(--cx-gold)"
                    clipPath={`url(#half-${i})`}
                  />
                </>
              )}
              {/* Empty */}
              {!filled && !half && (
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill="var(--cx-surface3)"
                  stroke="var(--cx-border2)"
                  strokeWidth="1"
                />
              )}
            </svg>
          </button>
        )
      })}
      {display > 0 && (
        <span className={styles.value} aria-hidden="true">{display.toFixed(1)}</span>
      )}
    </div>
  )
}
