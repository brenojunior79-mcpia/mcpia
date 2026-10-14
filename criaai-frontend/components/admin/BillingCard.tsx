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
  const [selDay, setSelDay] = useState<string | null>(null)
  const [moreDay, setMoreDay] = useState(false)

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
  // 14 dias a partir de hoje (horario de Brasilia), somando as cobrancas previstas de cada dia
  const hojeKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const base0 = new Date(hojeKey + 'T12:00:00Z').getTime()
  const dias: { key: string; dow: string; num: string; valor: number; qtd: number; pessoas: any[] }[] = []
  for (let i = 0; i < 14; i++) {
    const dt = new Date(base0 + i * 86400000)
    const key = dt.toISOString().slice(0, 10)
    const pessoas = proximas.filter(function(x: any) { return x.dia === key })
    dias.push({
      key: key,
      dow: dt.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', ''),
      num: key.slice(8, 10),
      valor: pessoas.reduce(function(a2: number, x: any) { return a2 + (Number(x.valor) || 0) }, 0),
      qtd: pessoas.length,
      pessoas: pessoas,
    })
  }
  const maxDia = Math.max(1, ...dias.map(function(d) { return d.valor }))
  const total14 = dias.reduce(function(a2, d) { return a2 + d.valor }, 0)
  const firstWith = dias.find(function(d) { return d.qtd > 0 })
  const activeKey = selDay || (firstWith ? firstWith.key : hojeKey)
  const activeDay = dias.find(function(d) { return d.key === activeKey }) || dias[0]
  const shownPeople = moreDay ? activeDay.pessoas : activeDay.pessoas.slice(0, 5)

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
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Próximas cobranças</span>
          <span style={{ fontSize: 12, color: 'var(--muted2)' }}>próximos 14 dias · <b style={{ color: 'var(--text)' }}>{brl(total14)}</b> · toque num dia para ver quem paga</span>
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6 }}>
          {dias.map(function(d, i) {
            const on = d.key === activeDay.key
            const h = d.valor > 0 ? Math.max(8, Math.round((d.valor / maxDia) * 90)) : 3
            return (
              <button key={d.key} onClick={function() { setSelDay(d.key); setMoreDay(false) }}
                style={{ flex: '1 0 54px', minWidth: 54, cursor: 'pointer', border: '1px solid ' + (on ? '#22c55e' : 'transparent'), background: on ? 'rgba(34,197,94,0.10)' : 'var(--surface2)', borderRadius: 12, padding: '8px 4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4, transition: 'all .2s' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: d.valor > 0 ? 'var(--text)' : 'var(--muted2)', minHeight: 13 }}>{d.valor > 0 ? Math.round(d.valor) : ''}</span>
                <div style={{ height: 90, display: 'flex', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                  <div className="bc-bar" style={{ width: 22, height: ready ? h : 0, transition: 'height .8s cubic-bezier(.2,.8,.2,1) ' + (i * 45) + 'ms', background: d.valor > 0 ? 'linear-gradient(180deg,#4ade80,#22c55e)' : 'var(--border)', borderRadius: '6px 6px 3px 3px' }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'capitalize' }}>{i === 0 ? 'hoje' : d.dow}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{d.num}</span>
              </button>
            )
          })}
        </div>

        {/* Quem paga no dia escolhido */}
        <div key={activeDay.key} className="bc-up" style={{ marginTop: 10, background: 'var(--surface2)', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 13, marginBottom: activeDay.qtd ? 6 : 0 }}>
            <b style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{diaLabel(activeDay.key + 'T12:00:00')}</b>
            <span style={{ color: 'var(--muted2)' }}>{activeDay.qtd} {activeDay.qtd === 1 ? 'cobrança' : 'cobranças'} · <b style={{ color: 'var(--green)' }}>{brl(activeDay.valor)}</b></span>
          </div>
          {activeDay.qtd === 0 && <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 4 }}>Nenhuma cobrança neste dia.</div>}
          {shownPeople.map(function(c: any, i: number) {
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', fontSize: 13, borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{c.nome || 'Sem nome'} <span style={{ color: 'var(--muted2)', fontWeight: 400 }}>· {c.plano} · {nomeOrigem(c.origem)}</span></span>
                <span style={{ color: 'var(--text)', fontWeight: 700, whiteSpace: 'nowrap' }}>{brl(c.valor)}{c.confirmada ? '' : ' *'}</span>
              </div>
            )
          })}
          {activeDay.qtd > 5 && (
            <button onClick={function() { setMoreDay(!moreDay) }} style={Object.assign({}, btn, { marginTop: 8 })}>
              {moreDay ? 'Ver menos' : 'Ver mais (' + (activeDay.qtd - 5) + ')'}
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 16, lineHeight: 1.5 }}>
        Valores brutos, antes das taxas.{b && b.estimadas > 0 ? ' Itens com * e pagamentos anteriores a 14/10 são estimados; viram dados reais a cada novo pagamento.' : ''}
      </div>
    </div>
  )
}
