'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { podeUsarAnuncios } from '@/lib/acessoAnuncios'
import FotoPerfilModal from './FotoPerfilModal'
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
  // Menu "Notificacoes" (agrupa os envios). Abre/fecha com a setinha.
  const NOTIF_ITENS = [
    { href: '/dashboard/admin/notificacoes', icon: 'ti-bell-ringing', label: 'Envio de notificação' },
    { href: '/dashboard/admin/emails', icon: 'ti-mail', label: 'Envio de e-mail' },
    { href: '/dashboard/admin/sms', icon: 'ti-message', label: 'Envio de SMS' },
  ]
  const noGrupoNotif = NOTIF_ITENS.some(function(i) { return pathname === i.href || (pathname || '').indexOf(i.href + '/') === 0 })
  const [notifAberto, setNotifAberto] = useState(false)
  useEffect(function() { if (noGrupoNotif) setNotifAberto(true) }, [noGrupoNotif])
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  // Bolinha de notificacao do menu "Indique e ganhe": some depois da primeira visita
  const [indiqueSeen, setIndiqueSeen] = useState(true)

  useEffect(function() {
    try {
      setIndiqueSeen(localStorage.getItem('mcpia_indique_seen') === '1')
    } catch (e) {}
  }, [])

  useEffect(function() {
    if (pathname === '/dashboard/indique') {
      setIndiqueSeen(true)
      try { localStorage.setItem('mcpia_indique_seen', '1') } catch (e) {}
    }
  }, [pathname])

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

  // Foto de perfil: o aluno toca no circulo, escolhe uma imagem e ela e reduzida (256x256) antes de enviar
  const [fotoUrl, setFotoUrl] = useState<string>(profile?.avatar_url || '')
  const [fotoBusy, setFotoBusy] = useState(false)
  const [fotoErro, setFotoErro] = useState('')
  const fotoInput = useRef<HTMLInputElement>(null)

  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null)

  function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    setFotoErro('')
    if (!file.type.startsWith('image/')) { setFotoErro('Escolha uma imagem.'); return }
    setFotoArquivo(file)
  }

  async function salvarFoto(blob: Blob) {
    if (!user?.id) return
    setFotoBusy(true); setFotoErro('')
    try {
      const caminho = user.id + '/foto.jpg'
      const up = await supabase.storage.from('avatars').upload(caminho, blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      const pub = supabase.storage.from('avatars').getPublicUrl(caminho).data.publicUrl + '?v=' + Date.now()
      const upd = await supabase.from('profiles').update({ avatar_url: pub }).eq('id', user.id)
      if (upd.error) throw upd.error
      setFotoUrl(pub)
      setFotoArquivo(null)
      try { window.dispatchEvent(new CustomEvent('mcpia-foto-atualizada', { detail: pub })) } catch (e) {}
    } catch (err: any) {
      console.error('[foto de perfil]', err)
      setFotoErro('Não consegui salvar a foto. Tente de novo.')
      setFotoArquivo(null)
    }
    setFotoBusy(false)
  }

  // O botao da foto na barra de cima abre o mesmo seletor
  useEffect(function() {
    function abrir() { if (fotoInput.current) fotoInput.current.click() }
    window.addEventListener('mcpia-trocar-foto', abrir)
    return function() { window.removeEventListener('mcpia-trocar-foto', abrir) }
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Nos primeiros 7 dias depois do cadastro: Site fica "Em atualizacao" e Planos fica oculto (admin sempre ve)
  const HIDDEN_DAYS = 7
  const HIDDEN_NEW_USER = ['/dashboard/planos']
  const createdAt = profile?.created_at ? new Date(profile.created_at).getTime() : 0
  // Menus ocultos para todos (inclusive admin). Para voltar, remova o item daqui.
  const HIDDEN_FOR_ALL = ['/dashboard/indique']
  // Menus ocultos para todos, menos o admin (em teste). Gerenciador de Anuncios liberado para os alunos.
  const HIDDEN_NON_ADMIN: string[] = []
  const isNewUser = !isAdmin && createdAt > 0 && (Date.now() - createdAt) < HIDDEN_DAYS * 24 * 60 * 60 * 1000
  // Nos 7 primeiros dias, quem ainda nao tem plano nao ve nada sobre planos/creditos
  const hasActivePlan = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
  const hidePlans = isNewUser && !hasActivePlan

  const firstName = (profile?.full_name || '').split(' ')[0] || 'Usuario'
  const videosRestantes = Math.max(0, videosLimit - videosUsed)

  const navItems = [
    { href: '/dashboard', icon: 'ti-home', label: 'Painel do Aluno', locked: false },
    { href: '/dashboard/chat', icon: 'ti-message-circle', label: 'Assistente IA', locked: false },
    { href: '/dashboard/plataformas', icon: 'ti-building-store', label: 'Plataformas', locked: false },
    { href: '/dashboard/produtos', icon: 'ti-flame', label: 'Produtos em Alta', locked: false },
    { href: '/dashboard/ebook', icon: 'ti-book-2', label: 'Gerador de Ebook', locked: false },
    { href: '/dashboard/paginas', icon: 'ti-layout', label: 'Gerador de Site', locked: hidePlans, lockStatus: 'Em atualizacao' },
    { href: '/dashboard/criativo', icon: 'ti-sparkles', label: 'Gerador de Criativos', locked: hidePlans && videosUsed >= 2 + videosExtra, lockStatus: 'Em atualizacao' },
    { href: '/dashboard/criativos-manuais', icon: 'ti-video', label: 'Criativos Manuais', locked: false },
    { href: '/dashboard/indique', icon: 'ti-gift', label: 'Indique e ganhe', locked: false, highlight: true },
    { href: '/dashboard/vendas', icon: 'ti-rocket', label: 'Vendendo no Automatico', locked: false },
    { href: '/dashboard/estrutura-express', icon: 'ti-bolt', label: 'Estrutura Express', locked: false, badge: 'NOVO' },
    { href: '/dashboard/anuncios', icon: 'ti-brand-meta', label: 'Gerenciador de Anuncios', locked: !podeUsarAnuncios(isAdmin, profile?.email || user?.email), lockStatus: 'Em atualizacao' },
    { href: '/dashboard/suporte', icon: 'ti-brand-whatsapp', label: 'WhatsApp de Suporte', locked: false },
    { href: '/dashboard/aulas', icon: 'ti-device-tv', label: 'Aulas ao Vivo', locked: false },
    { href: '/dashboard/planos', icon: 'ti-credit-card', label: 'Planos', locked: false },
    ...((isAdmin || profile?.is_support) ? [{ href: '/dashboard/atendimento', icon: 'ti-brand-whatsapp', label: 'Atendimento WhatsApp', locked: false, badge: 'NOVO', tone: 'green' }] : []),
    ...(isAdmin ? [{ href: '/dashboard/admin', icon: 'ti-shield', label: 'Admin', locked: false }] : []),
    ...(isAdmin ? [{ href: '/dashboard/admin/conversas', icon: 'ti-message-2', label: 'Conversas (Junior)', locked: false }] : []),
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
            <div className={styles.logoUserName} title={profile?.full_name || ''}>{(profile?.full_name || '').trim() || firstName}</div>
            {(profile?.email || user?.email) && <div className={styles.logoUserEmail} title={profile?.email || user?.email}>{profile?.email || user?.email}</div>}
            <div className={styles.logoUserCredits} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {!hidePlans && <span>{plan?.is_unlimited ? '∞' : videosRestantes} Créditos</span>}
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
          {navItems.filter(function(item) { return HIDDEN_FOR_ALL.indexOf(item.href) === -1 && !(!isAdmin && HIDDEN_NON_ADMIN.indexOf(item.href) !== -1) && !(hidePlans && HIDDEN_NEW_USER.indexOf(item.href) !== -1) }).map(function(item) {
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
            if ((item as any).highlight) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={function() { setMobileOpen(false) }}
                  className={styles.navItem + ' ' + styles.navItemPromo + (pathname === item.href ? ' ' + styles.active : '')}
                  title="Indique a plataforma e ganhe R$ 60 no Pix"
                >
                  <span className={styles.promoIconWrap}>
                    <i className={'ti ' + item.icon} />
                    {!indiqueSeen && <span className={styles.notifDot} aria-label="Novidade" />}
                  </span>
                  <span className={styles.promoText}>{item.label}</span>
                  <span className={styles.promoPill}>R$ 60</span>
                </Link>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={function() { setMobileOpen(false) }}
                className={styles.navItem + (pathname === item.href ? ' ' + styles.active : '')}
                style={(item as any).badge ? ((item as any).tone === 'green' ? { background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontWeight: 700, boxShadow: '0 4px 14px rgba(22,163,74,0.35)' } : { background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff', fontWeight: 700, boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }) : undefined}
              >
                <i className={'ti ' + item.icon} />
                {item.label}
                {(item as any).badge && <span style={{ marginLeft: 'auto', background: '#fff', color: (item as any).tone === 'green' ? '#15803d' : '#ea580c', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4, borderRadius: 999, padding: '2px 7px' }}>{(item as any).badge}</span>}
              </Link>
            )
          })}

          {isAdmin && (
            <div>
              <button
                type="button"
                onClick={function() { setNotifAberto(!notifAberto) }}
                aria-expanded={notifAberto}
                className={styles.navItem + (noGrupoNotif && !notifAberto ? ' ' + styles.active : '')}
                style={{ width: '100%', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
              >
                <i className="ti ti-bell" />
                Notificações
                <i className={'ti ' + (notifAberto ? 'ti-chevron-up' : 'ti-chevron-down')} style={{ marginLeft: 'auto', width: 'auto', fontSize: 15 }} />
              </button>
              {notifAberto && (
                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 14, paddingLeft: 8, borderLeft: '1px solid var(--border2)' }}>
                  {NOTIF_ITENS.map(function(i) {
                    return (
                      <Link key={i.href} href={i.href} prefetch={false} onClick={function() { setMobileOpen(false) }} className={styles.navItem + (pathname === i.href ? ' ' + styles.active : '')} style={{ fontSize: 13.5 }}>
                        <i className={'ti ' + i.icon} />
                        {i.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom */}
        <div className={styles.bottom}>
          <div className={styles.userRow}>
            <input ref={fotoInput} type="file" accept="image/*" onChange={escolherFoto} style={{ display: 'none' }} />
            {fotoArquivo && <FotoPerfilModal arquivo={fotoArquivo} salvando={fotoBusy} onCancelar={function() { if (!fotoBusy) setFotoArquivo(null) }} onSalvar={salvarFoto} />}
            <button type="button" onClick={function() { if (fotoInput.current) fotoInput.current.click() }} title="Trocar foto de perfil" aria-label="Trocar foto de perfil"
              style={{ position: 'relative', border: 0, padding: 0, background: 'none', cursor: 'pointer', flexShrink: 0, width: 32, height: 32 }}>
              {fotoUrl ? (
                <img src={fotoUrl} alt="Foto de perfil" style={{ width: 32, height: 32, borderRadius: 10, objectFit: 'cover', display: 'block', opacity: fotoBusy ? 0.5 : 1 }} />
              ) : (
                <div className={styles.userAvatar} style={{ opacity: fotoBusy ? 0.5 : 1 }}>{user?.email?.[0].toUpperCase()}</div>
              )}
              <span style={{ position: 'absolute', right: -4, bottom: -4, width: 15, height: 15, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, lineHeight: 1 }}>{fotoBusy ? '…' : '📷'}</span>
            </button>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{profile?.full_name || 'Usuario'}</div>
              {fotoErro && <div style={{ fontSize: 10.5, color: '#dc2626', lineHeight: 1.2 }}>{fotoErro}</div>}
              {!hidePlans && <div className={styles.userPlan}>{plan?.name || 'Starter'}</div>}
              {!hidePlans && <div className={styles.userCredits}>{plan?.is_unlimited ? '∞' : videosRestantes} Créditos</div>}
            </div>
            <button className={styles.logoutBtn} onClick={logout} title="Sair">
              <i className="ti ti-logout" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
