'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import StarRating from './StarRating'
import PosterImage from './PosterImage'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircleIcon,
  EyeIcon,
  BookmarkIcon,
  RefreshIcon,
  XCircleIcon,
} from '@/components/ui/Icons'
import styles from './ShelfModal.module.css'

export type ShelfStatus = 'watched' | 'watching' | 'want_to_watch' | 'dropped' | 'rewatching'

interface ShelfModalProps {
  isOpen: boolean
  onClose: () => void
  film: {
    id?: string          // Supabase UUID (if already cached)
    tmdb_id: number
    title: string
    poster_url?: string | null
    runtime_minutes?: number | null
    release_year?: number | null
  }
  existingEntry?: {
    id: string
    status: ShelfStatus
    rating: number | null
    review: string | null
    is_public: boolean
    watched_at: string | null
  } | null
  onSaved?: () => void
}

const STATUS_OPTIONS: { value: ShelfStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'watched',       label: 'Assistido',      icon: <CheckCircleIcon size={15} /> },
  { value: 'watching',      label: 'Assistindo',     icon: <EyeIcon size={15} /> },
  { value: 'want_to_watch', label: 'Quero assistir', icon: <BookmarkIcon size={15} /> },
  { value: 'rewatching',    label: 'Reassistindo',   icon: <RefreshIcon size={15} /> },
  { value: 'dropped',       label: 'Abandonei',      icon: <XCircleIcon size={15} /> },
]

function todayString() {
  return new Date().toISOString().split('T')[0]
}

export default function ShelfModal({
  isOpen,
  onClose,
  film,
  existingEntry,
  onSaved,
}: ShelfModalProps) {
  const supabase = createClient()

  const [status, setStatus]     = useState<ShelfStatus>(existingEntry?.status ?? 'watched')
  const [rating, setRating]     = useState<number>(existingEntry?.rating ?? 0)
  const [review, setReview]     = useState(existingEntry?.review ?? '')
  const [isPublic, setIsPublic] = useState(existingEntry?.is_public ?? true)
  const [watchedAt, setWatchedAt] = useState(existingEntry?.watched_at?.slice(0, 10) ?? todayString())
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Reset form when film changes
  useEffect(() => {
    if (existingEntry) {
      setStatus(existingEntry.status)
      setRating(existingEntry.rating ?? 0)
      setReview(existingEntry.review ?? '')
      setIsPublic(existingEntry.is_public)
      setWatchedAt(existingEntry.watched_at?.slice(0, 10) ?? todayString())
    } else {
      setStatus('watched')
      setRating(0)
      setReview('')
      setIsPublic(true)
      setWatchedAt(todayString())
    }
    setError(null)
  }, [film.tmdb_id, existingEntry])

  const showRating  = status === 'watched' || status === 'rewatching'
  const showDate    = status === 'watched' || status === 'rewatching'

  async function ensureFilmCached(): Promise<string> {
    // Check if film is already in Supabase
    if (film.id) return film.id

    const { data: existing } = await supabase
      .from('films')
      .select('id')
      .eq('tmdb_id', film.tmdb_id)
      .single()

    if (existing?.id) return existing.id

    // Fetch full details and cache
    const res = await fetch(`/api/tmdb/film/${film.tmdb_id}`)
    const json = await res.json()

    const { data: inserted, error: insertErr } = await supabase
      .from('films')
      .upsert({ ...json.film, tmdb_id: film.tmdb_id }, { onConflict: 'tmdb_id' })
      .select('id')
      .single()

    if (insertErr || !inserted) throw new Error('Could not cache film')
    return inserted.id
  }

  async function handleSave() {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Você precisa estar logado.')

      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()
      if (!profile) throw new Error('Perfil não encontrado.')

      const filmId = await ensureFilmCached()

      const entry = {
        user_id: user.id,
        film_id: filmId,
        status,
        rating: showRating && rating > 0 ? rating : null,
        review: review.trim() || null,
        is_public: isPublic,
        watched_at: showDate ? watchedAt : null,
      }

      const { error: upsertErr } = await supabase
        .from('shelf_entries')
        .upsert(entry, { onConflict: 'user_id,film_id' })

      if (upsertErr) throw upsertErr

      onSaved?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!existingEntry) return
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { data: filmRow } = await supabase
        .from('films')
        .select('id')
        .eq('tmdb_id', film.tmdb_id)
        .single()

      if (filmRow) {
        await supabase
          .from('shelf_entries')
          .delete()
          .eq('user_id', user.id)
          .eq('film_id', filmRow.id)
      }

      onSaved?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao remover.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className={styles.container}>
        {/* Film preview header */}
        <div className={styles.filmHeader}>
          <div className={styles.posterThumb}>
            <PosterImage src={film.poster_url} alt={film.title} />
          </div>
          <div className={styles.filmMeta}>
            <h3 className={styles.filmTitle}>{film.title}</h3>
            {film.release_year && <span className={styles.filmYear}>{film.release_year}</span>}
            {film.runtime_minutes && (
              <span className={styles.filmRuntime}>{film.runtime_minutes} min</span>
            )}
          </div>
        </div>

        {/* Status pills */}
        <div className={styles.field}>
          <label className={styles.label}>Status</label>
          <div className={styles.statusGrid} role="group" aria-label="Status na estante">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                id={`shelf-status-${opt.value}`}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`${styles.statusPill} ${status === opt.value ? styles.statusActive : ''}`}
                aria-pressed={status === opt.value}
              >
                <span className={styles.statusIcon}>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Star rating — only for watched/rewatching */}
        {showRating && (
          <div className={styles.field}>
            <label className={styles.label}>Nota</label>
            <div className={styles.starRow}>
              <StarRating value={rating} onChange={setRating} size="lg" />
              {rating === 0 && (
                <span className={styles.ratingHint}>Clique para avaliar</span>
              )}
            </div>
          </div>
        )}

        {/* Review textarea */}
        <div className={styles.field}>
          <label htmlFor="shelf-review" className={styles.label}>
            Review <span className={styles.optional}>(opcional)</span>
          </label>
          <textarea
            id="shelf-review"
            className={styles.textarea}
            placeholder="O que você achou do filme?"
            value={review}
            onChange={e => setReview(e.target.value)}
            rows={4}
            maxLength={2000}
          />
          <span className={styles.charCount}>{review.length}/2000</span>
        </div>

        {/* Date watched */}
        {showDate && (
          <div className={styles.field}>
            <label htmlFor="shelf-date" className={styles.label}>Data assistido</label>
            <input
              id="shelf-date"
              type="date"
              className={styles.dateInput}
              value={watchedAt}
              onChange={e => setWatchedAt(e.target.value)}
              max={todayString()}
            />
          </div>
        )}

        {/* Privacy toggle */}
        <div className={styles.row}>
          <span className={styles.label}>Visibilidade</span>
          <div className={styles.toggle}>
            <button
              type="button"
              id="shelf-privacy-toggle"
              onClick={() => setIsPublic(v => !v)}
              className={`${styles.toggleBtn} ${isPublic ? styles.togglePublic : styles.togglePrivate}`}
              aria-pressed={isPublic}
            >
              {isPublic ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Público
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                  Privado
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && <p className={styles.error}>{error}</p>}

        {/* Actions */}
        <div className={styles.actions}>
          {existingEntry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={loading}
              id="shelf-delete-btn"
              className={styles.deleteBtn}
            >
              Remover da estante
            </Button>
          )}
          <div className={styles.actionRight}>
            <Button variant="secondary" size="md" onClick={onClose} disabled={loading} id="shelf-cancel-btn">
              Cancelar
            </Button>
            <Button variant="primary" size="md" onClick={handleSave} loading={loading} id="shelf-save-btn">
              {existingEntry ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
