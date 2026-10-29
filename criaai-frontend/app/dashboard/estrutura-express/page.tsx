'use client'
import { useEffect, useRef, useState } from 'react'

type Aula = { id: string; ordem: number; titulo: string; descricao: string | null; video_id: string; material_label: string | null; material_url: string | null; material_aviso: string | null }
type Liberado = { email: string; nota: string | null; created_at: string; liberado_por?: string | null }
type Thumb = { img: string; dur: number }

const LINK_COMPRA = 'https://pay.hub.la/EzX4EkF4HSfNfHn2QH4z'
const KEY_FEITAS = 'ee_aulas_feitas_v1'

// Registra para o admin quem viu a tela de venda e quem clicou no botao de compra
function registrar(tipo: 'visita' | 'clique') {
  try { fetch('/api/estrutura/clique', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo }), keepalive: true }).catch(function() {}) } catch (e) {}
}

function fmtDur(s: number): string {
  const m = Math.floor(s / 60)
  const r = Math.round(s % 60)
  return m + ':' + (r < 10 ? '0' : '') + r
}

const CSS = `
@keyframes eeUp { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
@keyframes eeIn { from { opacity: 0; transform: translateX(22px) } to { opacity: 1; transform: translateX(0) } }
@keyframes eeFloat { 0%,100% { transform: translateY(0) rotate(-4deg) } 50% { transform: translateY(-9px) rotate(4deg) } }
@keyframes eeShine { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }
@keyframes eePulse { 0% { box-shadow: 0 0 0 0 rgba(249,115,22,0.55) } 70% { box-shadow: 0 0 0 16px rgba(249,115,22,0) } 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0) } }
@keyframes eePop { 0% { transform: scale(0.4) } 60% { transform: scale(1.25) } 100% { transform: scale(1) } }
@keyframes eeGrow { from { width: 0 } }
@keyframes eeGlow { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
@keyframes eeBurst { 0% { opacity: 1; transform: translate(0,0) scale(1) } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(.4) } }
@keyframes eeSpin { to { transform: rotate(360deg) } }
.ee-up { animation: eeUp .6s cubic-bezier(.2,.8,.2,1) both }
.ee-in { animation: eeIn .55s cubic-bezier(.2,.8,.2,1) both }
.ee-float { animation: eeFloat 3.6s ease-in-out infinite }
.ee-hero { background: linear-gradient(120deg,#0f172a,#1e1b4b 35%,#7c2d12 70%,#0f172a); background-size: 200% 200%; animation: eeShine 9s linear infinite alternate }
.ee-orb { position: absolute; border-radius: 50%; filter: blur(40px); animation: eeGlow 4s ease-in-out infinite }
.ee-cta { animation: eePulse 2s infinite; transition: transform .18s ease, filter .18s ease }
.ee-cta:hover { transform: translateY(-2px) scale(1.03); filter: brightness(1.08) }
.ee-card { transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease }
.ee-card:hover { transform: translateY(-4px); box-shadow: 0 14px 34px rgba(0,0,0,.18) }
.ee-item { transition: transform .18s ease, background .18s ease, border-color .18s ease }
.ee-item:hover { transform: translateX(4px) }
.ee-play { transition: transform .2s ease }
.ee-poster:hover .ee-play { transform: scale(1.12) }
.ee-pop { animation: eePop .45s cubic-bezier(.2,.8,.2,1) both }
.ee-btn { transition: transform .15s ease, filter .15s ease }
.ee-btn:hover { transform: translateY(-2px); filter: brightness(1.08) }
.ee-burst { position: absolute; width: 8px; height: 8px; border-radius: 50%; pointer-events: none; animation: eeBurst .8s ease-out forwards }
@media (prefers-reduced-motion: reduce) { .ee-up,.ee-in,.ee-float,.ee-hero,.ee-orb,.ee-cta,.ee-pop,.ee-burst { animation: none !important } }
.ee-grid { display: grid; grid-template-columns: minmax(0,1.7fr) minmax(280px,1fr); gap: 20px; align-items: start }
@media (max-width: 900px) { .ee-grid { grid-template-columns: 1fr } }
`

export default function EstruturaExpressPage() {
  const [estado, setEstado] = useState<'carregando' | 'bloqueado' | 'liberado' | 'erro'>('carregando')
  const [aulas, setAulas] = useState<Aula[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [podeLiberar, setPodeLiberar] = useState(false)
  const [liberados, setLiberados] = useState<Liberado[]>([])
  const [atual, setAtual] = useState(0)
  const [tocando, setTocando] = useState<string | null>(null)
  const [feitas, setFeitas] = useState<Record<string, boolean>>({})
  const [thumbs, setThumbs] = useState<Record<string, Thumb>>({})
  const [burst, setBurst] = useState(0)
  const [novoEmail, setNovoEmail] = useState('')
  const [novaNota, setNovaNota] = useState('')
  const [adminMsg, setAdminMsg] = useState('')
  const playerRef = useRef<HTMLDivElement>(null)
  const [totalAlunos, setTotalAlunos] = useState(0)
  const [exibido, setExibido] = useState(0)
  const [restante, setRestante] = useState('')

  useEffect(function() {
    try { const s = localStorage.getItem(KEY_FEITAS); if (s) setFeitas(JSON.parse(s)) } catch (e) {}
    fetch('/api/estrutura', { cache: 'no-store' })
      .then(function(r) { return r.json() })
      .then(function(j) {
        if (j && j.acesso) {
          setAulas(j.aulas || []); setIsAdmin(!!j.isAdmin); setPodeLiberar(!!j.podeLiberar || !!j.isAdmin); setLiberados(j.liberados || [])
          // Admin pode ver como o aluno sem acesso enxerga: /dashboard/estrutura-express?bloqueado=1
          let previa = false
          try { previa = !!j.isAdmin && new URLSearchParams(window.location.search).get('bloqueado') === '1' } catch (e) {}
          setEstado(previa ? 'bloqueado' : 'liberado')
        } else if (j && j.acesso === false) { setEstado('bloqueado'); registrar('visita') }
        else setEstado('erro')
      })
      .catch(function() { setEstado('erro') })
  }, [])

  // Tela de venda: numero real de alunos (atualiza sozinho a cada minuto) e contagem ate a meia-noite
  useEffect(function() {
    if (estado !== 'bloqueado') return
    let vivo = true
    const buscar = function() {
      fetch('/api/estrutura/total', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) { if (vivo && j && typeof j.total === 'number') setTotalAlunos(j.total) }).catch(function() {})
    }
    buscar()
    const iv = setInterval(buscar, 60000)
    const tick = function() {
      // meia-noite de Sao Paulo (UTC-3, sem horario de verao)
      const local = Date.now() - 3 * 3600 * 1000
      const falta = 86400000 - (local % 86400000)
      const h = Math.floor(falta / 3600000), m = Math.floor((falta % 3600000) / 60000), sg = Math.floor((falta % 60000) / 1000)
      setRestante(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sg).padStart(2, '0'))
    }
    tick()
    const tk = setInterval(tick, 1000)
    return function() { vivo = false; clearInterval(iv); clearInterval(tk) }
  }, [estado])

  // O numero sobe contando ate o valor real
  useEffect(function() {
    if (exibido === totalAlunos) return
    const passo = Math.max(1, Math.ceil(Math.abs(totalAlunos - exibido) / 25))
    const t = setTimeout(function() { setExibido(function(v) { return v < totalAlunos ? Math.min(totalAlunos, v + passo) : Math.max(totalAlunos, v - passo) }) }, 30)
    return function() { clearTimeout(t) }
  }, [exibido, totalAlunos])

  // Capas e duracao dos videos (Vimeo)
  useEffect(function() {
    aulas.forEach(function(a) {
      fetch('https://vimeo.com/api/oembed.json?width=640&url=' + encodeURIComponent('https://vimeo.com/' + a.video_id))
        .then(function(r) { return r.json() })
        .then(function(j) {
          if (j && j.thumbnail_url) setThumbs(function(t) { return { ...t, [a.video_id]: { img: String(j.thumbnail_url), dur: Number(j.duration) || 0 } } })
        })
        .catch(function() {})
    })
  }, [aulas])

  function alternarFeita(id: string) {
    const novo = { ...feitas }
    if (novo[id]) delete novo[id]; else { novo[id] = true; setBurst(function(b) { return b + 1 }) }
    setFeitas(novo)
    try { localStorage.setItem(KEY_FEITAS, JSON.stringify(novo)) } catch (e) {}
  }

  function irPara(i: number) {
    if (i < 0 || i >= aulas.length) return
    setAtual(i); setTocando(null)
    if (playerRef.current && window.innerWidth < 900) playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function liberar() {
    setAdminMsg('')
    const r = await fetch('/api/estrutura/liberar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: novoEmail, nota: novaNota }) })
    const j = await r.json().catch(function() { return {} })
    if (!r.ok) { setAdminMsg('⚠ ' + (j.error || 'Não foi possível liberar.')); return }
    setLiberados(function(l) { return [{ email: novoEmail.trim().toLowerCase(), nota: novaNota.trim() || null, created_at: new Date().toISOString() }].concat(l.filter(function(x) { return x.email !== novoEmail.trim().toLowerCase() })) })
    setNovoEmail(''); setNovaNota(''); setAdminMsg('✓ Aluno liberado.')
  }
  async function desliberar(email: string) {
    if (!window.confirm('Tirar a liberação de ' + email + '?')) return
    const r = await fetch('/api/estrutura/liberar?email=' + encodeURIComponent(email), { method: 'DELETE' })
    if (r.ok) setLiberados(function(l) { return l.filter(function(x) { return x.email !== email }) })
  }

  const wrap: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '24px 20px 60px' }

  if (estado === 'carregando') {
    return (
      <div style={wrap}><style>{CSS}</style>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', border: '4px solid rgba(249,115,22,0.25)', borderTopColor: '#f97316', animation: 'eeSpin .8s linear infinite' }} />
        </div>
      </div>
    )
  }
  if (estado === 'erro') {
    return <div style={wrap}><div style={{ maxWidth: 700, margin: '40px auto', textAlign: 'center', color: 'var(--muted2)' }}>Não foi possível abrir agora. Atualize a página e tente de novo.</div></div>
  }

  // ---------- Quem ainda nao comprou ----------
  if (estado === 'bloqueado') {
    const recursos = [
      { i: '📦', t: 'Produto pronto', d: 'Produto digital completo, é só pegar e usar.' },
      { i: '🌐', t: 'Site pronto', d: 'A página de vendas já montada para você.' },
      { i: '🎬', t: 'Criativos prontos', d: 'Os vídeos e artes dos anúncios já feitos.' },
    ]
    const passos = ['Escolha o produto', 'Coloque o site no ar', 'Suba os anúncios e comece a vender']
    return (
      <div style={wrap}><style>{CSS}</style>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div className="ee-hero ee-up" style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '48px 28px', textAlign: 'center', color: '#fff' }}>
            <div className="ee-orb" style={{ width: 220, height: 220, background: '#f97316', top: -70, left: -50 }} />
            <div className="ee-orb" style={{ width: 240, height: 240, background: '#7c3aed', bottom: -90, right: -40, animationDelay: '1.5s' }} />
            <div className="ee-float" style={{ position: 'relative', fontSize: 58, marginBottom: 6 }}>⚡</div>
            <div style={{ position: 'relative', display: 'inline-block', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '5px 14px', fontSize: 12.5, fontWeight: 800, letterSpacing: 0.4, marginBottom: 14 }}>🔒 MENU EXCLUSIVO</div>
            <h1 style={{ position: 'relative', fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.1, color: '#fff' }}>Tenha tudo pronto</h1>
            <p style={{ position: 'relative', maxWidth: 640, margin: '0 auto 26px', fontSize: 'clamp(15px, 2.2vw, 18px)', lineHeight: 1.55, opacity: 0.95 }}>
              O seu <b>produto pronto</b>, o <b>site pronto</b> e os <b>criativos já prontos</b> pra você subir e começar a fazer <b style={{ color: '#fdba74' }}>R$ 200 por dia</b>.
            </p>
            <div style={{ position: 'relative', display: 'inline-block', background: 'rgba(34,197,94,0.20)', border: '1px solid rgba(74,222,128,0.55)', borderRadius: 14, padding: '8px 16px', fontSize: 14, fontWeight: 800, marginBottom: 20 }}>✅ Quem tem a Estrutura Express não precisa ter plano</div>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', margin: '0 auto 24px', maxWidth: 640 }}>
              <div style={{ flex: '1 1 220px', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 16, padding: '12px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, opacity: 0.85 }}>🔥 ALUNOS COM A ESTRUTURA EXPRESS</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 34, fontWeight: 800, lineHeight: 1.1, color: '#fdba74' }}>{exibido > 0 ? exibido.toLocaleString('pt-BR') : '...'}</div>
              </div>
              <div style={{ flex: '1 1 220px', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 16, padding: '12px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, opacity: 0.85 }}>⏳ OFERTA VÁLIDA ATÉ A MEIA-NOITE</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 34, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{restante || '--:--:--'}</div>
              </div>
            </div>
            <div className="ee-pop" style={{ position: 'relative', display: 'inline-block', background: 'linear-gradient(135deg,#16a34a,#22c55e)', borderRadius: 14, padding: '10px 20px', fontSize: 16, fontWeight: 800, marginBottom: 16, boxShadow: '0 8px 22px rgba(34,197,94,0.35)' }}>🎉 Você acabou de ganhar R$ 100 de desconto!</div>
            <div></div>
            <a href={LINK_COMPRA} target="_blank" rel="noopener noreferrer" onClick={function() { registrar('clique') }} className="ee-cta" style={{ position: 'relative', display: 'inline-block', background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 18, padding: '16px 34px', borderRadius: 14 }}>
              🚀 Quero a Estrutura Express
            </a>
            <div style={{ position: 'relative', marginTop: 12, fontSize: 12, opacity: 0.7 }}>Os resultados variam de pessoa para pessoa e dependem da sua dedicação.</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 22 }}>
            {recursos.map(function(r, i) {
              return (
                <div key={r.t} className="ee-card ee-up" style={{ animationDelay: (0.15 + i * 0.12) + 's', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '22px 20px' }}>
                  <div style={{ fontSize: 34, marginBottom: 8 }}>{r.i}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{r.t}</div>
                  <div style={{ fontSize: 14, color: 'var(--muted2)', lineHeight: 1.5 }}>{r.d}</div>
                </div>
              )
            })}
          </div>

          <div className="ee-up" style={{ animationDelay: '0.5s', marginTop: 22, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '22px 20px' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 14 }}>Como funciona</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
              {passos.map(function(p, i) {
                return (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{p}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 22, fontSize: 13.5, color: 'var(--muted2)' }}>
            Já comprou e não liberou? <a href="/dashboard/suporte" style={{ color: 'var(--accent)', fontWeight: 700 }}>Fale com o suporte</a>
          </div>
        </div>
      </div>
    )
  }

  // ---------- Quem tem acesso ----------
  const total = aulas.length
  const concluidas = aulas.filter(function(a) { return feitas[a.id] }).length
  const pct = total ? Math.round((concluidas / total) * 100) : 0
  const aula = aulas[atual]
  const th = aula ? thumbs[aula.video_id] : undefined

  return (
    <div style={wrap}><style>{CSS}</style>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        <div className="ee-hero ee-up" style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '28px 28px', color: '#fff', marginBottom: 20, border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 18px 50px rgba(124,45,18,0.30)' }}>
          <div className="ee-orb" style={{ width: 220, height: 220, background: '#f97316', top: -90, right: 30 }} />
          <div className="ee-orb" style={{ width: 200, height: 200, background: '#7c3aed', bottom: -100, left: 20, animationDelay: '1.2s' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div className="ee-float" style={{ width: 68, height: 68, borderRadius: 20, background: 'linear-gradient(135deg,#fbbf24,#f97316)', boxShadow: '0 10px 26px rgba(249,115,22,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, flexShrink: 0 }}>⚡</div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 999, padding: '3px 12px', fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6, marginBottom: 8 }}>✓ ACESSO LIBERADO</div>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(26px, 4.4vw, 36px)', fontWeight: 800, margin: 0, color: '#fff', lineHeight: 1.1 }}>Estrutura Express</h1>
              <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.88)', marginTop: 6, lineHeight: 1.5 }}>Produto pronto, site pronto e criativos prontos. Siga as aulas na ordem e coloque tudo no ar.</div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#bbf7d0', marginTop: 8 }}>✅ Com a Estrutura Express você não precisa ter plano.</div>
            </div>
            <div style={{ minWidth: 200, flex: '0 1 260px', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 18, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>Seu progresso · {concluidas} de {total} aulas</span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#fdba74' }}>{pct}%</span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.20)', overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#fde68a,#f97316)', transition: 'width .6s cubic-bezier(.2,.8,.2,1)', animation: 'eeGrow 1s ease-out' }} />
              </div>
              {pct === 100 && total > 0 && <div className="ee-pop" style={{ marginTop: 8, fontSize: 13, fontWeight: 800 }}>🎉 Parabéns! Você terminou todas as aulas.</div>}
            </div>
          </div>
        </div>

        {total === 0 && <div style={{ textAlign: 'center', color: 'var(--muted2)', padding: 40 }}>As aulas estão sendo preparadas. Volte em breve!</div>}

        {aula && (
          <div className="ee-grid">
            <div ref={playerRef} className="ee-up" style={{ animationDelay: '0.1s', minWidth: 0 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
                <div className="ee-poster" style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, background: 'linear-gradient(135deg,#1e1b4b,#7c2d12)' }}>
                  {tocando === aula.id ? (
                    <iframe key={aula.id} src={'https://player.vimeo.com/video/' + aula.video_id + '?title=0&byline=0&portrait=0&dnt=1&autoplay=1'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media" allowFullScreen title={aula.titulo} />
                  ) : (
                    <div onClick={function() { setTocando(aula.id) }} role="button" aria-label={'Assistir ' + aula.titulo} style={{ position: 'absolute', inset: 0, cursor: 'pointer', backgroundImage: th ? 'url(' + th.img + ')' : undefined, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.55))' }} />
                      <div className="ee-play ee-cta" style={{ position: 'relative', width: 78, height: 78, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, paddingLeft: 6 }}>▶</div>
                      <div style={{ position: 'absolute', left: 16, bottom: 12, right: 16, color: '#fff', fontWeight: 800, fontSize: 'clamp(14px, 2.4vw, 19px)', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>Aula {atual + 1} · {aula.titulo}</div>
                    </div>
                  )}
                </div>

                <div key={aula.id} className="ee-up" style={{ padding: '18px 20px 20px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#f97316', letterSpacing: 0.5 }}>AULA {atual + 1} DE {total}</div>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, margin: '4px 0 6px' }}>{aula.titulo}</h2>
                  {aula.descricao && <p style={{ margin: '0 0 14px', fontSize: 14.5, lineHeight: 1.55, color: 'var(--muted2)' }}>{aula.descricao}</p>}

                  {aula.material_url && (
                    <div style={{ background: 'rgba(249,115,22,0.09)', border: '1px solid rgba(249,115,22,0.35)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>📁 Material desta aula</div>
                      <a href={aula.material_url} target="_blank" rel="noopener noreferrer" className="ee-btn" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 14.5, padding: '11px 18px', borderRadius: 10 }}>{aula.material_label || 'Abrir material'} ↗</a>
                      {aula.material_aviso && <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: '#c2410c' }}>⚠ {aula.material_aviso}</div>}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <button onClick={function() { alternarFeita(aula.id) }} className="ee-btn" style={{ cursor: 'pointer', border: feitas[aula.id] ? '2px solid #16a34a' : '2px solid var(--border2)', background: feitas[aula.id] ? 'rgba(22,163,74,0.12)' : 'var(--surface2)', color: feitas[aula.id] ? '#15803d' : 'var(--text)', fontWeight: 800, fontSize: 14, padding: '10px 16px', borderRadius: 10 }}>
                        {feitas[aula.id] ? '✓ Aula concluída' : '☐ Marcar como concluída'}
                      </button>
                      {burst > 0 && feitas[aula.id] && [0, 1, 2, 3, 4, 5, 6, 7].map(function(k) {
                        const ang = (k / 8) * Math.PI * 2
                        return <span key={burst + '-' + k} className="ee-burst" style={{ left: 22, top: 18, background: ['#f59e0b', '#f97316', '#16a34a', '#7c3aed'][k % 4], ['--dx' as any]: Math.round(Math.cos(ang) * 46) + 'px', ['--dy' as any]: Math.round(Math.sin(ang) * 46) + 'px' }} />
                      })}
                    </div>
                    <div style={{ flex: 1 }} />
                    <button onClick={function() { irPara(atual - 1) }} disabled={atual === 0} className="ee-btn" style={{ cursor: atual === 0 ? 'default' : 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontWeight: 700, fontSize: 14, padding: '10px 14px', borderRadius: 10, opacity: atual === 0 ? 0.45 : 1 }}>← Anterior</button>
                    <button onClick={function() { irPara(atual + 1) }} disabled={atual >= total - 1} className="ee-btn" style={{ cursor: atual >= total - 1 ? 'default' : 'pointer', border: 0, background: '#1f7a5a', color: '#fff', fontWeight: 800, fontSize: 14, padding: '10px 16px', borderRadius: 10, opacity: atual >= total - 1 ? 0.45 : 1 }}>Próxima →</button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 12 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, padding: '6px 8px 10px' }}>📚 Aulas</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {aulas.map(function(a, i) {
                    const on = i === atual
                    const t = thumbs[a.video_id]
                    return (
                      <div key={a.id} onClick={function() { irPara(i) }} className="ee-item ee-in" style={{ animationDelay: (0.1 + i * 0.07) + 's', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, border: on ? '2px solid #f97316' : '2px solid transparent', background: on ? 'rgba(249,115,22,0.10)' : 'var(--surface2)' }}>
                        <div style={{ position: 'relative', width: 84, height: 48, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg,#1e1b4b,#7c2d12)', backgroundImage: t ? 'url(' + t.img + ')' : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                          <div style={{ position: 'absolute', left: 4, top: 4, width: 22, height: 22, borderRadius: '50%', background: feitas[a.id] ? '#16a34a' : 'rgba(0,0,0,0.62)', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {feitas[a.id] ? <span className="ee-pop">✓</span> : i + 1}
                          </div>
                          {t && t.dur > 0 && <div style={{ position: 'absolute', right: 3, bottom: 3, background: 'rgba(0,0,0,0.72)', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 4, padding: '0 4px' }}>{fmtDur(t.dur)}</div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.25, color: 'var(--text)' }}>{a.titulo}</div>
                          <div style={{ fontSize: 12, marginTop: 2, color: feitas[a.id] ? '#15803d' : on ? '#c2410c' : 'var(--muted2)', fontWeight: 700 }}>{feitas[a.id] ? 'Concluída' : on ? 'Assistindo agora' : a.material_url ? 'Tem material 📁' : 'Aula'}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {podeLiberar && (
          <div className="ee-up" style={{ animationDelay: '0.3s', marginTop: 26, background: 'var(--surface)', border: '1px dashed var(--border2)', borderRadius: 18, padding: '18px 18px' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, marginBottom: 4 }}>🔧 Equipe · Liberar aluno manualmente</div>
            <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 12 }}>Quem comprou a Estrutura Express é liberado automaticamente (pelo e-mail ou telefone da compra). Use aqui só quando alguém comprou com outro e-mail ou precisa de acesso por cortesia. O e-mail precisa ser o mesmo que o aluno usou para se cadastrar na plataforma.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={novoEmail} onChange={function(e) { setNovoEmail(e.target.value) }} placeholder="E-mail do aluno" style={{ flex: '2 1 220px', minWidth: 0, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14 }} />
              <input value={novaNota} onChange={function(e) { setNovaNota(e.target.value) }} placeholder="Observação (opcional)" style={{ flex: '1 1 160px', minWidth: 0, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14 }} />
              <button onClick={liberar} disabled={!novoEmail.trim()} className="ee-btn" style={{ cursor: novoEmail.trim() ? 'pointer' : 'default', border: 0, background: '#2563eb', color: '#fff', fontWeight: 800, fontSize: 14, padding: '10px 16px', borderRadius: 10, opacity: novoEmail.trim() ? 1 : 0.5 }}>Liberar</button>
            </div>
            {adminMsg && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: adminMsg.indexOf('⚠') === 0 ? '#b91c1c' : '#15803d' }}>{adminMsg}</div>}
            {liberados.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {liberados.map(function(l) {
                  return (
                    <div key={l.email} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', borderRadius: 10, padding: '8px 12px', fontSize: 13.5 }}>
                      <span style={{ fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.email}</span>
                      {l.nota && <span style={{ color: 'var(--muted2)' }}>{l.nota}</span>}
                      {l.liberado_por && <span style={{ color: 'var(--muted2)', fontSize: 12 }}>por {l.liberado_por}</span>}
                      {isAdmin && <button onClick={function() { desliberar(l.email) }} title="Tirar liberação" style={{ cursor: 'pointer', border: 0, background: 'transparent', color: '#b91c1c', fontWeight: 800, fontSize: 15 }}>✕</button>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
