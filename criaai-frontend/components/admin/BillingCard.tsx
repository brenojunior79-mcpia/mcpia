'use client'
import { useEffect, useRef, useState } from 'react'

function brl(v: any): string {
  return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Numero que "sobe" ate o valor final
function CountUp(props: { value: number; money?: boolean }) {
  const [shown, setShown] = useState(0)
  const from = useRef(0)
  useEffect(function() {
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = from.current
    const end = Number(props.value) || 0
    if (reduce || start === end) { setShown(end); from.current = end; return }
    const t0 = performance.now()
    const dur = 800
    let raf = 0
    function tick(now: number) {
      const k = Math.min(1, (now - t0) / dur)
      const eased = 1 - Math.pow(1 - k, 3)
      setShown(start + (end - start) * eased)
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = end
    }
    raf = requestAnimationFrame(tick)
    return function() { cancelAnimationFrame(raf); from.current = end }
  }, [props.value])
  return <span>{props.money ? brl(shown) : Math.round(shown)}</span>
}

function diaLabel(iso: string): string {
  const tz = 'America/Sao_Paulo'
  const d = new Date(iso)
  const ds = d.toLocaleDateString('pt-BR', { timeZone: tz })
  if (ds === new Date().toLocaleDateString('pt-BR', { timeZone: tz })) return 'Hoje'
  if (ds === new Date(Date.now() + 86400000).toLocaleDateString('pt-BR', { timeZone: tz })) return 'Amanhã'
  return d.toLocaleDateString('pt-BR', { timeZone: tz, weekday: 'short', day: '2-digit', month: '2-digit' })
}

function nomeOrigem(o: string): string {
  return o === 'cakto' ? 'Cakto' : o === 'hubla' ? 'Hubla' : o === 'stripe' ? 'Stripe' : o
}

export default function BillingCard(props: { data: any }) {
  const b = props.data
  const [sel, setSel] = useState('todas')
  const [ready, setReady] = useState(false)
  const [showPaid, setShowPaid] = useState(false)
  const [showNext, setShowNext] = useState(false)

  // Faz as barras crescerem depois que o card aparece
  useEffect(function() {
    const t = setTimeout(function() { setReady(true) }, 80)
    return function() { clearTimeout(t) }
  }, [])

  const origens: any[] = (b && b.por_origem) || []
  const abas = [{ id: 'todas', nome: 'Todas' }].concat(origens.map(function(o: any) { return { id: o.origem, nome: nomeOrigem(o.origem) } }))

  function tile(chave: 'hoje' | 'semana' | 'mes') {
    if (!b) return { rec: 0, falta: 0, qtd: 0, ate: '' }
    if (sel === 'todas') return { rec: Number(b[chave].rec) || 0, falta: Number(b[chave].falta) || 0, qtd: Number(b[chave].rec_qtd) || 0, ate: b[chave].ate || '' }
    const o = origens.find(function(x: any) { return x.origem === sel })
    if (!o) return { rec: 0, falta: 0, qtd: -1, ate: b[chave].ate || '' }
    return { rec: Number(o[chave + '_rec']) || 0, falta: Number(o[chave + '_falta']) || 0, qtd: -1, ate: b[chave].ate || '' }
  }

  const tiles = [
    { chave: 'hoje' as const, titulo: 'Hoje', sub: '' },
    { chave: 'semana' as const, titulo: 'Esta semana', sub: 'até domingo' },
    { chave: 'mes' as const, titulo: 'Este mês', sub: 'até o dia ' + (b && b.mes && b.mes.ate ? Number(String(b.mes.ate).slice(8, 10)) : '') },
  ]

  const pagos: any[] = ((b && b.pagos_hoje) || []).filter(function(x: any) { return sel === 'todas' || x.origem === sel })
  const proximas: any[] = ((b && b.proximas) || []).filter(function(x: any) { return sel === 'todas' || x.origem === sel })
  const porDia: any[] = (b && b.por_dia) || []
  const maxDia = Math.max(1, ...porDia.map(function(x: any) { return Number(x.valor) || 0 }))

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 28 }
  const btn: React.CSSProperties = { padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }

  return (
    <div style={card}>
      <style>{`
        @keyframes bcUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        @keyframes bcPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,.45) } 50% { box-shadow: 0 0 0 6px rgba(34,197,94,0) } }
        .bc-up { animation: bcUp .5s ease both }
        .bc-bar { transition: width .9s cubic-bezier(.2,.8,.2,1) }
        .bc-dot { animation: bcPulse 2s infinite }
        @media (prefers-reduced-motion: reduce) { .bc-up, .bc-dot { animation: none } .bc-bar { transition: none } }
      `}</style>

      {/* Titulo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="bc-dot" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#22c55e' }} />
            Assinaturas
          </div>
          <div style={{ fontSize: 15, color: 'var(--text)', marginTop: 4 }}>
            <b style={{ fontSize: 26, color: 'var(--green)' }}><CountUp value={b ? Number(b.ativas) : 0} /></b>{' '}
            ativas · <b><CountUp value={b ? Number(b.mensal) : 0} money /></b> por mês
          </div>
          {b && b.em_atraso > 0 && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{b.em_atraso} com pagamento atrasado ({brl(b.em_atraso_valor)})</div>
          )}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {abas.map(function(a) {
            const on = a.id === sel
            return (
              <button key={a.id} onClick={function() { setSel(a.id) }}
                style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid ' + (on ? '#22c55e' : 'var(--border)'), background: on ? '#22c55e' : 'var(--surface2)', color: on ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all .2s' }}>
                {a.nome}
              </button>
            )
          })}
        </div>
      </div>

      {/* Hoje / semana / mes */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {tiles.map(function(t, i) {
          const v = tile(t.chave)
          const total = v.rec + v.falta
          const pct = total > 0 ? Math.round((v.rec / total) * 100) : 0
          return (
            <div key={t.chave} className="bc-up" style={{ flex: '1 1 200px', background: 'var(--surface2)', borderRadius: 14, padding: '14px 16px', animationDelay: (i * 90) + 'ms' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                {t.titulo}{t.sub ? <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}> · {t.sub}</span> : null}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 10 }}>Já recebi</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--green)', lineHeight: 1.15 }}><CountUp value={v.rec} money /></div>
              {v.qtd >= 0 && <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{v.qtd} {v.qtd === 1 ? 'pagamento' : 'pagamentos'}</div>}
              <div style={{ background: 'var(--border)', borderRadius: 6, height: 8, margin: '10px 0 8px', overflow: 'hidden' }}>
                <div className="bc-bar" style={{ width: ready ? Math.max(pct, v.rec > 0 ? 4 : 0) + '%' : '0%', height: '100%', background: '#22c55e', borderRadius: 6 }} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>
                Ainda vou receber <b><CountUp value={v.falta} money /></b>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recebidos hoje */}
      <div style={{ marginTop: 16 }}>
        <button onClick={function() { setShowPaid(!showPaid) }} style={btn}>
          {showPaid ? 'Esconder' : 'Ver quem pagou hoje (' + pagos.length + ')'}
        </button>
        {showPaid && (
          <div style={{ marginTop: 10 }}>
            {pagos.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Nenhum pagamento hoje ainda.</div>
            ) : pagos.map(function(p: any, i: number) {
              return (
                <div key={i} className="bc-up" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', fontSize: 13, borderBottom: '1px solid var(--border)', animationDelay: (i * 40) + 'ms' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.nome || 'Sem nome'} <span style={{ color: 'var(--muted2)', fontWeight: 400 }}>· {p.plano} · {nomeOrigem(p.origem)}</span></span>
                  <span style={{ color: 'var(--green)', fontWeight: 700, whiteSpace: 'nowrap' }}>+ {brl(p.valor)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Proximas cobrancas */}
      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
          Próximas cobranças <span style={{ color: 'var(--muted2)', fontWeight: 500 }}>· 14 dias{sel !== 'todas' ? ' (todas as plataformas)' : ''}</span>
        </div>
        {porDia.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Nenhuma cobrança prevista nos próximos 14 dias.</div>
        ) : porDia.map(function(x: any, i: number) {
          const w = Math.max(4, Math.round(((Number(x.valor) || 0) / maxDia) * 100))
          return (
            <div key={x.dia} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 13 }}>
              <span style={{ width: 84, color: 'var(--text)', fontWeight: 600, textTransform: 'capitalize' }}>{diaLabel(x.dia + 'T12:00:00')}</span>
              <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 6, height: 12, overflow: 'hidden' }}>
                <div className="bc-bar" style={{ width: ready ? w + '%' : '0%', height: '100%', background: 'linear-gradient(90deg,#22c55e,#4ade80)', borderRadius: 6, transitionDelay: (i * 50) + 'ms' }} />
              </div>
              <span style={{ width: 88, textAlign: 'right', color: 'var(--text)', fontWeight: 700 }}>{brl(x.valor)}</span>
            </div>
          )
        })}

        <button onClick={function() { setShowNext(!showNext) }} style={Object.assign({}, btn, { marginTop: 12 })}>
          {showNext ? 'Esconder lista' : 'Ver quem vai pagar'}
        </button>
        {showNext && (
          <div style={{ marginTop: 10, maxHeight: 340, overflowY: 'auto' }}>
            {proximas.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Nenhuma cobrança prevista.</div>
            ) : proximas.map(function(c: any, i: number) {
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{c.nome || 'Sem nome'} <span style={{ color: 'var(--muted2)', fontWeight: 400 }}>· {c.plano} · {nomeOrigem(c.origem)}</span></span>
                  <span style={{ color: 'var(--muted2)', whiteSpace: 'nowrap' }}>{diaLabel(c.data)} · <b style={{ color: 'var(--text)' }}>{brl(c.valor)}</b>{c.confirmada ? '' : ' *'}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 16, lineHeight: 1.5 }}>
        Valores brutos, antes das taxas.{b && b.estimadas > 0 ? ' Itens com * e pagamentos anteriores a 14/10 são estimados; viram dados reais a cada novo pagamento.' : ''}
      </div>
    </div>
  )
}
