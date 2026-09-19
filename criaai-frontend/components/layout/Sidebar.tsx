'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './Sidebar.module.css'

export default function Sidebar({ profile, user }: { profile: any, user: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const plan = profile?.plans
  const isAdmin = profile?.is_admin
  const videosUsed = profile?.credits_videos_used || 0
  const videosExtra = profile?.credits_videos_extra || 0
  const ebooksUsed = profile?.credits_ebooks_used || 0
  const videosLimit = plan?.is_unlimited ? 999 : ((plan?.credits_videos || 0) + videosExtra)
  const ebooksLimit = plan?.is_unlimited ? 999 : ((plan?.credits_ebooks || 0) + (profile?.credits_ebooks_extra || 0))
  const creditPct = plan?.is_unlimited ? 50 : (videosLimit ? Math.round((videosUsed / videosLimit) * 100) : 0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(function() {
    try {
      const saved = localStorage.getItem('mcpia_theme')
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved)
        document.documentElement.setAttribute('data-theme', saved)
      }
    } catch (e) {}
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem('mcpia_theme', next)
      document.documentElement.setAttribute('data-theme', next)
    } catch (e) {}
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const firstName = (profile?.full_name || '').split(' ')[0] || 'Usuario'
  const videosRestantes = Math.max(0, videosLimit - videosUsed)

  const navItems = [
    { href: '/dashboard', icon: 'ti-home', label: 'Painel do Aluno', locked: false },
    { href: '/dashboard/chat', icon: 'ti-message-circle', label: 'Assistente IA', locked: false },
    { href: '/dashboard/plataformas', icon: 'ti-building-store', label: 'Plataformas', locked: false },
    { href: '/dashboard/produtos', icon: 'ti-flame', label: 'Produtos em Alta', locked: false },
    { href: '/dashboard/ebook', icon: 'ti-book-2', label: 'Gerador de Ebook', locked: false },
    { href: '/dashboard/paginas', icon: 'ti-layout', label: 'Gerador de Site', locked: false },
    { href: '/dashboard/criativo', icon: 'ti-sparkles', label: 'Gerador de Criativos', locked: true, lockStatus: 'Em atualizacao' },
    { href: '/dashboard/vendas', icon: 'ti-rocket', label: 'Vendendo no Automatico', locked: false },
    { href: '/dashboard/metricas', icon: 'ti-chart-bar', label: 'Analisando Metricas', locked: false },
    { href: '/dashboard/suporte', icon: 'ti-headset', label: 'Suporte Humano', locked: false },
    { href: '/dashboard/aulas', icon: 'ti-device-tv', label: 'Aulas ao Vivo', locked: false },
    { href: '/dashboard/planos', icon: 'ti-credit-card', label: 'Planos', locked: false },
    ...(isAdmin ? [{ href: '/dashboard/admin', icon: 'ti-shield', label: 'Admin', locked: false }] : []),
  ]

  return (
    <>
      <button className={styles.mobileToggle} onClick={function() { setMobileOpen(!mobileOpen) }} aria-label="Menu">
        <i className={mobileOpen ? 'ti ti-x' : 'ti ti-menu-2'} />
      </button>

      {mobileOpen && <div className={styles.overlay} onClick={function() { setMobileOpen(false) }} />}

      <aside className={styles.sidebar + (mobileOpen ? ' ' + styles.mobileVisible : '')}>

        {/* Logo */}
        <div className={styles.logo}>
          <img src="/logo.png" alt="Cristao Prospero" className={styles.logoIcon} style={{ width: '100%', maxWidth: 150, height: 'auto', display: 'block', marginBottom: 4, borderRadius: 8 }} />
          <div className={styles.logoTop}>Plataforma do</div>
          <div className={styles.logoBottom}>Cristão Próspero</div>
          <div className={styles.logoUser}>
            <div className={styles.logoUserName}>{firstName}</div>
            <div className={styles.logoUserPlan}>{plan?.name || 'Starter'}</div>
            <div className={styles.logoUserCredits} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span>{plan?.is_unlimited ? '∞' : videosRestantes} Créditos</span>
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                style={{
                  width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--border2)',
                  background: 'var(--surface2)', color: 'var(--muted2)', display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11,
                  flexShrink: 0, padding: 0, lineHeight: 1,
                }}
              >
                <i className={'ti ' + (theme === 'dark' ? 'ti-sun' : 'ti-moon')} />
              </button>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {navItems.map(function(item) {
            if (item.locked) {
              const status = (item as any).lockStatus || 'Em breve'
              return (
                <div key={item.href} className={styles.navItemLocked} title={item.label + ' — ' + status}>
                  <i className={'ti ' + item.icon} />
                  <span>{item.label}</span>
                  <span className={styles.lockBadge}><i className="ti ti-lock" /> {status}</span>
                </div>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={function() { setMobileOpen(false) }}
                className={styles.navItem + (pathname === item.href ? ' ' + styles.active : '')}
              >
                <i className={'ti ' + item.icon} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className={styles.bottom}>
          <div className={styles.userRow}>
            <div className={styles.userAvatar}>{user?.email?.[0].toUpperCase()}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{profile?.full_name || 'Usuario'}</div>
              <div className={styles.userPlan}>{plan?.name || 'Starter'}</div>
              <div className={styles.userCredits}>{plan?.is_unlimited ? '∞' : videosRestantes} Créditos</div>
            </div>
            <button className={styles.logoutBtn} onClick={logout} title="Sair">
              <i className="ti ti-logout" />
            </button>
          </div>
          <div className={styles.creditsBox}>
            <div className={styles.creditsLabel}>Creditos de video</div>
            <div className={styles.creditsCount}>
              {plan?.is_unlimited ? '∞' : videosUsed} <span>/ {plan?.is_unlimited ? '∞' : videosLimit}</span>
            </div>
            <div className={styles.creditsBar}>
              <div className={styles.creditsFill} style={{ width: creditPct + '%' }} />
            </div>
            <Link href="/dashboard/creditos" className={styles.addCreditsBtn}>
              <i className="ti ti-plus" /> Adicionar creditos
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}
