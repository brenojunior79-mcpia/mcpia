'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from '@/app/dashboard/admin/admin.module.css'

const FIRST = 5
const STEP = 10

const EVENT_LABEL: Record<string, string> = {
  'invoice.refunded': 'Reembolso',
  'invoice.payment_succeeded': 'Pagamento',
  'invoice.payment_failed': 'Pagamento recusado',
  'subscription.activated': 'Assinatura ativada',
  'subscription.deactivated': 'Assinatura encerrada',
  'customer.member_added': 'Acesso concedido',
  'customer.member_removed': 'Acesso removido',
  'manual': 'Manual (admin)',
}

function fmt(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function HublaPanel() {
  const supabase = createClient()
  const [events, setEvents] = useState<any[]>([])
  const [visible, setVisible] = useState(FIRST)
  const [removed7, setRemoved7] = useState(0)
  const [showRevoke, setShowRevoke] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function loadEvents() {
    const e = await supabase.from('hubla_events').select('*').order('created_at', { ascending: false }).limit(100)
    setEvents(e.data || [])
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const r = await supabase.from('hubla_events').select('id', { count: 'exact', head: true }).eq('action', 'removido').gte('created_at', since)
    setRemoved7(r.count || 0)
  }

  useEffect(function() { loadEvents() }, [])

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

  const btn: React.CSSProperties = { padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }

  return (
    <div id="pagamentos" style={{ scrollMarginTop: 16 }}>
      {/* Remover acesso (escondido ate precisar) */}
      <div className={styles.tableCard} style={{ marginBottom: 24 }}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>Reembolsos e acessos (Hubla)</div>
          <div style={{ fontSize: 13, color: 'var(--muted2)' }}>{removed7} acesso(s) removido(s) nos últimos 7 dias</div>
        </div>
        <div style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.6 }}>
            Reembolsos tiram o acesso sozinhos. Se alguém foi reembolsado e ainda tem acesso, remova à mão aqui.
          </div>
          <button onClick={function() { setShowRevoke(!showRevoke) }} style={Object.assign({}, btn, { marginTop: 10 })}>
            {showRevoke ? 'Esconder' : 'Remover acesso de quem pediu reembolso'}
          </button>
          {showRevoke && (
            <div style={{ marginTop: 14 }}>
              <textarea
                value={text}
                onChange={function(e) { setText(e.target.value) }}
                rows={5}
                placeholder={'aluno1@gmail.com\naluno2@gmail.com'}
                style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 6 }}>Um e-mail por linha. O aluno mantém a conta, mas fica sem plano.</div>
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
          )}
        </div>
      </div>

      {/* Ultimos avisos */}
      <div className={styles.tableCard} style={{ marginBottom: 28 }}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>Últimos avisos da Hubla</div>
        </div>
        {events.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted2)', fontSize: 13 }}>
            Nenhum aviso registrado ainda. Eles aparecem aqui conforme a Hubla avisa a plataforma.
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
                {events.slice(0, visible).map(function(ev: any) {
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
        {events.length > FIRST && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--muted2)' }}>Mostrando {Math.min(visible, events.length)} de {events.length}</span>
            {visible < events.length && (
              <button onClick={function() { setVisible(visible + STEP) }} style={btn}>Ver mais</button>
            )}
            {visible > FIRST && (
              <button onClick={function() { setVisible(FIRST) }} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Mostrar menos</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
