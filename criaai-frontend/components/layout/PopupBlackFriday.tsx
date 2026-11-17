'use client'
// Pop-up da Black Friday da Estrutura Express 2.0: aparece no primeiro acesso de cada dia (por aluno, neste navegador),
// com o botao para entrar no grupo do WhatsApp. Substitui o pop-up da aula de anuncios (components/layout/PopupAnuncios.tsx).
import { useEffect, useState } from 'react'
import BlackFridayExpress from '@/components/BlackFridayExpress'

function numeroDoDia(ms: number) {
  const d = new Date(ms)
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000)
}

export default function PopupBlackFriday({ user }: { user: any }) {
  const [aberto, setAberto] = useState(false)
  const chave = 'mcpia_popup_bf_express_' + (user && user.id ? user.id : 'anon')

  useEffect(function() {
    try {
      const ultimo = Number(localStorage.getItem(chave) || 0)
      if (ultimo && numeroDoDia(Date.now()) === numeroDoDia(ultimo)) return
    } catch (e) { /* sem armazenamento: mostra mesmo assim */ }
    const t = setTimeout(function() {
      setAberto(true)
      try { localStorage.setItem(chave, String(Date.now())) } catch (e) { /* ignora */ }
    }, 1500)
    return function() { clearTimeout(t) }
  }, [chave])

  useEffect(function() {
    if (!aberto) return
    function tecla(e: KeyboardEvent) { if (e.key === 'Escape') setAberto(false) }
    window.addEventListener('keydown', tecla)
    return function() { window.removeEventListener('keydown', tecla) }
  }, [aberto])

  if (!aberto) return null
  return (
    <div className="pbf-fundo" onClick={function() { setAberto(false) }}>
      <div className="pbf-card" role="dialog" aria-modal="true" aria-label="Black Friday da Estrutura Express 2.0" onClick={function(e) { e.stopPropagation() }}>
        <button type="button" className="pbf-fechar" onClick={function() { setAberto(false) }} aria-label="Fechar"><i className="ti ti-x" /></button>
        <BlackFridayExpress modo="popup" onEntrar={function() { setAberto(false) }} />
        <button type="button" className="pbf-depois" onClick={function() { setAberto(false) }}>Agora não</button>
      </div>
      <style>{`
        .pbf-fundo { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(6,3,14,.8); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: pbfFade .3s ease-out; }
        .pbf-card { position: relative; width: 100%; max-width: 460px; max-height: 94vh; overflow-y: auto; border-radius: 26px; background: #0a0612; box-shadow: 0 30px 80px rgba(255,61,127,.35); animation: pbfPop .5s cubic-bezier(.16,1,.3,1); text-align: center; }
        .pbf-fechar { position: absolute; top: 12px; right: 12px; z-index: 3; width: 36px; height: 36px; border-radius: 50%; border: 0; cursor: pointer; background: rgba(255,255,255,.16); color: #fff; font-size: 18px; display: flex; align-items: center; justify-content: center; }
        .pbf-depois { margin: 2px 0 10px; padding: 10px 14px; border: 0; background: transparent; color: rgba(255,255,255,.6); font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; }
        @keyframes pbfFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pbfPop { from { opacity: 0; transform: translateY(24px) scale(.94) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .pbf-fundo, .pbf-card { animation: none !important } }
      `}</style>
    </div>
  )
}
