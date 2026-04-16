'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ReviewCard from '@/components/feed/ReviewCard'
import styles from './page.module.css'

export default function ActivityPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchActivity = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)
      if (!authUser) { setLoading(false); return }

      // Get IDs of users I follow
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', authUser.id)

      const followingIds = (follows ?? []).map((f: any) => f.following_id)

      if (followingIds.length === 0) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('shelf_entries')
        .select(`
          id, status, rating, review, watched_at, created_at,
          user:users(username, display_name, avatar_url),
          film:films(tmdb_id, title, release_year, poster_url)
        `)
        .in('user_id', followingIds)
        .eq('is_public', true)
        .not('status', 'eq', 'want_to_watch')
        .order('created_at', { ascending: false })
        .limit(40)

      setEntries(data ?? [])
      setLoading(false)
    }
    fetchActivity()
  }, [])

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>Atividade</h1>
        <p className={styles.sub}>O que as pessoas que você segue estão assistindo</p>

        {loading ? (
          <div className={styles.feed}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`${styles.cardSk} skeleton`} />
            ))}
          </div>
        ) : !user ? (
          <div className="empty-state">
            <p>Faça login para ver a atividade dos seus amigos</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma atividade ainda</p>
            <span>Siga outros usuários para ver o que eles estão assistindo.</span>
          </div>
        ) : (
          <div className={styles.feed}>
            {entries.map(entry => (
              <ReviewCard key={entry.id} entry={entry} showUser />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
