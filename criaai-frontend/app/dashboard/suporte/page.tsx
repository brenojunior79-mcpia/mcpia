'use client'

export default function SuportePage() {
  const WHATSAPP = '5537999521440'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #16a34a, #4ade80)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36 }}>🎧</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>Suporte Humano</h1>
        <p style={{ fontSize: 15, color: 'var(--muted2)', lineHeight: 1.7, marginBottom: 28 }}>
          Nossa equipe esta pronta para te ajudar! Fale diretamente com um especialista pelo WhatsApp e resolva suas duvidas rapidamente.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, textAlign: 'left' }}>
          {[
            { icon: '⚡', label: 'Resposta rapida', desc: 'Atendimento em horario comercial' },
            { icon: '🛠️', label: 'Suporte tecnico', desc: 'Problemas com a plataforma' },
            { icon: '💡', label: 'Duvidas gerais', desc: 'Como usar os recursos da IA' },
            { icon: '💳', label: 'Financeiro', desc: 'Planos, creditos e pagamentos' },
          ].map(function(item) {
            return (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{item.desc}</div>
                </div>
              </div>
            )
          })}
        </div>

        <a
          href={'https://wa.me/' + WHATSAPP + '?text=Ola, preciso de suporte no MCP.IA'}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 8px 20px rgba(22,163,74,0.3)' }}
        >
          <i className="ti ti-brand-whatsapp" style={{ fontSize: 20 }} />
          Falar com suporte agora
        </a>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>Seg-Sex · 8h às 18h</p>
      </div>
    </div>
  )
}
