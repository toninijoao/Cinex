'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { CheckIcon } from '@/components/ui/Icons'
import { getHighResAvatarUrl } from '@/lib/avatar'
import styles from './page.module.css'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [profile, setProfile] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [annualGoal, setAnnualGoal] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setDisplayName(data.display_name ?? '')
        setBio(data.bio ?? '')
        setLocation(data.location ?? '')
        setAnnualGoal(data.annual_goal ? String(data.annual_goal) : '')
        setAvatarUrl(data.avatar_url ?? '')
      }
    }
    fetchProfile()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const max_size = 256 // Perfect avatar resolution
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > max_size) {
            height *= max_size / width
            width = max_size
          }
        } else {
          if (height > max_size) {
            width *= max_size / height
            height = max_size
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setAvatarUrl(dataUrl)
        setError(null)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)

    const { error: err } = await supabase
      .from('users')
      .update({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        is_public: true, // Always public
        annual_goal: annualGoal ? parseInt(annualGoal) : null,
      })
      .eq('id', profile.id)

    if (err) {
      console.error(err)
      setError('Erro ao salvar. Tente novamente.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      // Force refresh auth session and navbar if needed
      router.refresh()
    }
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!profile) return null

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>Configurações</h1>

        <div className={styles.layout}>
          {/* Sidebar nav */}
          <nav className={styles.sideNav}>
            <a href="#profile" className={styles.sideLink}>Perfil</a>
            <a href="#goal" className={styles.sideLink}>Meta anual</a>
            <button className={styles.signOut} onClick={handleSignOut} id="settings-signout-btn">
              Sair da conta
            </button>
          </nav>

          {/* Main form */}
          <form onSubmit={handleSave} className={styles.form}>
            {/* Profile section */}
            <section className={styles.section} id="profile">
              <h2 className={styles.sectionTitle}>Perfil público</h2>

              <div className={styles.avatarSection}>
                <div className={styles.avatar}>
                  {avatarUrl
                    ? <img src={getHighResAvatarUrl(avatarUrl) || ''} alt={displayName} />
                    : <span>{(displayName ?? 'U')[0].toUpperCase()}</span>
                  }
                </div>
                <div className={styles.avatarControls}>
                  <p className={styles.avatarLabel}>@{profile.username}</p>
                  <div className={styles.avatarButtons}>
                    <label className={styles.uploadBtn}>
                      <span>Upload de Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {avatarUrl && (
                      <button
                        type="button"
                        className={styles.removeAvatarBtn}
                        onClick={() => setAvatarUrl('')}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <p className={styles.avatarHint}>JPG ou PNG. Tamanho recomendado: 256x256.</p>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="settings-avatar" className={styles.label}>Ou cole o link de uma imagem</label>
                <input
                  id="settings-avatar"
                  type="text"
                  value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  className={styles.input}
                  placeholder={avatarUrl.startsWith('data:') ? '✓ Foto carregada via arquivo local' : 'https://exemplo.com/sua-foto.jpg'}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="settings-name" className={styles.label}>Nome de exibição</label>
                <input
                  id="settings-name"
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className={styles.input}
                  maxLength={50}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="settings-bio" className={styles.label}>Bio</label>
                <textarea
                  id="settings-bio"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className={styles.textarea}
                  placeholder="Fale um pouco sobre você e seu gosto cinematográfico..."
                  rows={3}
                  maxLength={300}
                />
                <span className={styles.charCount}>{bio.length}/300</span>
              </div>

              <div className={styles.field}>
                <label htmlFor="settings-location" className={styles.label}>Localização</label>
                <input
                  id="settings-location"
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className={styles.input}
                  placeholder="Cidade, País"
                  maxLength={50}
                />
              </div>
            </section>

            <hr className="divider" />

            {/* Annual goal section */}
            <section className={styles.section} id="goal">
              <h2 className={styles.sectionTitle}>Meta anual</h2>
              <p className={styles.sectionHint}>Defina quantos filmes quer assistir este ano. A barra de progresso aparecerá no seu perfil.</p>

              <div className={styles.field}>
                <label htmlFor="settings-goal" className={styles.label}>Meta de filmes ({new Date().getFullYear()})</label>
                <div className={styles.goalInput}>
                  <input
                    id="settings-goal"
                    type="number"
                    value={annualGoal}
                    onChange={e => setAnnualGoal(e.target.value)}
                    className={styles.input}
                    placeholder="Ex: 52 (1 por semana)"
                    min={1}
                    max={9999}
                    style={{ maxWidth: 200 }}
                  />
                </div>
              </div>
            </section>

            {/* Save bar */}
            <div className={styles.saveBar}>
              {error && <span className={styles.error}>{error}</span>}
              {saved && <span className={styles.savedMsg}><CheckIcon size={14} color="var(--cx-success)" strokeWidth={2.5} /> Salvo com sucesso!</span>}
              <Button type="submit" variant="primary" size="md" loading={loading} id="settings-save-btn">
                Salvar alterações
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
