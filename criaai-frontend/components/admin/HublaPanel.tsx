'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from '@/app/dashboard/admin/admin.module.css'

const FIRST = 5
const STEP = 10

// Só dois tipos de evento interessam aqui: compra e reembolso
function kindOf(ev: any): 'compra' | 'reembolso' | null {
  const t = ev.event_type
  if (t === 'invoice.refunded' || t === 'refund' || t === 'chargeback') return 'reembolso'
  if (t === 'manual') return ev.action === 'removido' ? 'reembolso' : ev.action === 'liberado' ? 'compra' : null
  if (t === 'subscription.activated' || t === 'customer.member_added' || t === 'purchase_approved' || t === 'subscription_created') return 'compra'
  return null
}

function nomeOrigem(o: string): string {
  return o === 'cakto' ? 'Cakto' : 'Hubla'
}

function fmt(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function HublaPanel() {
  const supabase = createClient()
  const [events, setEvents] = useState<any[]>([])
  const [visible, setVisible] = useState(FIRST)
  const [prov, setProv] = useState('todas')
  const [removed7, setRemoved7] = useState(0)
  const [showRevoke, setShowRevoke] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function loadEvents() {
    const e = await supabase.from('hubla_events').select('*').order('created_at', { ascending: false }).limit(300)
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

  // So compra e reembolso; o mesmo aluno/tipo em ate 10 minutos conta uma vez (a Hubla manda varios avisos por compra)
  const lista: any[] = []
  events.forEach(function(ev: any) {
    const k = kindOf(ev)
    if (!k) return
    if (prov !== 'todas' && (ev.provider || 'hubla') !== prov) return
    const dup = lista.find(function(x: any) {
      return x.k === k && x.ev.email === ev.email && (x.ev.provider || 'hubla') === (ev.provider || 'hubla') && Math.abs(new Date(x.ev.created_at).getTime() - new Date(ev.created_at).getTime()) < 10 * 60 * 1000
    })
    if (dup) return
    lista.push({ k: k, ev: ev })
  })
  const compras7 = lista.filter(function(x: any) { return x.k === 'compra' && Date.now() - new Date(x.ev.created_at).getTime() < 7 * 86400000 }).length
  const reemb7 = lista.filter(function(x: any) { return x.k === 'reembolso' && Date.now() - new Date(x.ev.created_at).getTime() < 7 * 86400000 }).length

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
          <div className={styles.tableTitle}>Últimas compras e reembolsos</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted2)', marginRight: 6 }}>7 dias: <b style={{ color: 'var(--green)' }}>{compras7} compras</b> · <b style={{ color: 'var(--red)' }}>{reemb7} reembolsos</b></span>
            {[{ id: 'todas', nome: 'Todas' }, { id: 'hubla', nome: 'Hubla' }, { id: 'cakto', nome: 'Cakto' }].map(function(t) {
              const on = prov === t.id
              return (
                <button key={t.id} onClick={function() { setProv(t.id); setVisible(FIRST) }}
                  style={{ padding: '6px 13px', borderRadius: 999, border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'var(--surface2)', color: on ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  {t.nome}
                </button>
              )
            })}
          </div>
        </div>
        {lista.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted2)', fontSize: 13 }}>
            Nenhuma compra ou reembolso registrado ainda. Eles aparecem aqui conforme a Hubla e a Cakto avisam a plataforma.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted2)' }}>
                  <th style={{ padding: '10px 18px' }}>Quando</th>
                  <th style={{ padding: '10px 18px' }}>Tipo</th>
                  <th style={{ padding: '10px 18px' }}>Plataforma</th>
                  <th style={{ padding: '10px 18px' }}>E-mail</th>
                  <th style={{ padding: '10px 18px' }}>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {lista.slice(0, visible).map(function(x: any) {
                  const ev = x.ev
                  const isRef = x.k === 'reembolso'
                  const detalhe = ev.action === 'ignorado' && ev.note === 'aluno nao encontrado na plataforma' ? 'ainda sem cadastro na plataforma' : (ev.note || '')
                  return (
                    <tr key={ev.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 18px', whiteSpace: 'nowrap' }}>{fmt(ev.created_at)}</td>
                      <td style={{ padding: '10px 18px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: isRef ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', color: isRef ? 'var(--red)' : 'var(--green)' }}>{isRef ? 'Reembolso' : 'Compra'}</span>
                      </td>
                      <td style={{ padding: '10px 18px' }}>{nomeOrigem(ev.provider || 'hubla')}</td>
                      <td style={{ padding: '10px 18px' }}>{ev.email || '—'}</td>
                      <td style={{ padding: '10px 18px', color: 'var(--muted2)' }}>{detalhe}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {lista.length > FIRST && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--muted2)' }}>Mostrando {Math.min(visible, lista.length)} de {lista.length}</span>
            {visible < lista.length && (
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
