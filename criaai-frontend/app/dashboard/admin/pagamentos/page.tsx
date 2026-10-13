'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import styles from '../admin.module.css'

export default function PagamentosPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<any[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [counts, setCounts] = useState({ ativos: 0, removidos7: 0 })

  async function loadEvents() {
    const e = await supabase.from('hubla_events').select('*').order('created_at', { ascending: false }).limit(50)
    setEvents(e.data || [])
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const r = await supabase.from('hubla_events').select('id', { count: 'exact', head: true }).eq('action', 'removido').gte('created_at', since)
    const a = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active')
    setCounts({ ativos: a.count || 0, removidos7: r.count || 0 })
  }

  useEffect(function() {
    async function load() {
      const u = await supabase.auth.getUser()
      const user = u.data.user
      if (!user) { router.push('/login'); return }
      const p = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!p.data?.is_admin) { router.push('/dashboard'); return }
      await loadEvents()
      setLoading(false)
    }
    load()
  }, [])

  async function revoke() {
    setError('')
    setResult(null)
    const emails = text.split(/[\s,;]+/).map(function(e) { return e.trim() }).filter(Boolean)
    if (emails.length === 0) { setError('Cole pelo menos um e-mail.'); return }
    if (!window.confirm('Remover o acesso de ' + emails.length + ' e-mail(s)? O aluno continua com a conta, mas fica sem plano.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/hubla/revoke-emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emails }) })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Erro ao remover.')
      else { setResult(data); setText(''); await loadEvents() }
    } catch (e) {
      setError('Não foi possível conectar. Tente de novo.')
    }
    setBusy(false)
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const EVENT_LABEL: Record<string, string> = {
    'invoice.refunded': 'Reembolso',
    'subscription.activated': 'Assinatura ativada',
    'subscription.deactivated': 'Assinatura encerrada',
    'customer.member_added': 'Acesso concedido',
    'customer.member_removed': 'Acesso removido',
    'manual': 'Manual (admin)',
  }

  if (loading) return (
    <div className={styles.loading}>
      <i className="ti ti-loader" style={{ fontSize: 32 }} />
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>Pagamentos (Hubla)</div>
          <div className={styles.sub}>Reembolsos tiram o acesso sozinhos. Aqui você confere e corrige à mão.</div>
        </div>
      </div>
      <div className={styles.content}>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Planos ativos agora</div>
            <div className={styles.statValue} style={{ color: 'var(--accent)' }}>{counts.ativos}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Acessos removidos (7 dias)</div>
            <div className={styles.statValue}>{counts.removidos7}</div>
          </div>
        </div>

        <div className={styles.tableCard} style={{ marginBottom: 24 }}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>Remover acesso de quem pediu reembolso</div>
          </div>
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 10, lineHeight: 1.6 }}>
              Cole os e-mails, um por linha. Use para quem já foi reembolsado e ainda tem acesso. O aluno mantém a conta, mas fica sem plano.
            </div>
            <textarea
              value={text}
              onChange={function(e) { setText(e.target.value) }}
              rows={6}
              placeholder={'aluno1@gmail.com\naluno2@gmail.com'}
              style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            {error && <div style={{ marginTop: 10, color: 'var(--red)', fontSize: 13 }}>{error}</div>}
            <button
              onClick={revoke}
              disabled={busy}
              style={{ marginTop: 12, padding: '12px 20px', borderRadius: 10, border: 'none', cursor: busy ? 'default' : 'pointer', background: 'linear-gradient(135deg, #ef4444, #ec4899)', color: '#fff', fontWeight: 700, fontSize: 14, opacity: busy ? 0.6 : 1 }}
            >
              {busy ? 'Removendo...' : 'Remover acesso'}
            </button>
            {result && (
              <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.7 }}>
                <div style={{ color: 'var(--green)', fontWeight: 700 }}>{result.removed.length} acesso(s) removido(s).</div>
                {result.notFound.length > 0 && <div style={{ color: 'var(--muted2)' }}>Não encontrados na plataforma ({result.notFound.length}): {result.notFound.join(', ')}</div>}
                {result.skipped.length > 0 && <div style={{ color: 'var(--muted2)' }}>Ignorados (admin ou erro): {result.skipped.join(', ')}</div>}
              </div>
            )}
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>Últimos avisos da Hubla</div>
          </div>
          {events.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted2)', fontSize: 13 }}>
              Nenhum aviso registrado ainda. Eles aparecem aqui a partir de agora, conforme a Hubla avisa a plataforma.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--muted2)' }}>
                    <th style={{ padding: '10px 18px' }}>Quando</th>
                    <th style={{ padding: '10px 18px' }}>Aviso</th>
                    <th style={{ padding: '10px 18px' }}>E-mail</th>
                    <th style={{ padding: '10px 18px' }}>O que fizemos</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(function(ev: any) {
                    const color = ev.action === 'removido' ? 'var(--red)' : ev.action === 'liberado' ? 'var(--green)' : 'var(--muted2)'
                    return (
                      <tr key={ev.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 18px', whiteSpace: 'nowrap' }}>{fmt(ev.created_at)}</td>
                        <td style={{ padding: '10px 18px' }}>{EVENT_LABEL[ev.event_type] || ev.event_type}</td>
                        <td style={{ padding: '10px 18px' }}>{ev.email || '—'}</td>
                        <td style={{ padding: '10px 18px', color }}><b>{ev.action}</b>{ev.note ? ' · ' + ev.note : ''}</td>
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
