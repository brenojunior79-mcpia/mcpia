'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Parte = { n: number; v: number }
type Mes = { ym: string; vendas: number; fat: number; mentoria: Parte; express: Parte }

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MEDALHAS = ['🥇', '🥈', '🥉']

function brl(v: any): string {
  return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function num(v: any): string {
  return (Number(v) || 0).toLocaleString('pt-BR')
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
    const dur = 900
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
  return <span>{props.money ? brl(shown) : num(Math.round(shown))}</span>
}

export default function SalesMonthsCard() {
  const [data, setData] = useState<{ agora: string; meses: Mes[]; reembolsadas: number } | null>(null)
  const [erro, setErro] = useState(false)
  const [ready, setReady] = useState(false)
  const [metrica, setMetrica] = useState<'fat' | 'vendas'>('fat')
  const [ordem, setOrdem] = useState<'ranking' | 'calendario'>('ranking')
  const [ano, setAno] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)

  // Busca os numeros e atualiza sozinho a cada minuto
  useEffect(function() {
    const supabase = createClient()
    let vivo = true
    async function carregar() {
      try {
        const r = await supabase.rpc('sales_by_month')
        if (!vivo) return
        if (r.error || !r.data) { setErro(true); return }
        setErro(false)
        setData(r.data as any)
      } catch (e) {
        if (vivo) setErro(true)
      }
    }
    carregar()
    const t = setInterval(carregar, 60000)
    return function() { vivo = false; clearInterval(t) }
  }, [])

  // Faz as barras crescerem depois que o card aparece
  useEffect(function() {
    if (!data) return
    const t = setTimeout(function() { setReady(true) }, 120)
    return function() { clearTimeout(t) }
  }, [data])

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 28 }

  const css = `
    @keyframes smUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
    @keyframes smPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,.5) } 50% { box-shadow: 0 0 0 6px rgba(245,158,11,0) } }
    @keyframes smStripe { from { background-position: 0 0, 0 0 } to { background-position: 28px 0, 0 0 } }
    @keyframes smShine { 0% { transform: translateX(-120%) } 60%,100% { transform: translateX(260%) } }
    @keyframes smPop { 0% { transform: scale(.4) rotate(-20deg); opacity: 0 } 70% { transform: scale(1.25) rotate(8deg); opacity: 1 } 100% { transform: scale(1) rotate(0) } }
    .sm-up { animation: smUp .5s ease both }
    .sm-fill { transition: width 1s cubic-bezier(.2,.8,.2,1) }
    .sm-pop { display: inline-block; animation: smPop .6s ease .5s both }
    .sm-dot { animation: smPulse 2s infinite }
    .sm-row:hover { background: var(--surface2) }
    .sm-shine { position: absolute; top: 0; bottom: 0; width: 40%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.55), transparent); animation: smShine 2.8s ease-in-out infinite }
    @media (prefers-reduced-motion: reduce) { .sm-up, .sm-pop, .sm-dot, .sm-shine { animation: none } .sm-fill { transition: none } }
  `

  const titulo = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🏆</span> Melhores meses de vendas
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Mentoria Cristão Próspero + Estrutura Express</div>
      </div>
    </div>
  )

  if (erro && !data) {
    return (
      <div style={card}>
        <style>{css}</style>
        {titulo}
        <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Não foi possível carregar as vendas agora. Tente atualizar a página.</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={card}>
        <style>{css}</style>
        {titulo}
        <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Carregando...</div>
      </div>
    )
  }

  const anos = Array.from(new Set(data.meses.map(function(m) { return m.ym.slice(0, 4) }).concat([data.agora.slice(0, 4)]))).sort().reverse()
  const anoSel = ano && anos.indexOf(ano) >= 0 ? ano : data.agora.slice(0, 4)

  // Todos os meses do ano (ate o mes atual, se for o ano corrente), mesmo os sem venda
  const ultimo = anoSel === data.agora.slice(0, 4) ? Number(data.agora.slice(5, 7)) : 12
  const lista: Mes[] = []
  for (let i = 1; i <= ultimo; i++) {
    const ym = anoSel + '-' + (i < 10 ? '0' : '') + i
    const achou = data.meses.find(function(m) { return m.ym === ym })
    lista.push(achou || { ym: ym, vendas: 0, fat: 0, mentoria: { n: 0, v: 0 }, express: { n: 0, v: 0 } })
  }

  const valor = function(m: Mes) { return metrica === 'fat' ? Number(m.fat) : Number(m.vendas) }
  const porValor = lista.slice().sort(function(a, b) { return valor(b) - valor(a) })
  const posicao: Record<string, number> = {}
  porValor.forEach(function(m, i) { posicao[m.ym] = i })
  const maximo = Math.max(1, valor(porValor[0]))
  const linhas = ordem === 'ranking' ? porValor : lista

  const totalFat = lista.reduce(function(a, m) { return a + Number(m.fat) }, 0)
  const totalVendas = lista.reduce(function(a, m) { return a + Number(m.vendas) }, 0)
  const melhor = porValor[0] && valor(porValor[0]) > 0 ? porValor[0] : null
  const nomeMes = function(ym: string) { return MESES[Number(ym.slice(5, 7)) - 1] }

  const tile: React.CSSProperties = { flex: '1 1 150px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }
  const chip = function(on: boolean): React.CSSProperties {
    return { padding: '7px 13px', borderRadius: 10, border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'var(--surface2)', color: on ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }
  }

  return (
    <div style={card}>
      <style>{css}</style>
      {titulo}

      {/* Resumo do ano */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={tile} className="sm-up">
          <div style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Faturamento em {anoSel}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', marginTop: 4 }}><CountUp value={totalFat} money /></div>
        </div>
        <div style={{ ...tile, animationDelay: '.08s' }} className="sm-up">
          <div style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Vendas em {anoSel}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}><CountUp value={totalVendas} /></div>
        </div>
        <div style={{ ...tile, animationDelay: '.16s' }} className="sm-up">
          <div style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Melhor mês</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>{melhor ? nomeMes(melhor.ym) : '—'}</div>
          {melhor && <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2 }}>{brl(melhor.fat)} · {num(melhor.vendas)} vendas</div>}
        </div>
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <button style={chip(metrica === 'fat')} onClick={function() { setMetrica('fat') }}>💰 Faturamento</button>
        <button style={chip(metrica === 'vendas')} onClick={function() { setMetrica('vendas') }}>🛒 Vendas</button>
        <span style={{ flex: 1 }} />
        <button style={chip(ordem === 'ranking')} onClick={function() { setOrdem('ranking') }}>Melhores primeiro</button>
        <button style={chip(ordem === 'calendario')} onClick={function() { setOrdem('calendario') }}>Mês a mês</button>
        {anos.length > 1 && anos.map(function(a) {
          return <button key={a} style={chip(a === anoSel)} onClick={function() { setAno(a); setAberto(null) }}>{a}</button>
        })}
      </div>

      {/* Ranking dos meses */}
      <div>
        {linhas.map(function(m, i) {
          const v = valor(m)
          const pct = ready ? Math.max(v > 0 ? 3 : 0, Math.round((v / maximo) * 100)) : 0
          const pos = posicao[m.ym]
          const top = v > 0 && pos < 3
          const emAndamento = m.ym === data.agora
          const sem = Number(m.vendas) === 0
          const ehAberto = aberto === m.ym
          const cor = pos === 0 && v > 0 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,var(--accent),#9b8ffc)'
          const ticket = Number(m.vendas) > 0 ? Number(m.fat) / Number(m.vendas) : 0
          return (
            <div key={m.ym} className="sm-up" style={{ animationDelay: (i * 0.05) + 's', borderBottom: '1px solid var(--border)' }}>
              <div
                className="sm-row"
                role="button"
                tabIndex={0}
                onClick={function() { setAberto(ehAberto ? null : m.ym) }}
                onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAberto(ehAberto ? null : m.ym) } }}
                style={{ padding: '11px 6px', cursor: 'pointer', borderRadius: 8 }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
                  <span style={{ width: 26, fontSize: 17, textAlign: 'center' }}>
                    {top ? <span className={pos === 0 ? 'sm-pop' : ''}>{MEDALHAS[pos]}</span> : <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{v > 0 ? (pos + 1) + 'º' : ''}</span>}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{nomeMes(m.ym)}</span>
                  {emAndamento && (
                    <span style={{ fontSize: 11, color: 'var(--muted2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span className="sm-dot" style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
                      em andamento
                    </span>
                  )}
                  <span style={{ flex: 1 }} />
                  {sem ? (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>sem vendas</span>
                  ) : (
                    <span style={{ textAlign: 'right' }}>
                      <b style={{ fontSize: 14, color: metrica === 'fat' ? 'var(--green)' : 'var(--text)' }}>{metrica === 'fat' ? brl(m.fat) : num(m.vendas) + ' vendas'}</b>
                      <span style={{ fontSize: 12, color: 'var(--muted2)', marginLeft: 8 }}>{metrica === 'fat' ? num(m.vendas) + ' vendas' : brl(m.fat)}</span>
                    </span>
                  )}
                </div>
                <div style={{ height: 12, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div
                    className="sm-fill"
                    style={{
                      position: 'relative', overflow: 'hidden', height: '100%', width: pct + '%', borderRadius: 99,
                      transitionDelay: ready ? (i * 0.06) + 's' : '0s',
                      backgroundImage: emAndamento ? 'repeating-linear-gradient(45deg, rgba(255,255,255,.28) 0 7px, transparent 7px 14px), ' + cor : cor,
                      backgroundSize: emAndamento ? '28px 28px, 100% 100%' : '100% 100%',
                      backgroundRepeat: emAndamento ? 'repeat, no-repeat' : 'no-repeat',
                      animation: emAndamento ? 'smStripe 1.2s linear infinite' : undefined,
                    }}
                  >
                    {pos === 0 && v > 0 && <span className="sm-shine" />}
                  </div>
                </div>
              </div>

              {ehAberto && !sem && (
                <div className="sm-up" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '2px 6px 14px 38px' }}>
                  <div style={{ ...tile, flex: '1 1 140px' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 700 }}>Mentoria</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{num(m.mentoria.n)} vendas</div>
                    <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{brl(m.mentoria.v)}</div>
                  </div>
                  <div style={{ ...tile, flex: '1 1 140px' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 700 }}>Estrutura Express</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{num(m.express.n)} vendas</div>
                    <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{brl(m.express.v)}</div>
                  </div>
                  <div style={{ ...tile, flex: '1 1 140px' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 700 }}>Venda média</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{brl(ticket)}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{totalFat > 0 ? Math.round((Number(m.fat) / totalFat) * 100) : 0}% do ano</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, lineHeight: 1.5 }}>
        Toque em um mês para ver o detalhe. O valor é o preço dos produtos (sem juros do parcelamento) e se atualiza sozinho a cada venda nova da Hubla e da Cakto.
        {data.reembolsadas > 0 ? ' Vendas reembolsadas não entram na conta (' + num(data.reembolsadas) + ').' : ''}
      </div>
    </div>
  )
}
