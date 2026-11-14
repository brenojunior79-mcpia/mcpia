'use client'
// Pop-up "Automatize suas vendas por meio do anuncio": mostra a capa da aula do Gerenciador de Anuncios e o botao "Assistir aula",
// que leva para a tela "Gerenciando seus anuncios" (a aula fica no topo). So aparece para quem ja tem mais de 7 dias de cadastro.
// Aparece todos os dias, no primeiro acesso do dia (por aluno, neste navegador) e para de aparecer quando a pessoa toca em "Assistir aula".
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const DIAS_DEPOIS_DO_CADASTRO = 7
const VOLTA_A_CADA_DIAS = 1
const VIDEO_URL = 'https://vimeo.com/1244797172'
const DESTINO = '/dashboard/anuncios'

function numeroDoDia(ms: number) {
  const d = new Date(ms)
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000)
}

export default function PopupAnuncios({ profile, user }: { profile: any; user: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [capa, setCapa] = useState('')

  const criadoEm = profile && profile.created_at ? new Date(profile.created_at).getTime() : 0
  const elegivel = criadoEm > 0 && (Date.now() - criadoEm) >= DIAS_DEPOIS_DO_CADASTRO * 24 * 60 * 60 * 1000
  const chave = 'mcpia_popup_anuncios_' + (user && user.id ? user.id : 'anon')

  useEffect(function() {
    if (!elegivel) return
    // nao mostra dentro da propria tela da aula
    if (pathname && pathname.indexOf(DESTINO) === 0) return
    try {
      const raw = localStorage.getItem(chave)
      const s = raw ? JSON.parse(raw) : null
      if (s && s.feito) return
      if (s && s.ultimo && numeroDoDia(Date.now()) - numeroDoDia(Number(s.ultimo)) < VOLTA_A_CADA_DIAS) return
    } catch (e) { /* sem armazenamento: mostra mesmo assim */ }
    const t = setTimeout(function() {
      setAberto(true)
      try { localStorage.setItem(chave, JSON.stringify({ ultimo: Date.now() })) } catch (e) { /* ignora */ }
    }, 2000)
    return function() { clearTimeout(t) }
  }, [elegivel, pathname, chave])

  // capa da aula (a mesma imagem do Vimeo usada na tela da aula)
  useEffect(function() {
    if (!aberto || capa) return
    let vivo = true
    fetch('https://vimeo.com/api/oembed.json?width=960&url=' + encodeURIComponent(VIDEO_URL))
      .then(function(r) { return r.ok ? r.json() : null })
      .then(function(j) { if (vivo && j && j.thumbnail_url) setCapa(String(j.thumbnail_url)) })
      .catch(function() { /* sem capa: fica o fundo colorido */ })
    return function() { vivo = false }
  }, [aberto, capa])

  useEffect(function() {
    if (!aberto) return
    function tecla(e: KeyboardEvent) { if (e.key === 'Escape') setAberto(false) }
    window.addEventListener('keydown', tecla)
    return function() { window.removeEventListener('keydown', tecla) }
  }, [aberto])

  function assistir() {
    try { localStorage.setItem(chave, JSON.stringify({ ultimo: Date.now(), feito: true })) } catch (e) { /* ignora */ }
    setAberto(false)
    router.push(DESTINO)
  }

  if (!aberto) return null

  const beneficios: { i: string; t: string }[] = [
    { i: 'chart-line', t: 'Veja os resultados de hoje' },
    { i: 'player-play', t: 'Pause ou ative campanhas' },
    { i: 'rocket', t: 'Aumente o orçamento com segurança' },
  ]

  return (
    <div className="pa2-fundo" onClick={function() { setAberto(false) }}>
      <div className="pa2-card" role="dialog" aria-modal="true" aria-labelledby="pa2-titulo" onClick={function(e) { e.stopPropagation() }}>
        <button type="button" className="pa2-fechar" onClick={function() { setAberto(false) }} aria-label="Fechar"><i className="ti ti-x" /></button>

        <div className="pa2-topo">
          <span className="pa2-brilho" aria-hidden="true" />
          <div className="pa2-selo"><span className="pa2-ponto" />Aula nova liberada</div>
          <div className="pa2-meta" aria-hidden="true"><i className="ti ti-brand-meta" /></div>
          <h2 id="pa2-titulo" className="pa2-titulo">Automatize suas vendas por meio do anúncio</h2>
          <p className="pa2-sub">Aprenda a acompanhar e ajustar seus anúncios do Facebook aqui mesmo, na plataforma.</p>
        </div>

        <div className="pa2-corpo">
          <button type="button" className="pa2-video" onClick={assistir} aria-label="Assistir a aula" style={{ backgroundImage: capa ? 'url(' + capa + ')' : undefined }}>
            <span className="pa2-video-escuro" />
            <span className="pa2-play-onda" aria-hidden="true" />
            <span className="pa2-play"><i className="ti ti-player-play" /></span>
            <span className="pa2-video-nome">Conhecendo o Gerenciador de Anúncios</span>
          </button>

          <ul className="pa2-lista">
            {beneficios.map(function(b) {
              return <li key={b.t}><span className="pa2-ico"><i className={'ti ti-' + b.i} /></span>{b.t}</li>
            })}
          </ul>

          <button type="button" className="pa2-cta" onClick={assistir}>
            <span className="pa2-cta-luz" aria-hidden="true" />
            <i className="ti ti-player-play" />Assistir a aula agora<i className="ti ti-arrow-right" />
          </button>
          <button type="button" className="pa2-depois" onClick={function() { setAberto(false) }}>Agora não</button>
        </div>
      </div>
      <style>{`
        .pa2-fundo { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(8,6,28,0.78); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: pa2Fade .3s ease-out; }
        .pa2-card { position: relative; width: 100%; max-width: 460px; max-height: 94vh; overflow-y: auto; border-radius: 26px; background: var(--surface, #fff); box-shadow: 0 30px 80px rgba(20,10,80,0.55); animation: pa2Pop .5s cubic-bezier(.16,1,.3,1); text-align: center; }
        .pa2-fechar { position: absolute; top: 12px; right: 12px; z-index: 3; width: 36px; height: 36px; border-radius: 50%; border: 0; cursor: pointer; background: rgba(255,255,255,0.18); color: #fff; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: background .15s; }
        .pa2-fechar:hover { background: rgba(255,255,255,0.3); }
        .pa2-topo { position: relative; overflow: hidden; padding: 28px 24px 70px; color: #fff; background: radial-gradient(120% 90% at 15% 0%, #8b6dfa 0%, transparent 55%), radial-gradient(90% 80% at 100% 20%, #0866ff 0%, transparent 60%), linear-gradient(160deg, #3b2fd6 0%, #1e1a6b 100%); }
        .pa2-brilho { position: absolute; inset: -40% -20% auto; height: 160%; background: conic-gradient(from 0deg, transparent 0 70%, rgba(255,255,255,0.18) 80%, transparent 90%); animation: pa2Gira 9s linear infinite; pointer-events: none; }
        .pa2-selo { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 6px 13px; border-radius: 99px; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.28); font-size: 12.5px; font-weight: 800; }
        .pa2-ponto { width: 8px; height: 8px; border-radius: 99px; background: #4ade80; box-shadow: 0 0 0 0 rgba(74,222,128,0.7); animation: pa2Ponto 1.6s ease-out infinite; }
        .pa2-meta { position: relative; width: 64px; height: 64px; margin: 18px auto 14px; border-radius: 20px; background: #fff; color: #0866ff; font-size: 38px; display: flex; align-items: center; justify-content: center; box-shadow: 0 12px 30px rgba(8,102,255,0.45); animation: pa2Flutua 3.2s ease-in-out infinite; }
        .pa2-titulo { position: relative; margin: 0 auto 8px; max-width: 360px; font-family: Syne, sans-serif; font-weight: 800; font-size: 26px; line-height: 1.15; letter-spacing: -0.02em; text-wrap: balance; }
        .pa2-sub { position: relative; margin: 0 auto; max-width: 340px; font-size: 14.5px; line-height: 1.5; color: rgba(255,255,255,0.86); text-wrap: balance; }
        .pa2-corpo { position: relative; padding: 0 22px 18px; margin-top: -52px; }
        .pa2-video { position: relative; display: block; width: 100%; aspect-ratio: 16 / 9; border: 0; padding: 0; cursor: pointer; border-radius: 16px; overflow: hidden; background: #1e1a6b center / cover no-repeat; box-shadow: 0 16px 36px rgba(30,26,107,0.45); outline: 3px solid var(--surface, #fff); transition: transform .2s ease; }
        .pa2-video:hover { transform: translateY(-2px); }
        .pa2-video-escuro { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.62) 100%); }
        .pa2-play-onda { position: absolute; left: 50%; top: 50%; width: 66px; height: 66px; margin: -33px 0 0 -33px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.8); animation: pa2Onda 1.8s ease-out infinite; }
        .pa2-play { position: absolute; left: 50%; top: 50%; width: 66px; height: 66px; margin: -33px 0 0 -33px; border-radius: 50%; background: #fff; color: #3b2fd6; font-size: 30px; display: flex; align-items: center; justify-content: center; padding-left: 4px; box-sizing: border-box; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .pa2-video-nome { position: absolute; left: 14px; right: 14px; bottom: 11px; text-align: left; color: #fff; font-weight: 800; font-size: 13.5px; text-shadow: 0 1px 6px rgba(0,0,0,0.7); }
        .pa2-lista { list-style: none; margin: 18px 0 18px; padding: 0; display: grid; gap: 8px; text-align: left; }
        .pa2-lista li { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; background: var(--surface2, #f3f2fa); color: var(--text, #14122b); font-size: 14.5px; font-weight: 700; opacity: 0; animation: pa2Entra .45s cubic-bezier(.16,1,.3,1) forwards; }
        .pa2-lista li:nth-child(1) { animation-delay: .25s; } .pa2-lista li:nth-child(2) { animation-delay: .35s; } .pa2-lista li:nth-child(3) { animation-delay: .45s; }
        .pa2-ico { width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px; background: rgba(8,102,255,0.12); color: #0866ff; font-size: 19px; display: flex; align-items: center; justify-content: center; }
        .pa2-cta { position: relative; overflow: hidden; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 17px 18px; border: 0; border-radius: 16px; cursor: pointer; background: linear-gradient(135deg, #0866ff, #4b3fe8); color: #fff; font-family: inherit; font-weight: 800; font-size: 17px; box-shadow: 0 10px 26px rgba(8,102,255,0.45); transition: transform .15s ease, box-shadow .15s ease; animation: pa2Chama 2.4s ease-in-out 1.2s infinite; }
        .pa2-cta:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(8,102,255,0.55); }
        .pa2-cta .ti { font-size: 20px; }
        .pa2-cta-luz { position: absolute; top: 0; bottom: 0; left: -40%; width: 30%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent); transform: skewX(-20deg); animation: pa2Luz 2.6s ease-in-out .8s infinite; }
        .pa2-depois { margin-top: 8px; padding: 10px 14px; border: 0; background: transparent; color: var(--muted2, #777); font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .pa2-depois:hover { color: var(--text, #14122b); }
        .pa2-fechar:focus-visible, .pa2-video:focus-visible, .pa2-cta:focus-visible, .pa2-depois:focus-visible { outline: 3px solid #0866ff; outline-offset: 3px; }
        @keyframes pa2Fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pa2Pop { from { opacity: 0; transform: translateY(24px) scale(.94) } to { opacity: 1; transform: none } }
        @keyframes pa2Gira { to { transform: rotate(360deg) } }
        @keyframes pa2Ponto { 0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.7) } 100% { box-shadow: 0 0 0 10px rgba(74,222,128,0) } }
        @keyframes pa2Flutua { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes pa2Onda { 0% { transform: scale(1); opacity: .9 } 100% { transform: scale(1.7); opacity: 0 } }
        @keyframes pa2Entra { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        @keyframes pa2Luz { 0% { left: -40% } 60%,100% { left: 130% } }
        @keyframes pa2Chama { 0%,100% { transform: scale(1) } 50% { transform: scale(1.025) } }
        @media (max-width: 420px) { .pa2-titulo { font-size: 23px; } .pa2-topo { padding: 24px 18px 64px; } .pa2-corpo { padding: 0 16px 14px; } }
        @media (prefers-reduced-motion: reduce) { .pa2-fundo, .pa2-card, .pa2-brilho, .pa2-ponto, .pa2-meta, .pa2-play-onda, .pa2-lista li, .pa2-cta, .pa2-cta-luz { animation: none !important; } .pa2-lista li { opacity: 1; } }
      `}</style>
    </div>
  )
}
