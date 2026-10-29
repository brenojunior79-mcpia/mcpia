'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import styles from '../admin.module.css'
import PushAutoCard from '@/components/admin/PushAutoCard'

const LINKS = [
  { value: '/dashboard', label: 'Painel do Aluno' },
  { value: '/dashboard/produtos', label: 'Produtos em Alta' },
  { value: '/dashboard/plataformas', label: 'Plataformas' },
  { value: '/dashboard/vendas', label: 'Vendendo no Automático' },
  { value: '/dashboard/aulas', label: 'Aulas ao Vivo' },
  { value: '/dashboard/chat', label: 'Assistente IA' },
  { value: '/dashboard/planos', label: 'Planos' },
]

const AUDIENCES = [
  { value: 'teste', label: 'Só eu (teste)' },
  { value: 'todos', label: 'Todos que aceitaram' },
  { value: 'sem_plano', label: 'Quem não tem plano' },
  { value: 'com_plano', label: 'Quem tem plano' },
]

function hasPlan(status: any) { return status === 'active' || status === 'trialing' }

export default function NotificacoesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subs, setSubs] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [myId, setMyId] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('/dashboard')
  const [audience, setAudience] = useState('teste')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean, text: string } | null>(null)

  async function loadAll() {
    let all: any[] = []
    let from = 0
    while (true) {
      const r = await supabase
        .from('push_subscriptions')
        .select('id, user_id, platform, profiles(subscription_status)')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + 999)
      if (r.error) break
      const rows = r.data || []
      all = all.concat(rows)
      if (rows.length < 1000) break
      from += 1000
    }
    setSubs(all)
    const h = await supabase.from('push_broadcasts').select('*').order('created_at', { ascending: false }).limit(20)
    setHistory(h.data || [])
  }

  useEffect(function() {
    async function load() {
      const u = await supabase.auth.getUser()
      const user = u.data.user
      if (!user) { router.push('/login'); return }
      const p = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!p.data?.is_admin) { router.push('/dashboard'); return }
      setMyId(user.id)
      await loadAll()
      setLoading(false)
    }
    load()
  }, [])

  function countFor(aud: string) {
    return subs.filter(function(s: any) {
      const prof: any = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
      if (aud === 'teste') return s.user_id === myId
      if (aud === 'sem_plano') return !hasPlan(prof?.subscription_status)
      if (aud === 'com_plano') return hasPlan(prof?.subscription_status)
      return true
    }).length
  }

  const totalDevices = subs.length
  const totalPeople = new Set(subs.map(function(s: any) { return s.user_id })).size
  const byPlatform = function(p: string) { return subs.filter(function(s: any) { return s.platform === p }).length }
  const targetCount = countFor(audience)

  async function send() {
    setResult(null)
    if (!title.trim() || !message.trim()) { setResult({ ok: false, text: 'Preencha o título e a mensagem.' }); return }
    if (audience !== 'teste') {
      const okConfirm = window.confirm('Enviar para ' + targetCount + ' aparelho(s)? Isso não pode ser desfeito.')
      if (!okConfirm) return
    }
    setSending(true)
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: message.trim(), url: link, audience }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, text: data.error || 'Não foi possível enviar.' })
      } else {
        setResult({ ok: true, text: 'Enviado para ' + data.sent + ' aparelho(s)' + (data.failed ? ' (' + data.failed + ' falharam' + (data.removed ? ', ' + data.removed + ' aparelhos antigos removidos' : '') + ')' : '') + '.' })
        if (audience !== 'teste') { setTitle(''); setMessage('') }
        await loadAll()
      }
    } catch (e) {
      setResult({ ok: false, text: 'Erro de conexão. Tente de novo.' })
    }
    setSending(false)
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return (
    <div className={styles.loading}>
      <i className="ti ti-loader" style={{ fontSize: 32 }} />
    </div>
  )

  const input: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
  const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>Notificações</div>
          <div className={styles.sub}>Envie novidades direto para o celular dos alunos</div>
        </div>
      </div>
      <div className={styles.content}>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Alunos que aceitaram</div>
            <div className={styles.statValue} style={{ color: 'var(--accent)' }}>{totalPeople}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>{totalDevices} aparelho(s) cadastrado(s)</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Por aparelho</div>
            <div style={{ display: 'flex', gap: 18, fontSize: 13, color: 'var(--muted2)', marginTop: 4 }}>
              <div><b style={{ color: 'var(--text)', fontSize: 20 }}>{byPlatform('android')}</b><br />Android</div>
              <div><b style={{ color: 'var(--text)', fontSize: 20 }}>{byPlatform('ios')}</b><br />iPhone</div>
              <div><b style={{ color: 'var(--text)', fontSize: 20 }}>{byPlatform('computador')}</b><br />Computador</div>
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Envios feitos</div>
            <div className={styles.statValue}>{history.length >= 20 ? '20+' : history.length}</div>
            <div className={styles.statUp} style={{ color: 'var(--muted2)' }}>veja o histórico abaixo</div>
          </div>
        </div>

        <PushAutoCard />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginBottom: 28 }}>
          {/* Formulario */}
          <div className={styles.tableCard} style={{ padding: 20 }}>
            <div className={styles.tableTitle} style={{ marginBottom: 16 }}>Nova notificação</div>

            <label style={label}>Título ({title.length}/65)</label>
            <input style={input} maxLength={65} value={title} onChange={function(e) { setTitle(e.target.value) }} placeholder="Ex: Nova plataforma liberada! 🎉" />

            <label style={{ ...label, marginTop: 14 }}>Mensagem ({message.length}/240)</label>
            <textarea style={{ ...input, minHeight: 90, resize: 'vertical' }} maxLength={240} value={message} onChange={function(e) { setMessage(e.target.value) }} placeholder="Ex: Acabamos de liberar uma nova plataforma para você. Toque para conferir." />

            <label style={{ ...label, marginTop: 14 }}>Ao tocar, abrir</label>
            <select style={input} value={link} onChange={function(e) { setLink(e.target.value) }}>
              {LINKS.map(function(l) { return <option key={l.value} value={l.value}>{l.label}</option> })}
            </select>

            <label style={{ ...label, marginTop: 14 }}>Enviar para</label>
            <select style={input} value={audience} onChange={function(e) { setAudience(e.target.value) }}>
              {AUDIENCES.map(function(a) { return <option key={a.value} value={a.value}>{a.label} ({countFor(a.value)})</option> })}
            </select>

            <button
              onClick={send}
              disabled={sending}
              style={{ width: '100%', marginTop: 18, padding: '13px 16px', borderRadius: 12, border: audience === 'teste' ? '1px solid var(--border)' : 'none', cursor: 'pointer', background: audience === 'teste' ? 'var(--surface2)' : 'linear-gradient(135deg, #5b4ef8, #ec4899)', color: audience === 'teste' ? 'var(--text)' : '#fff', fontWeight: 800, fontSize: 15, opacity: sending ? 0.7 : 1 }}
            >
              {sending ? 'Enviando...' : audience === 'teste' ? 'Enviar teste para mim' : 'Enviar para ' + targetCount + ' aparelho(s)'}
            </button>

            {result && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, fontSize: 13, background: result.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: result.ok ? 'var(--green)' : 'var(--red)' }}>
                {result.text}
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted2)', lineHeight: 1.5 }}>
              Dica: envie primeiro um teste só para você. E evite mandar mais de 1 por dia, para o aluno não bloquear.
            </div>
          </div>

          {/* Previa */}
          <div className={styles.tableCard} style={{ padding: 20 }}>
            <div className={styles.tableTitle} style={{ marginBottom: 16 }}>Como vai aparecer no celular</div>
            <div style={{ background: 'linear-gradient(160deg, #2b2f4a, #12142a)', borderRadius: 18, padding: 22 }}>
              <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 6px 18px rgba(0,0,0,0.25)' }}>
                <img src="/icon-192.png" alt="" style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Cristão Próspero · agora</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111', wordBreak: 'break-word' }}>{title || 'Título da notificação'}</div>
                  <div style={{ fontSize: 13, color: '#333', lineHeight: 1.4, wordBreak: 'break-word' }}>{message || 'A mensagem vai aparecer aqui.'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Historico */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>Últimos envios</div>
          </div>
          {history.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted2)', fontSize: 13 }}>Nenhum envio ainda.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--muted2)' }}>
                    <th style={{ padding: '10px 18px' }}>Quando</th>
                    <th style={{ padding: '10px 18px' }}>Título</th>
                    <th style={{ padding: '10px 18px' }}>Público</th>
                    <th style={{ padding: '10px 18px' }}>Entregues</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(function(h: any) {
                    const aud = AUDIENCES.filter(function(a) { return a.value === h.audience })[0]
                    return (
                      <tr key={h.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 18px', whiteSpace: 'nowrap' }}>{fmt(h.created_at)}</td>
                        <td style={{ padding: '10px 18px' }}>{h.title}</td>
                        <td style={{ padding: '10px 18px' }}>{aud ? aud.label : h.audience}</td>
                        <td style={{ padding: '10px 18px' }}>{h.sent_count} de {h.total}{h.failed_count ? ' (' + h.failed_count + ' falharam)' : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
