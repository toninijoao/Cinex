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
    best_actor_tmdb_id?: number | null
    best_actor_name?: string | null
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
  const [bestActorTmdbId, setBestActorTmdbId] = useState<number | null>(existingEntry?.best_actor_tmdb_id ?? null)
  const [bestActorName, setBestActorName] = useState<string | null>(existingEntry?.best_actor_name ?? null)
  const [cast, setCast] = useState<any[]>([])
  const [loadingCast, setLoadingCast] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Reset form when film changes
  useEffect(() => {
    if (existingEntry) {
      setStatus(existingEntry.status)
      setRating(existingEntry.rating ?? 0)
      setReview(existingEntry.review ?? '')
      setBestActorTmdbId(existingEntry.best_actor_tmdb_id ?? null)
      setBestActorName(existingEntry.best_actor_name ?? null)
    } else {
      setStatus('watched')
      setRating(0)
      setReview('')
      setBestActorTmdbId(null)
      setBestActorName(null)
    }
    setError(null)
  }, [film.tmdb_id, existingEntry])

  // Fetch film cast when modal is open
  useEffect(() => {
    if (!isOpen) return
    const fetchCast = async () => {
      setLoadingCast(true)
      try {
        const res = await fetch(`/api/tmdb/film/${film.tmdb_id}`)
        const json = await res.json()
        setCast(json.cast ?? [])
      } catch (err) {
        console.error('Error fetching film cast for best actor selector:', err)
      } finally {
        setLoadingCast(false)
      }
    }
    fetchCast()
  }, [isOpen, film.tmdb_id])

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

    const filmToCache = {
      tmdb_id: film.tmdb_id,
      title: json.film.title,
      original_title: json.film.original_title,
      release_year: json.film.release_year,
      runtime_minutes: json.film.runtime_minutes,
      synopsis: json.film.synopsis,
      poster_url: json.film.poster_url,
      backdrop_url: json.film.backdrop_url,
      trailer_url: json.film.trailer_url,
      tmdb_vote_average: json.film.tmdb_vote_average,
      origin_country: json.film.origin_country,
      synced_at: json.film.synced_at || new Date().toISOString(),
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('films')
      .upsert(filmToCache, { onConflict: 'tmdb_id' })
      .select('id')
      .single()

    if (insertErr || !inserted) {
      console.error('Failed to cache film in DB:', insertErr)
      throw new Error('Could not cache film')
    }
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
        is_public: true,
        watched_at: showDate ? todayString() : null,
        best_actor_tmdb_id: showRating ? bestActorTmdbId : null,
        best_actor_name: showRating ? bestActorName : null,
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

        {/* Elect Best Actor — only for watched/rewatching */}
        {showRating && (
          <div className={styles.field}>
            <label className={styles.label}>
              Melhor Atuação <span className={styles.optional}>(opcional)</span>
            </label>
            {loadingCast ? (
              <p style={{ fontSize: '12px', color: 'var(--cx-text3)' }}>Carregando elenco...</p>
            ) : cast.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--cx-text3)' }}>Elenco não disponível.</p>
            ) : (
              <div className={styles.castCarousel}>
                {cast.map((actor: any) => {
                  const isSelected = bestActorTmdbId === actor.tmdb_id
                  return (
                    <button
                      key={actor.tmdb_id}
                      type="button"
                      className={`${styles.actorCard} ${isSelected ? styles.actorCardActive : ''}`}
                      onClick={() => {
                        if (isSelected) {
                          setBestActorTmdbId(null)
                          setBestActorName(null)
                        } else {
                          setBestActorTmdbId(actor.tmdb_id)
                          setBestActorName(actor.name)
                        }
                      }}
                    >
                      {isSelected && (
                        <div className={styles.selectedBadge} title="Selecionado">
                          🏆
                        </div>
                      )}
                      <div className={styles.actorAvatarWrap}>
                        {actor.profile_url ? (
                          <img
                            src={actor.profile_url}
                            alt={actor.name}
                            className={styles.actorAvatar}
                            loading="lazy"
                          />
                        ) : (
                          <div className={styles.actorAvatarFallback}>👤</div>
                        )}
                      </div>
                      <div className={styles.actorName}>{actor.name}</div>
                      {actor.character && (
                        <div className={styles.actorCharacter} title={actor.character}>
                          {actor.character}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            <p style={{ fontSize: '11px', color: 'var(--cx-text3)', marginTop: '2px' }}>
              O ator ou atriz eleito(a) ganhará +1 Cinex Point! clique para selecionar ou desmarcar.
            </p>
          </div>
        )}

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
