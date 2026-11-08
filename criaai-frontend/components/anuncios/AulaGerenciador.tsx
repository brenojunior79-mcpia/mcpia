'use client'
// Aula "Conhecendo o Gerenciador de Anuncios" (Vimeo). Aparece no topo da tela "Gerenciando seus anuncios" (antes de conectar o Facebook)
// e tambem para quem ainda nao tem o plano Pro ou Premium.
const VIDEO_ID = '1244797172'

export default function AulaGerenciador({ titulo, recolhivel }: { titulo?: string; recolhivel?: boolean }) {
  const player = (
    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 14, overflow: 'hidden', background: '#000' }}>
      <iframe
        src={'https://player.vimeo.com/video/' + VIDEO_ID + '?title=0&byline=0&portrait=0&dnt=1'}
        title="Aula: conhecendo o Gerenciador de Anúncios"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
      />
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
