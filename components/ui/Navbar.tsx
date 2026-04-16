'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { href: '/', label: 'Início' },
  { href: '/explore', label: 'Explorar' },
  { href: '/activity', label: 'Atividade' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ username?: string; avatar_url?: string; display_name?: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data } = await supabase
          .from('users')
          .select('username, avatar_url, display_name')
          .eq('id', authUser.id)
          .single()
        setUser(data)
      }
    }
    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => fetchUser())
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <nav className={styles.navbar} role="navigation" aria-label="Navegação principal">
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo} aria-label="Cinex - Página inicial">
          <span className={styles.logoC}>C</span>
          <span className={styles.logoI}>I</span>
          <span className={styles.logoNEX}>NEX</span>
        </Link>

        {/* Nav links */}
        <div className={styles.navLinks} role="menubar">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              className={`${styles.navLink} ${pathname === link.href ? styles.navLinkActive : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className={styles.right}>
          {/* Search */}
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={`${styles.searchWrapper} ${searchFocused ? styles.searchFocused : ''}`}>
              <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                id="navbar-search"
                type="search"
                placeholder="Buscar filmes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={styles.searchInput}
                aria-label="Buscar filmes"
              />
            </div>
          </form>

          {/* Auth */}
          {user ? (
            <div className={styles.userMenu} ref={menuRef}>
              <button
                id="navbar-avatar-btn"
                className={styles.avatar}
                onClick={() => setMenuOpen(v => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
                aria-label="Menu do usuário"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.display_name ?? user.username ?? ''} />
                ) : (
                  <span className={styles.avatarFallback}>
                    {(user.display_name ?? user.username ?? 'U')[0].toUpperCase()}
                  </span>
                )}
              </button>

              {menuOpen && (
                <div className={styles.dropdown} role="menu">
                  <Link href={`/profile/${user.username}`} className={styles.dropdownItem} role="menuitem" onClick={() => setMenuOpen(false)}>
                    Meu Perfil
                  </Link>
                  <Link href={`/profile/${user.username}/shelf`} className={styles.dropdownItem} role="menuitem" onClick={() => setMenuOpen(false)}>
                    Minha Estante
                  </Link>
                  <Link href={`/profile/${user.username}/stats`} className={styles.dropdownItem} role="menuitem" onClick={() => setMenuOpen(false)}>
                    Estatísticas
                  </Link>
                  <Link href="/notifications" className={styles.dropdownItem} role="menuitem" onClick={() => setMenuOpen(false)}>
                    Notificações
                  </Link>
                  <Link href="/settings" className={styles.dropdownItem} role="menuitem" onClick={() => setMenuOpen(false)}>
                    Configurações
                  </Link>
                  <hr className={styles.dropdownDivider} />
                  <button className={styles.dropdownItem} role="menuitem" onClick={handleSignOut}>
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authButtons}>
              <Link href="/login" className={styles.btnSecondary} id="navbar-login-btn">Entrar</Link>
              <Link href="/register" className={styles.btnPrimary} id="navbar-register-btn">Cadastrar</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
