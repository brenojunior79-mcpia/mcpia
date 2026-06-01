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
  const videosUsed = profile?.credits_videos_used || 0
  const videosLimit = plan?.is_unlimited ? 999 : (plan?.credits_videos || 0)
  const creditPct = plan?.is_unlimited ? 50 : Math.round((videosUsed / videosLimit) * 100)

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', icon: 'ti-sparkles', label: 'Gerar vídeo' },
    { href: '/dashboard/ebook', icon: 'ti-book-2', label: 'Ebook Builder' },
    { href: '/dashboard/metricas', icon: 'ti-chart-bar', label: 'Métricas' },
    { href: '/dashboard/historico', icon: 'ti-history', label: 'Histórico' },
    { href: '/dashboard/planos', icon: 'ti-credit-card', label: 'Planos' },
    { href: '/dashboard/admin', icon: 'ti-shield', label: 'Admin' },
  ]

  const WHATSAPP = '5531999999999'

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>MCP<span>.IA</span></div>
      <nav className={styles.nav}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} className={`${styles.navItem} ${pathname===item.href?styles.active:''}`}>
            <i className={`ti ${item.icon}`}/>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.bottom}>
        <a href={`https://wa.me/${WHATSAPP}?text=Olá, preciso de suporte no MCP.IA`} target="_blank" rel="noreferrer" className={styles.supportBtn}>
          <i className="ti ti-brand-whatsapp"/> Suporte
        </a>

        <div className={styles.userRow}>
          <div className={styles.userAvatar}>{user?.email?.[0].toUpperCase()}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{profile?.full_name || 'Usuário'}</div>
            <div className={styles.userPlan}>{plan?.name || 'Starter'}</div>
          </div>
          <button className={styles.logoutBtn} onClick={logout}><i className="ti ti-logout"/></button>
        </div>

        <div className={styles.creditsBox}>
          <div className={styles.creditsLabel}>Créditos de vídeo</div>
          <div className={styles.creditsCount}>{plan?.is_unlimited ? '∞' : videosUsed} <span>/ {plan?.is_unlimited ? '∞' : videosLimit}</span></div>
          <div className={styles.creditsBar}><div className={styles.creditsFill} style={{ width: `${creditPct}%` }}/></div>
          <Link href="/dashboard/creditos" className={styles.addCreditsBtn}>
            <i className="ti ti-plus"/> Adicionar créditos
          </Link>
        </div>
      </div>
    </aside>
  )
}
