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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {[
            { icon: '📱', label: 'Como criar anuncios que convertem' },
            { icon: '🎯', label: 'Estrategias de trafego pago' },
            { icon: '💰', label: 'Como escalar suas vendas' },
            { icon: '🤖', label: 'Usando IA para vender mais' },
          ].map(function(item) {
            return (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{item.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--amber)', background: 'var(--amber-light)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 99, padding: '2px 10px' }}>Em breve</span>
              </div>
            )
          })}
        </div>
        <a
          href={'https://wa.me/5537999521440?text=Quero saber sobre as aulas ao vivo do MCP.IA'}
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
