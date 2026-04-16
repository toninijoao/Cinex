'use client'

import { useState } from 'react'
import styles from './PosterImage.module.css'

interface PosterImageProps {
  src?: string | null
  alt: string
  className?: string
  priority?: boolean
}

const GRADIENT_FALLBACKS = [
  'linear-gradient(135deg, #1a1a28, #20202f)',
  'linear-gradient(135deg, #1e1228, #0d1420)',
  'linear-gradient(135deg, #12201a, #1a1228)',
]

export default function PosterImage({ src, alt, className = '' }: PosterImageProps) {
  const [errored, setErrored] = useState(false)
  const fallback = GRADIENT_FALLBACKS[Math.abs(alt.charCodeAt(0) ?? 0) % GRADIENT_FALLBACKS.length]
  const initials = alt.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  if (!src || errored) {
    return (
      <div
        className={`${styles.fallback} ${className}`}
        style={{ background: fallback }}
        aria-label={alt}
        role="img"
      >
        <span className={styles.initials}>{initials}</span>
        <svg className={styles.filmIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="3" width="20" height="18" rx="2"/>
          <path d="M7 3v18M17 3v18M2 8h5M14 8h8M2 16h5M14 16h8"/>
        </svg>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`${styles.img} ${className}`}
      onError={() => setErrored(true)}
      loading="lazy"
    />
  )
}
