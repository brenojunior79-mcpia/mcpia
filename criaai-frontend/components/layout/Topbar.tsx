'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import ComoInstalarModal from './ComoInstalarModal'

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  created_at: string
}

export default function Topbar({ profile, user }: { profile: any, user: any }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotif, setShowNotif] = useState(false)
  const [date, setDate] = useState('')
  const [instalarAberto, setInstalarAberto] = useState(false)
  useEffect(function() {
    function abrir() { setInstalarAberto(true) }
    window.addEventListener('mcpia-como-instalar', abrir)
    return function() { window.removeEventListener('mcpia-como-instalar', abrir) }
  }, [])
  const [jaInstalado, setJaInstalado] = useState(false)
  useEffect(function() {
    try { setJaInstalado(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true) } catch (e) {}
  }, [])
  const supabase = createClient()

  useEffect(function() {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    setDate(now.toLocaleDateString('pt-BR', options))

    // Notificacoes de exemplo (substituir por tabela real depois)
    // O "lido" fica salvo no navegador, para nao voltar como nao lido ao atualizar a pagina
    const base: Notification[] = [
      { id: '1', title: 'Bem-vindo!', message: 'Sua conta foi criada com sucesso. Explore os recursos da plataforma!', read: false, created_at: new Date().toISOString() },
      { id: '2', title: 'Novo produto disponivel', message: 'O produto Pack AEG foi adicionado em Produtos em Alta. Confira!', read: false, created_at: new Date().toISOString() },
    ]
    const readIds = loadReadIds()
    setNotifications(base.map(function(n) { return readIds.indexOf(n.id) !== -1 ? { ...n, read: true } : n }))
  }, [])

  const storageKey = 'mcpia_notif_read_' + (user?.id || 'anon')

  function loadReadIds(): string[] {
    try {
      const raw = localStorage.getItem(storageKey)
      const arr = raw ? JSON.parse(raw) : []
      return Array.isArray(arr) ? arr : []
    } catch (e) { return [] }
  }

  function saveReadIds(ids: string[]) {
    try { localStorage.setItem(storageKey, JSON.stringify(ids)) } catch (e) {}
  }

  function markRead(ids: string[]) {
    const merged = loadReadIds()
    ids.forEach(function(id) { if (merged.indexOf(id) === -1) merged.push(id) })
    saveReadIds(merged)
  }

  const unread = notifications.filter(function(n) { return !n.read }).length

  function markAllRead() {
    markRead(notifications.map(function(n) { return n.id }))
    setNotifications(function(prev) {
      return prev.map(function(n) { return { ...n, read: true } })
    })
  }

  // Saudacao por horario
  const hour = new Date().getHours()
  let greeting = 'Bom dia'
  if (hour >= 12 && hour < 18) greeting = 'Boa tarde'
  if (hour >= 18) greeting = 'Boa noite'

  // Detectar genero pelo nome (heuristica basica)
  const firstName = (profile?.full_name || '').split(' ')[0] || ''
  const femaleEndings = ['a', 'e', 'i', 'y']
  const isFemale = femaleEndings.some(function(end) { return firstName.toLowerCase().endsWith(end) }) && firstName.length > 3
  const welcomeLabel = isFemale ? 'Bem-vinda' : 'Bem-vindo'

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow-sm)',
      paddingLeft: 72,
    }}>

      <style>{`
        .tb-t-mob, .tb-t-min { display: none }
        @media (max-width: 640px) { .tb-t-desk { display: none } .tb-t-mob { display: inline } .tb-btn-instalar { padding: 0 11px !important; font-size: 12.5px !important; gap: 5px !important } }
        @media (max-width: 380px) { .tb-t-mob { display: none } .tb-t-min { display: inline } }
      `}</style>

      {/* Direita: sininho + Minha conta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
        {/* Como instalar (some quando a plataforma ja foi aberta pelo icone instalado) */}
        {!jaInstalado && (
          <button className="tb-btn-instalar" onClick={function() { setInstalarAberto(true) }} title="Como instalar a plataforma no seu aparelho"
            style={{ display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#7c5cfc', background: 'rgba(124,92,252,0.10)', border: '1px solid rgba(124,92,252,0.35)', whiteSpace: 'nowrap' }}>
            <i className="ti ti-device-mobile" style={{ fontSize: 17 }} />
            <span className="tb-t-desk">Como instalar</span><span className="tb-t-mob">Como baixar o app</span><span className="tb-t-min">Baixar app</span>
          </button>
        )}
        {instalarAberto && <ComoInstalarModal onFechar={function() { setInstalarAberto(false) }} />}
        {/* Sininho de notificacoes (ao lado esquerdo do Minha conta) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={function() { setShowNotif(!showNotif) }}
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s',
            }}
            title="Notificacoes"
          >
            <i className="ti ti-bell" style={{ fontSize: 18, color: 'var(--muted2)' }} />
            {unread > 0 && (
              <div style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: 'linear-gradient(135deg, #ef4444, #ec4899)',
                color: '#fff',
                borderRadius: '50%',
                width: 20,
                height: 20,
                fontSize: 11,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--surface)',
                animation: 'pulseBadge 2s ease infinite',
              }}>
                {unread}
              </div>
            )}
          </button>

          {/* Dropdown de notificacoes */}
          {showNotif && (
            <div style={{
              position: 'absolute',
              top: 46,
              right: 0,
              width: 320,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              boxShadow: 'var(--shadow-lg)',
              zIndex: 200,
              overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700 }}>Notificações</span>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--accent2)', cursor: 'pointer', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted2)', fontSize: 13 }}>
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.map(function(n) {
                    return (
                      <div key={n.id} style={{
                        padding: '12px 18px',
                        borderBottom: '1px solid var(--border)',
                        background: n.read ? 'transparent' : 'rgba(91,78,248,0.04)',
                        cursor: 'pointer',
                      }} onClick={function() {
                        markRead([n.id])
                        setNotifications(function(prev) {
                          return prev.map(function(item) { return item.id === n.id ? { ...item, read: true } : item })
                        })
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{n.title}</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--muted2)', margin: 0, lineHeight: 1.5 }}>{n.message}</p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>



      <a
        href="/dashboard/conta"
        title="Minha conta"
        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, height: 38, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
      >
        <i className="ti ti-user-circle" style={{ fontSize: 20, color: 'var(--muted2)' }} />
        <span className="minha-conta-texto">Minha conta</span>
      </a>
      </div>

      <style>{`
        @media (max-width: 520px) { .minha-conta-texto { display: none; } }
        @keyframes pulseBadge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}
