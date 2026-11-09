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

  return (
    <div
      onClick={function() { setAberto(false) }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,30,0.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'paFade .3s ease' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Automatize suas vendas por meio do anúncio"
        onClick={function(e) { e.stopPropagation() }}
        style={{ position: 'relative', width: '100%', maxWidth: 440, maxHeight: '94vh', overflowY: 'auto', background: 'var(--surface, #fff)', borderRadius: 24, padding: '26px 20px 20px', boxShadow: '0 24px 70px rgba(0,0,0,0.45)', animation: 'paPop .35s cubic-bezier(.2,.9,.3,1.2)', textAlign: 'center' }}
      >
        <button
          type="button"
          onClick={function() { setAberto(false) }}
          aria-label="Fechar"
          style={{ position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: '50%', border: 0, background: 'var(--surface2, #f1f1f6)', color: 'var(--muted, #666)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}
        >✕</button>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: 'var(--accent-light, #eceaff)', color: 'var(--accent, #4b3fe8)', fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
          <i className="ti ti-brand-meta" /> Nova aula
        </div>

        <h2 style={{ margin: '0 8px 16px', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, lineHeight: 1.2, color: 'var(--text, #14122b)' }}>
          Automatize suas vendas por meio do anúncio
        </h2>

        {/* Mockup: janela de computador com a capa da aula */}
        <div style={{ margin: '0 auto 18px', maxWidth: 380 }}>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border, #e3e3ee)', boxShadow: '0 14px 34px rgba(60,50,160,0.28)', background: '#1f1b4d' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', background: '#2a2566' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
              <span style={{ flex: 1, marginLeft: 8, height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 9, lineHeight: '14px', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>Gerenciando seus anúncios</span>
            </div>
            <button
              type="button"
              onClick={assistir}
              aria-label="Assistir a aula"
              style={{ position: 'relative', display: 'block', width: '100%', border: 0, padding: 0, cursor: 'pointer', background: capa ? 'url(' + capa + ') center / cover no-repeat' : 'linear-gradient(135deg,#4b3fe8,#5b4ef8,#8b6dfa)' }}
            >
              <span style={{ display: 'block', paddingTop: '56.25%' }} />
              <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.5) 100%)' }} />
              <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 62, height: 62, borderRadius: '50%', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 22px rgba(0,0,0,0.4)', animation: 'paPulse 1.8s ease-in-out infinite' }}>
                <span style={{ width: 0, height: 0, marginLeft: 5, borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderLeft: '19px solid #4b3fe8' }} />
              </span>
              <span style={{ position: 'absolute', left: 12, right: 12, bottom: 9, textAlign: 'left', color: '#fff', fontWeight: 800, fontSize: 12, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>Conhecendo o Gerenciador de Anúncios</span>
            </button>
          </div>
          <div style={{ height: 8, margin: '0 auto', width: '38%', background: '#2a2566', borderRadius: '0 0 10px 10px', opacity: 0.55 }} />
        </div>

        <button
          type="button"
          onClick={assistir}
          style={{ width: '100%', padding: '15px 18px', border: 0, borderRadius: 14, cursor: 'pointer', background: 'linear-gradient(135deg,#4b3fe8,#6d5ffb)', color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'inherit', boxShadow: '0 8px 22px rgba(75,63,232,0.4)' }}
        >
          ▶ Assistir aula
        </button>
        <button
          type="button"
          onClick={function() { setAberto(false) }}
          style={{ marginTop: 8, padding: '10px 14px', border: 0, background: 'transparent', color: 'var(--muted2, #888)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Agora não
        </button>
      </div>
      <style>{'@keyframes paFade{from{opacity:0}to{opacity:1}}@keyframes paPop{from{opacity:0;transform:scale(.92) translateY(14px)}to{opacity:1;transform:none}}@keyframes paPulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.08)}}'}</style>
    </div>
  )
}
