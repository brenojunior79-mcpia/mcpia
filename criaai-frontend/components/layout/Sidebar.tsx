'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  const videosLimit = plan?.is_unlimited ? 999 : ((plan?.credits_videos || 0) + videosExtra)
  const creditPct = plan?.is_unlimited ? 50 : (videosLimit ? Math.round((videosUsed / videosLimit) * 100) : 0)

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const WHATSAPP = '5537999521440'

  const navItems = [
    { href: '/dashboard', icon: 'ti-home', label: 'Inicio', locked: false },
    { href: '/dashboard/chat', icon: 'ti-message-circle', label: 'Assistente IA', locked: false },
    { href: '/dashboard/produtos', icon: 'ti-flame', label: 'Produtos em Alta', locked: true },
    { href: '/dashboard/ebook', icon: 'ti-book-2', label: 'Gerador de Ebook', locked: false },
    { href: '/dashboard/paginas', icon: 'ti-layout', label: 'Gerador de Site', locked: false },
    { href: '/dashboard/criativo', icon: 'ti-sparkles', label: 'Gerador de Criativos', locked: false },
    { href: '/dashboard/vendas', icon: 'ti-rocket', label: 'Vendendo no Automatico', locked: true },
    { href: '/dashboard/metricas', icon: 'ti-chart-bar', label: 'Analisando Metricas', locked: false },
    { href: '/dashboard/suporte', icon: 'ti-headset', label: 'Suporte Humano', locked: false },
    { href: '/dashboard/aulas', icon: 'ti-device-tv', label: 'Aulas ao Vivo', locked: false },
    { href: '/dashboard/planos', icon: 'ti-credit-card', label: 'Planos', locked: false },
    ...(isAdmin ? [{ href: '/dashboard/admin', icon: 'ti-shield', label: 'Admin', locked: false }] : []),
  ]

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>MCP<span>.IA</span></div>

      <nav className={styles.nav}>
        {navItems.map(function(item) {
          if (item.locked) {
            return (
              <div
                key={item.href}
                className={styles.navItemLocked}
                title="Em breve"
              >
                <i className={'ti ' + item.icon} />
                <span>{item.label}</span>
                <span className={styles.lockBadge}>
                  <i className="ti ti-lock" /> Em breve
                </span>
              </div>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={styles.navItem + (pathname === item.href ? ' ' + styles.active : '')}
            >
              <i className={'ti ' + item.icon} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.userRow}>
          <div className={styles.userAvatar}>{user?.email?.[0].toUpperCase()}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{profile?.full_name || 'Usuario'}</div>
            <div className={styles.userPlan}>{plan?.name || 'Starter'}</div>
          </div>
          <button className={styles.logoutBtn} onClick={logout}>
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
  )
}
