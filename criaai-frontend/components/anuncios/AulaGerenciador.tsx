'use client'
// Aula "Conhecendo o Gerenciador de Anuncios" (Vimeo). Aparece no topo da tela "Gerenciando seus anuncios" (antes de conectar o Facebook)
// e tambem para quem ainda nao tem o plano Pro ou Premium.
// Mostra primeiro uma imagem da aula com o botao de play (em vez de uma tela preta); o video so carrega quando a pessoa toca.
import { useEffect, useState } from 'react'

const VIDEO_ID = '1244797172'
const URL_VIDEO = 'https://vimeo.com/' + VIDEO_ID

export default function AulaGerenciador({ titulo, recolhivel }: { titulo?: string; recolhivel?: boolean }) {
  const [thumb, setThumb] = useState('')
  const [tocando, setTocando] = useState(false)

  // Pega a imagem de capa da aula no proprio Vimeo (se nao conseguir, mostra um fundo colorido com o play)
  useEffect(function() {
    let vivo = true
    fetch('https://vimeo.com/api/oembed.json?width=960&url=' + encodeURIComponent(URL_VIDEO))
      .then(function(r) { return r.ok ? r.json() : null })
      .then(function(j) { if (vivo && j && j.thumbnail_url) setThumb(String(j.thumbnail_url)) })
      .catch(function() { /* sem imagem: fica o fundo colorido */ })
    return function() { vivo = false }
  }, [])

  const player = (
    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 14, overflow: 'hidden', background: '#1f1b4d' }}>
      {tocando ? (
        <iframe
          src={'https://player.vimeo.com/video/' + VIDEO_ID + '?title=0&byline=0&portrait=0&dnt=1&autoplay=1'}
          title="Aula: conhecendo o Gerenciador de Anúncios"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      ) : (
        <button
          type="button"
          onClick={function() { setTocando(true) }}
          aria-label="Assistir a aula"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, padding: 0, cursor: 'pointer',
            background: thumb ? 'url(' + thumb + ') center / cover no-repeat' : 'linear-gradient(135deg,#4b3fe8,#5b4ef8,#8b6dfa)',
          }}
        >
          <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.45) 100%)' }} />
          <span style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 74, height: 74, borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
          }}>
            <span style={{ width: 0, height: 0, marginLeft: 6, borderTop: '14px solid transparent', borderBottom: '14px solid transparent', borderLeft: '22px solid #4b3fe8' }} />
          </span>
          <span style={{ position: 'absolute', left: 14, right: 14, bottom: 12, textAlign: 'left', color: '#fff', fontWeight: 800, fontSize: 14, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
            ▶ Toque para assistir à aula
          </span>
        </button>
      )}
    </div>
  )
  const cabeca = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-light)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}><i className="ti ti-player-play" /></span>
      <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, lineHeight: 1.25, color: 'var(--text)', textAlign: 'left' }}>{titulo || 'Aula: conhecendo o Gerenciador de Anúncios'}</span>
    </div>
  )
  const caixa: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 16px 18px', boxShadow: 'var(--shadow-sm)' }

  if (recolhivel) {
    return (
      <details style={caixa}>
        <summary style={{ cursor: 'pointer', listStyle: 'none' }}>{cabeca}<div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 4, marginLeft: 44 }}>Toque para rever a aula</div></summary>
        <div style={{ marginTop: 12 }}>{player}</div>
      </details>
    )
  }
  return (
    <div style={caixa}>
      <div style={{ marginBottom: 12 }}>{cabeca}</div>
      {player}
    </div>
  )
}
