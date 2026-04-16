'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MiniShelf from '@/components/profile/MiniShelf'
import Button from '@/components/ui/Button'
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const [{ data: prof }, { data: { user: authUser } }] = await Promise.all([
        supabase.from('users').select('*').eq('username', username).single(),
        supabase.auth.getUser(),
      ])

      if (!prof) { setLoading(false); return }
      setProfile(prof)
      setCurrentUser(authUser)

      // Recent shelf entries
      const { data: entries } = await supabase
        .from('shelf_entries')
        .select('rating, film:films(tmdb_id, title, poster_url)')
        .eq('user_id', prof.id)
        .eq('status', 'watched')
        .order('watched_at', { ascending: false })
        .limit(10)
      setRecentEntries(entries ?? [])

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

      setLoading(false)
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
                ? <img src={profile.avatar_url} alt={profile.display_name} />
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
    </div>
  )
}
