'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MiniShelf from '@/components/profile/MiniShelf'
import Button from '@/components/ui/Button'
import { getHighResAvatarUrl } from '@/lib/avatar'
import FavoriteSelectorModal from '@/components/profile/FavoriteSelectorModal'
import ShelfModal from '@/components/film/ShelfModal'
import styles from './page.module.css'

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [recentEntries, setRecentEntries] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('shelf')

  // Favorites States
  const [favoriteFilms, setFavoriteFilms] = useState<any[]>([])
  const [favoriteActors, setFavoriteActors] = useState<any[]>([])
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [selectorType, setSelectorType] = useState<'film' | 'actor'>('film')
  const [selectorPosition, setSelectorPosition] = useState<number>(1)
  const [shelfModalFilm, setShelfModalFilm] = useState<any | null>(null)
  const [pendingFavoriteFilm, setPendingFavoriteFilm] = useState<{ film: any; position: number } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [{ data: prof }, { data: { user: authUser } }] = await Promise.all([
          supabase.from('users').select('*').eq('username', username).single(),
          supabase.auth.getUser(),
        ])

        if (!prof) { return }
        setProfile(prof)
        setCurrentUser(authUser)

        // Recent shelf entries
        const { data: entries } = await supabase
          .from('shelf_entries')
          .select('rating, best_actor_tmdb_id, best_actor_name, best_actor_profile_path, film:films(tmdb_id, title, poster_url)')
          .eq('user_id', prof.id)
          .eq('status', 'watched')
          .order('watched_at', { ascending: false })
          .limit(10)
        setRecentEntries(entries ?? [])

        // Fetch favorite films
        const { data: favFilms } = await supabase
          .from('user_favorite_films')
          .select('position, film_id, film:films(tmdb_id, title, poster_url)')
          .eq('user_id', prof.id)
          .order('position', { ascending: true })

        const filmIds = favFilms?.map(f => f.film_id) ?? []
        let ratingsMap: Record<string, number | null> = {}
        if (filmIds.length > 0) {
          const { data: ratingsData } = await supabase
            .from('shelf_entries')
            .select('film_id, rating')
            .eq('user_id', prof.id)
            .in('film_id', filmIds)

          ratingsData?.forEach(r => {
            ratingsMap[r.film_id] = r.rating
          })
        }

        const mappedFavFilms = (favFilms ?? []).map((fav: any) => ({
          ...fav,
          rating: ratingsMap[fav.film_id] ?? null
        }))
        setFavoriteFilms(mappedFavFilms)

        // Fetch favorite actors
        const { data: favActors } = await supabase
          .from('user_favorite_actors')
          .select('*')
          .eq('user_id', prof.id)
          .order('position', { ascending: true })
        setFavoriteActors(favActors ?? [])

        // Follow counts
        const [{ count: followers }, { count: following }] = await Promise.all([
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', prof.id),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', prof.id),
        ])
        setFollowersCount(followers ?? 0)
        setFollowingCount(following ?? 0)

        if (authUser) {
          const { data: followRow } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('follower_id', authUser.id)
            .eq('following_id', prof.id)
            .single()
          setIsFollowing(!!followRow)
        }
      } catch (err) {
        console.error('Error fetching profile data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [username])

  async function handleFollow() {
    if (!currentUser) { router.push('/login'); return }
    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id)
      setIsFollowing(false)
      setFollowersCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({
        follower_id: currentUser.id,
        following_id: profile.id,
      })
      setIsFollowing(true)
      setFollowersCount(c => c + 1)
    }
  }

  function runtimeDisplay(mins: number) {
    const days = Math.floor(mins / 1440)
    const hrs = Math.floor((mins % 1440) / 60)
    if (days > 0) return `${days}d ${hrs}h`
    return `${hrs}h`
  }

  const isOwnProfile = currentUser?.id === profile?.id
  const backdropFilm = recentEntries[0]?.film

  function handleOpenSelector(type: 'film' | 'actor', position: number) {
    setSelectorType(type)
    setSelectorPosition(position)
    setSelectorOpen(true)
  }

  async function ensureFilmCached(item: any): Promise<string> {
    const { data: existing } = await supabase
      .from('films')
      .select('id')
      .eq('tmdb_id', item.tmdb_id)
      .single()

    if (existing) return existing.id

    // Fetch full details from TMDB film API to cache it correctly
    const res = await fetch(`/api/tmdb/film/${item.tmdb_id}`)
    const json = await res.json()
    const filmToCache = {
      tmdb_id: json.film.tmdb_id,
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
      synced_at: new Date().toISOString(),
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('films')
      .upsert(filmToCache, { onConflict: 'tmdb_id' })
      .select('id')
      .single()

    if (insertErr || !inserted) {
      console.error('Failed to cache film:', insertErr)
      throw new Error('Could not cache film')
    }
    return inserted.id
  }

  async function handleSelectFavorite(item: any) {
    if (!currentUser) return

    try {
      if (selectorType === 'film') {
        const filmId = await ensureFilmCached(item)

        // Check if the user has watched/reviewed this film
        const { data: existingReview, error: checkErr } = await supabase
          .from('shelf_entries')
          .select('id, status')
          .eq('user_id', currentUser.id)
          .eq('film_id', filmId)
          .neq('status', 'want_to_watch')
          .maybeSingle()

        if (checkErr) {
          console.error('Error checking film status:', checkErr)
        }

        if (!existingReview) {
          // User has not evaluated the film yet! Open review modal first.
          setPendingFavoriteFilm({
            film: {
              id: filmId,
              tmdb_id: item.tmdb_id,
              title: item.title,
              poster_url: item.poster_url,
            },
            position: selectorPosition
          })
          setShelfModalFilm({
            id: filmId,
            tmdb_id: item.tmdb_id,
            title: item.title,
            poster_url: item.poster_url,
          })
          return
        }

        const { error: upsertErr } = await supabase
          .from('user_favorite_films')
          .upsert({
            user_id: currentUser.id,
            film_id: filmId,
            position: selectorPosition,
          }, { onConflict: 'user_id,position' })

        if (upsertErr) throw upsertErr

        // Refresh favorite films list
        const { data: updatedFavs } = await supabase
          .from('user_favorite_films')
          .select('position, film_id, film:films(tmdb_id, title, poster_url)')
          .eq('user_id', profile.id)
          .order('position', { ascending: true })

        const filmIds = updatedFavs?.map(f => f.film_id) ?? []
        let ratingsMap: Record<string, number | null> = {}
        if (filmIds.length > 0) {
          const { data: ratingsData } = await supabase
            .from('shelf_entries')
            .select('film_id, rating')
            .eq('user_id', profile.id)
            .in('film_id', filmIds)

          ratingsData?.forEach(r => {
            ratingsMap[r.film_id] = r.rating
          })
        }

        const mapped = (updatedFavs ?? []).map((fav: any) => ({
          ...fav,
          rating: ratingsMap[fav.film_id] ?? null
        }))

        setFavoriteFilms(mapped)
      } else {
        const { error: upsertErr } = await supabase
          .from('user_favorite_actors')
          .upsert({
            user_id: currentUser.id,
            actor_tmdb_id: item.tmdb_id,
            actor_name: item.name,
            actor_profile_path: item.profile_path,
            position: selectorPosition,
          }, { onConflict: 'user_id,position' })

        if (upsertErr) throw upsertErr

        // Refresh favorite actors list
        const { data: updatedActors } = await supabase
          .from('user_favorite_actors')
          .select('*')
          .eq('user_id', profile.id)
          .order('position', { ascending: true })

        setFavoriteActors(updatedActors ?? [])
      }
    } catch (err: any) {
      console.error('Error saving favorite:', err)
      alert('Erro ao salvar favorito: ' + (err.message || err))
    }
  }

  function handleShelfModalClose() {
    setShelfModalFilm(null)
    setPendingFavoriteFilm(null)
  }

  async function handleShelfModalSaved() {
    setShelfModalFilm(null)

    if (pendingFavoriteFilm && currentUser) {
      const { film, position } = pendingFavoriteFilm
      try {
        const { error: upsertErr } = await supabase
          .from('user_favorite_films')
          .upsert({
            user_id: currentUser.id,
            film_id: film.id,
            position: position,
          }, { onConflict: 'user_id,position' })

        if (upsertErr) throw upsertErr

        // Refresh favorite films list
        const { data: updatedFavs } = await supabase
          .from('user_favorite_films')
          .select('position, film_id, film:films(tmdb_id, title, poster_url)')
          .eq('user_id', profile.id)
          .order('position', { ascending: true })

        const filmIds = updatedFavs?.map(f => f.film_id) ?? []
        let ratingsMap: Record<string, number | null> = {}
        if (filmIds.length > 0) {
          const { data: ratingsData } = await supabase
            .from('shelf_entries')
            .select('film_id, rating')
            .eq('user_id', profile.id)
            .in('film_id', filmIds)

          ratingsData?.forEach(r => {
            ratingsMap[r.film_id] = r.rating
          })
        }

        const mapped = (updatedFavs ?? []).map((fav: any) => ({
          ...fav,
          rating: ratingsMap[fav.film_id] ?? null
        }))

        setFavoriteFilms(mapped)
      } catch (err: any) {
        console.error('Error saving favorite after shelf save:', err)
        alert('Erro ao salvar favorito após avaliação: ' + (err.message || err))
      } finally {
        setPendingFavoriteFilm(null)
      }
    }
  }

  async function handleRemoveFilm(position: number) {
    if (!currentUser) return
    const { error } = await supabase
      .from('user_favorite_films')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('position', position)

    if (error) {
      alert('Erro ao remover favorito: ' + error.message)
      return
    }

    setFavoriteFilms(prev => prev.filter(f => f.position !== position))
  }

  async function handleRemoveActor(position: number) {
    if (!currentUser) return
    const { error } = await supabase
      .from('user_favorite_actors')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('position', position)

    if (error) {
      alert('Erro ao remover do pódio: ' + error.message)
      return
    }

    setFavoriteActors(prev => prev.filter(a => a.position !== position))
  }

  if (loading) {
    return (
      <div>
        <div className={`${styles.backdropSk} skeleton`} />
        <div className="container">
          <div className={styles.headerSk}>
            <div className={`${styles.avatarSk} skeleton`} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="skeleton" style={{ height: 20, width: 160, borderRadius: 6 }} />
              <div className="skeleton" style={{ height: 14, width: 240, borderRadius: 6 }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container">
        <div className="empty-state" style={{ marginTop: 80 }}>
          <p>Usuário não encontrado</p>
          <Link href="/">← Voltar ao início</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Backdrop */}
      <div className={styles.backdrop}>
        {backdropFilm?.poster_url && (
          <img src={backdropFilm.poster_url} alt="" className={styles.backdropImg} />
        )}
        <div className={styles.backdropOverlay} />
      </div>

      <div className="container">
        {/* Profile header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>
              {profile.avatar_url
                ? <img src={getHighResAvatarUrl(profile.avatar_url) || ''} alt={profile.display_name} />
                : <span>{(profile.display_name ?? profile.username ?? 'U')[0].toUpperCase()}</span>
              }
            </div>
          </div>

          <div className={styles.profileInfo}>
            <div className={styles.nameRow}>
              <h1 className={styles.displayName}>{profile.display_name}</h1>
              <span className={styles.username}>@{profile.username}</span>
            </div>

            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

            {profile.location && (
              <div className={styles.location}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {profile.location}
              </div>
            )}

            {/* Stats row */}
            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statNum} style={{ color: 'var(--cx-red)' }}>
                  {profile.films_count ?? 0}
                </span>
                <span className={styles.statLabel}>Filmes</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statNum} style={{ color: 'var(--cx-blue)' }}>
                  {runtimeDisplay(profile.total_runtime_minutes ?? 0)}
                </span>
                <span className={styles.statLabel}>Assistidos</span>
              </div>
              <div className={styles.statDivider} />
              <Link href={`/profile/${username}/stats`} className={`${styles.stat} ${styles.statLink}`}>
                <span className={styles.statNum}>{followersCount}</span>
                <span className={styles.statLabel}>Seguidores</span>
              </Link>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statNum}>{followingCount}</span>
                <span className={styles.statLabel}>Seguindo</span>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              {isOwnProfile ? (
                <Button variant="secondary" size="md" onClick={() => router.push('/settings')} id="profile-edit-btn">
                  Editar perfil
                </Button>
              ) : (
                <Button
                  variant={isFollowing ? 'secondary' : 'primary'}
                  size="md"
                  onClick={handleFollow}
                  id="profile-follow-btn"
                >
                  {isFollowing ? 'Seguindo' : 'Seguir'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* FAVORITES SECTION */}
        <div className={styles.favoritesSection}>
          {/* Favorite Films Grid */}
          <div className={styles.favoriteFilmsCard}>
            <h3 className={styles.sectionHeading}>Filmes Favoritos</h3>
            <div className={styles.favoriteFilmsGrid}>
              {Array.from({ length: 4 }).map((_, index) => {
                const pos = index + 1
                const fav = favoriteFilms.find(f => f.position === pos)
                return (
                  <div key={pos} className={styles.filmSlot}>
                    {fav ? (
                      <div className={styles.filmSlotFilled}>
                        <div className={styles.favPosterContainer}>
                          <img src={fav.film.poster_url} alt={fav.film.title} className={styles.favPoster} />
                          {isOwnProfile && (
                            <button
                              type="button"
                              className={styles.removeFavBtn}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleRemoveFilm(pos)
                              }}
                              title="Remover dos favoritos"
                            >
                              ×
                            </button>
                          )}
                          <Link href={`/film/${fav.film.tmdb_id}`} className={styles.favLinkOverlay} />
                        </div>
                        <div className={styles.favMeta}>
                          <div className={styles.favTitle}>{fav.film.title}</div>
                          {fav.rating != null && (
                            <div className={styles.favRatingRow}>
                              {Array.from({ length: 5 }).map((_, i) => {
                                const starValue = i + 1
                                const isFilled = fav.rating >= starValue
                                const isHalf = !isFilled && fav.rating >= starValue - 0.5

                                return (
                                  <svg
                                    key={i}
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    className={styles.favStar}
                                    fill={isFilled ? "var(--cx-gold)" : "none"}
                                    stroke="var(--cx-gold)"
                                    strokeWidth="2.5"
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
                      </div>
                    ) : (
                      <div
                        className={`${styles.filmSlotEmpty} ${isOwnProfile ? styles.editableSlot : ''}`}
                        onClick={() => isOwnProfile && handleOpenSelector('film', pos)}
                        title={isOwnProfile ? 'Adicionar filme favorito' : ''}
                      >
                        {isOwnProfile ? '+' : ''}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Favorite Actors Podium */}
          <div className={styles.favoriteActorsCard}>
            <h3 className={styles.sectionHeading}>Atores Favoritos</h3>
            <div className={styles.podiumContainer}>
              {[
                { label: '2º', position: 2, className: styles.stepSecond },
                { label: '1º', position: 1, className: styles.stepFirst },
                { label: '3º', position: 3, className: styles.stepThird }
              ].map(({ label, position, className }) => {
                const actor = favoriteActors.find(a => a.position === position)
                return (
                  <div key={position} className={`${styles.podiumColumn} ${className}`}>
                    <div className={styles.podiumUser}>
                      {actor ? (
                        <div className={styles.podiumActorCard}>
                          <div className={styles.podiumAvatarWrap}>
                            {actor.actor_profile_path ? (
                              <img src={actor.actor_profile_path} alt={actor.actor_name} className={styles.podiumAvatar} />
                            ) : (
                              <div className={styles.podiumAvatarFallback}>👤</div>
                            )}
                            {isOwnProfile && (
                              <button
                                type="button"
                                className={styles.removeActorBtn}
                                onClick={() => handleRemoveActor(position)}
                                title="Remover do pódio"
                              >
                                ×
                              </button>
                            )}
                          </div>
                          <Link href={`/actor/${actor.actor_tmdb_id}`} className={styles.podiumActorName}>
                            {actor.actor_name}
                          </Link>
                        </div>
                      ) : (
                        <div
                          className={`${styles.podiumAvatarEmpty} ${isOwnProfile ? styles.editableSlot : ''}`}
                          onClick={() => isOwnProfile && handleOpenSelector('actor', position)}
                          title={isOwnProfile ? 'Adicionar ator ao pódio' : ''}
                        >
                          {isOwnProfile ? '+' : ''}
                        </div>
                      )}
                    </div>
                    <div className={styles.podiumStep}>
                      <span className={styles.podiumLabel}>{label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { id: 'shelf', label: 'Estante' },
            { id: 'stats', label: 'Estatísticas' },
          ].map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                if (tab.id === 'stats') router.push(`/profile/${username}/stats`)
                else setActiveTab(tab.id)
              }}
              id={`profile-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Shelf preview */}
        <div className={styles.shelfPreview}>
          <div className={styles.shelfHeader}>
            <h2 className={styles.shelfTitle}>Últimos filmes assistidos</h2>
            <Link href={`/profile/${username}/shelf`} className={styles.seeAll} id="profile-see-shelf-btn">
              Ver estante completa →
            </Link>
          </div>
          <MiniShelf entries={recentEntries} username={username} maxItems={10} />
        </div>
      </div>

      <FavoriteSelectorModal
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        type={selectorType}
        onSelect={handleSelectFavorite}
      />

      {shelfModalFilm && (
        <ShelfModal
          isOpen={!!shelfModalFilm}
          onClose={handleShelfModalClose}
          film={shelfModalFilm}
          onSaved={handleShelfModalSaved}
        />
      )}

      {/* SVG definitions for half-filled stars in favorites */}
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
