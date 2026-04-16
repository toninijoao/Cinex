'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import StatsCard from '@/components/stats/StatsCard'
import styles from './page.module.css'

export default function StatsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: prof } = await supabase.from('users').select('*').eq('username', username).single()
      setProfile(prof)
      if (!prof) { setLoading(false); return }

      const { data } = await supabase
        .from('shelf_entries')
        .select('status, rating, watched_at, film:films(runtime_minutes, release_year, genres:film_genres(genre:genres(name)))')
        .eq('user_id', prof.id)
        .in('status', ['watched', 'rewatching'])
      setEntries(data ?? [])
      setLoading(false)
    }
    fetchData()
  }, [username])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.statsGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 90, borderRadius: 10 }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return null

  // Computed stats
  const totalMinutes = profile.total_runtime_minutes ?? 0
  const totalDays = Math.floor(totalMinutes / 1440)
  const remainHours = Math.floor((totalMinutes % 1440) / 60)
  const runtimeLabel = totalDays > 0
    ? `${totalDays} dia${totalDays > 1 ? 's' : ''} e ${remainHours}h`
    : `${remainHours}h ${totalMinutes % 60}m`

  const rated = entries.filter(e => e.rating != null)
  const avgRating = rated.length > 0
    ? (rated.reduce((sum, e) => sum + e.rating, 0) / rated.length).toFixed(1)
    : '—'

  // Rating distribution
  const ratingDist: Record<string, number> = {}
  for (let r = 0.5; r <= 5; r += 0.5) {
    ratingDist[r.toFixed(1)] = 0
  }
  rated.forEach(e => {
    const key = (e.rating as number).toFixed(1)
    if (key in ratingDist) ratingDist[key]++
  })
  const maxDist = Math.max(...Object.values(ratingDist), 1)

  // Monthly breakdown (last 12 months)
  const monthlyCount: Record<string, number> = {}
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyCount[key] = 0
  }
  entries.forEach(e => {
    if (!e.watched_at) return
    const key = e.watched_at.slice(0, 7)
    if (key in monthlyCount) monthlyCount[key]++
  })
  const maxMonthly = Math.max(...Object.values(monthlyCount), 1)

  // Decade preference
  const decadeCount: Record<string, number> = {}
  entries.forEach(e => {
    const year = e.film?.release_year
    if (!year) return
    const decade = `${Math.floor(year / 10) * 10}s`
    decadeCount[decade] = (decadeCount[decade] ?? 0) + 1
  })
  const topDecade = Object.entries(decadeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  // Annual goal
  const thisYear = now.getFullYear()
  const watchedThisYear = entries.filter(e => e.watched_at?.startsWith(String(thisYear))).length

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <Link href={`/profile/${username}`} className={styles.back}>
            ← {profile.display_name ?? username}
          </Link>
          <h1 className={styles.title}>Estatísticas</h1>
        </div>

        {/* Summary cards */}
        <div className={styles.statsGrid}>
          <StatsCard
            label="Filmes assistidos"
            value={profile.films_count ?? 0}
            accent="red"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="18" rx="2"/>
                <path d="M7 3v18M17 3v18M2 8h5M14 8h8M2 16h5M14 16h8"/>
              </svg>
            }
          />
          <StatsCard
            label="Tempo total"
            value={runtimeLabel}
            sub={`${totalMinutes.toLocaleString('pt-BR')} minutos`}
            accent="blue"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            }
          />
          <StatsCard
            label="Nota média"
            value={avgRating}
            sub={`de ${rated.length} filme${rated.length !== 1 ? 's' : ''} avaliado${rated.length !== 1 ? 's' : ''}`}
            accent="gold"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--cx-gold)">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            }
          />
          <StatsCard
            label="Década preferida"
            value={topDecade}
            sub="por quantidade de filmes"
            accent="blue"
          />
          <StatsCard
            label={`Em ${thisYear}`}
            value={watchedThisYear}
            sub={profile.annual_goal ? `Meta: ${profile.annual_goal} filmes` : 'Sem meta definida'}
            accent="red"
          />
          <StatsCard
            label="Avaliações"
            value={rated.length}
            sub={`de ${entries.length} filme${entries.length !== 1 ? 's' : ''}`}
            accent="gold"
          />
        </div>

        {/* Annual goal progress */}
        {profile.annual_goal && (
          <div className={styles.goalCard}>
            <div className={styles.goalHeader}>
              <span className={styles.goalLabel}>Meta {thisYear}</span>
              <span className={styles.goalProgress}>
                {watchedThisYear} / {profile.annual_goal}
              </span>
            </div>
            <div className={styles.goalBar}>
              <div
                className={styles.goalFill}
                style={{ width: `${Math.min(100, (watchedThisYear / profile.annual_goal) * 100)}%` }}
              />
            </div>
            <span className={styles.goalPercent}>
              {Math.round((watchedThisYear / profile.annual_goal) * 100)}% concluído
            </span>
          </div>
        )}

        {/* Monthly chart */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Filmes por mês (últimos 12 meses)</h2>
          <div className={styles.chart}>
            {Object.entries(monthlyCount).map(([month, count]) => {
              const label = new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short' })
              return (
                <div key={month} className={styles.bar}>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ height: `${(count / maxMonthly) * 100}%` }}
                      title={`${count} filme${count !== 1 ? 's' : ''}`}
                    />
                  </div>
                  <span className={styles.barLabel}>{label}</span>
                  {count > 0 && <span className={styles.barCount}>{count}</span>}
                </div>
              )
            })}
          </div>
        </section>

        {/* Rating histogram */}
        {rated.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Distribuição de notas</h2>
            <div className={styles.histogram}>
              {Object.entries(ratingDist).map(([rating, count]) => (
                <div key={rating} className={styles.histBar}>
                  <span className={styles.histLabel}>{rating}</span>
                  <div className={styles.histTrack}>
                    <div
                      className={styles.histFill}
                      style={{ width: `${(count / maxDist) * 100}%` }}
                    />
                  </div>
                  <span className={styles.histCount}>{count}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
