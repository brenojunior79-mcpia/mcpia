'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

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
  const supabase = createClient()

  useEffect(function() {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    setDate(now.toLocaleDateString('pt-BR', options))

    // Notificacoes de exemplo (substituir por tabela real depois)
    setNotifications([
      { id: '1', title: 'Bem-vindo!', message: 'Sua conta foi criada com sucesso. Explore os recursos da plataforma!', read: false, created_at: new Date().toISOString() },
      { id: '2', title: 'Novo produto disponivel', message: 'O produto Pack AEG foi adicionado em Produtos em Alta. Confira!', read: false, created_at: new Date().toISOString() },
    ])
  }, [])

  const unread = notifications.filter(function(n) { return !n.read }).length

  function markAllRead() {
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

      {/* Saudacao + Data */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          {greeting}, {firstName}! {isFemale ? '👩' : '👋'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted2)', textTransform: 'capitalize' }}>{date}</div>
      </div>

      {/* Direita: sininho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Sininho de notificacoes */}
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

      </div>

      <style>{`
        @keyframes pulseBadge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}
