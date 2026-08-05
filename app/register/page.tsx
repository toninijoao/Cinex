'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import { MailIcon } from '@/components/ui/Icons'
import styles from '../auth.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [redirectTo, setRedirectTo] = useState('/')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Read search parameters safely on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirectTo')
      if (redirect) {
        setRedirectTo(redirect)
      }
    }
  }, [])

  function slugify(val: string) {
    return val.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_').slice(0, 30)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (username.length < 3) {
      setError('Username deve ter ao menos 3 caracteres.')
      setLoading(false)
      return
    }

    try {
      // Check username uniqueness
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single()

      if (existing) {
        setError('Este username já está em uso.')
        setLoading(false)
        return
      }

      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          data: {
            display_name: displayName,
            username,
          },
        },
      })

      if (signUpErr) {
        setError(signUpErr.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch (ex: any) {
      console.error(ex)
      setError('Ocorreu um erro ao criar a conta.')
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}` },
      })
    } catch (ex: any) {
      console.error(ex)
      setError('Erro ao iniciar cadastro com o Google.')
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}><MailIcon size={52} color="var(--cx-blue)" strokeWidth={1} /></div>
          <h1 className={styles.title}>Confira seu email</h1>
          <p className={styles.subtitle}>
            Enviamos um link de confirmação para <strong>{email}</strong>.
            Clique nele para ativar sua conta.
          </p>
          <Link
            href={`/login${redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
            className={styles.link}
          >
            ← Ir para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.logo}>
          <span style={{ color: 'var(--cx-red)' }}>C</span>
          <span style={{ color: 'var(--cx-blue)' }}>I</span>
          <span>NEX</span>
        </Link>

        <h1 className={styles.title}>Crie sua conta</h1>
        <p className={styles.subtitle}>Comece a registrar seus filmes agora</p>

        <button type="button" onClick={handleGoogleLogin} className={styles.oauthBtn} id="register-google-btn">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Cadastrar com Google
        </button>

        <div className={styles.divider}><span>ou</span></div>

        <form onSubmit={handleRegister} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="reg-name" className={styles.label}>Nome de exibição</label>
            <input
              id="reg-name"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Seu nome"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="reg-username" className={styles.label}>Username</label>
            <div className={styles.inputPrefix}>
              <span className={styles.prefix}>@</span>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={e => setUsername(slugify(e.target.value))}
                placeholder="seu_username"
                className={styles.inputPrefixed}
                required
                minLength={3}
                maxLength={30}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="reg-email" className={styles.label}>Email</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="reg-password" className={styles.label}>Senha</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className={styles.input}
              required
              minLength={8}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} id="register-submit-btn">
            Criar conta
          </Button>
        </form>

        <p className={styles.footer}>
          Já tem conta?{' '}
          <Link
            href={`/login${redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
            className={styles.link}
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
