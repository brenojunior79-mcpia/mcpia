'use client'

export default function AulasPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #5b4ef8, #9b8ffc)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36 }}>🎬</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>Aulas ao Vivo</h1>
        <p style={{ fontSize: 15, color: 'var(--muted2)', lineHeight: 1.7, marginBottom: 28 }}>
          Em breve voce tera acesso a aulas ao vivo com especialistas em marketing digital, trafego pago e vendas de produtos digitais.
        </p>
        <a
          href="https://chat.whatsapp.com/EQOJkJWilLjES81OIl6UWg"
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 12, textDecoration: 'none' }}
        >
          <i className="ti ti-brand-whatsapp" style={{ fontSize: 18 }} />
          Avisar quando lancar
        </a>
      </div>
    </div>
  )
}
