'use client'

const platforms = [
  {
    id: 'cakto',
    name: 'Cakto',
    description: 'Plataforma brasileira de produtos digitais. Crie sua conta gratuitamente e comece a vender ou se afiliar a produtos com alta conversao.',
    logo: '🛒',
    color: '#7c5cfc',
    colorBg: 'rgba(124,92,252,0.08)',
    colorBorder: 'rgba(124,92,252,0.2)',
    registerUrl: 'https://app.cakto.com.br/signup',
    loginUrl: 'https://app.cakto.com.br/login',
    features: ['Pagamentos via Pix, cartao e boleto', 'Painel de afiliados completo', 'Checkout de alta conversao', 'Suporte brasileiro'],
    badge: 'Parceira oficial',
    badgeColor: '#7c5cfc',
  },
  {
    id: 'kiwify',
    name: 'Kiwify',
    description: 'Uma das maiores plataformas de infoprodutos do Brasil. Centenas de produtos para afiliar com comissoes atrativas e pagamento rapido.',
    logo: '🥝',
    color: '#16a34a',
    colorBg: 'rgba(22,163,74,0.08)',
    colorBorder: 'rgba(22,163,74,0.2)',
    registerUrl: 'https://dashboard.kiwify.com.br/signup',
    loginUrl: 'https://dashboard.kiwify.com.br/login',
    features: ['Marketplace com milhares de produtos', 'Comissoes de ate 80%', 'Pagamento em 30 dias', 'Relatorios detalhados'],
    badge: 'Mais produtos',
    badgeColor: '#16a34a',
  },
  {
    id: 'logzz',
    name: 'Logzz',
    description: 'Plataforma de automacao e gestao de negocios digitais. Gerencie seus afiliados, vendas e campanhas em um so lugar.',
    logo: '⚡',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.08)',
    colorBorder: 'rgba(245,158,11,0.2)',
    registerUrl: 'https://logzz.com.br/cadastro',
    loginUrl: 'https://logzz.com.br/login',
    features: ['Automacao de campanhas', 'Gestao de afiliados', 'CRM integrado', 'Relatorios em tempo real'],
    badge: 'Automacao',
    badgeColor: '#f59e0b',
  },
]

export default function PlataformasPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '32px 24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 28 }}>🌐</div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, margin: 0 }}>Plataformas Parceiras</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted2)', margin: 0 }}>
            Crie sua conta nas plataformas abaixo para comecar a vender e se afiliar aos produtos em alta
          </p>
        </div>

        {/* Banner orientacao */}
        <div style={{ background: 'linear-gradient(135deg, rgba(91,78,248,0.1), rgba(91,78,248,0.04))', border: '1px solid rgba(91,78,248,0.2)', borderRadius: 16, padding: '18px 22px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>📋</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent2)', marginBottom: 4 }}>Como comecar?</div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0, lineHeight: 1.6 }}>
              1. Crie sua conta gratuita em cada plataforma · 2. Acesse o marketplace de afiliados · 3. Escolha os produtos em alta e gere seu link · 4. Use o MCP.IA para criar os criativos e vender!
            </p>
          </div>
        </div>

        {/* Cards das plataformas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {platforms.map(function(p) {
            return (
              <div
                key={p.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 18,
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {/* Header do card */}
                <div style={{ padding: '22px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 56, height: 56, background: p.colorBg, border: '1.5px solid ' + p.colorBorder, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                      {p.logo}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800 }}>{p.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: p.badgeColor, borderRadius: 99, padding: '3px 10px' }}>{p.badge}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0, maxWidth: 480, lineHeight: 1.5 }}>{p.description}</p>
                    </div>
                  </div>
                  {/* Botoes */}
                  <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                    <a
                      href={p.loginUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 13, padding: '10px 18px', borderRadius: 10, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      Entrar
                    </a>
                    <a
                      href={p.registerUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ background: 'linear-gradient(135deg, ' + p.color + ', ' + p.color + 'cc)', color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 22px', borderRadius: 10, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px ' + p.color + '33' }}
                    >
                      ✨ Criar conta gratis
                    </a>
                  </div>
                </div>

                {/* Features */}
                <div style={{ padding: '18px 26px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {p.features.map(function(f) {
                    return (
                      <div
                        key={f}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, background: p.colorBg, border: '1px solid ' + p.colorBorder, borderRadius: 10, padding: '7px 14px' }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{f}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Dica final */}
        <div style={{ marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 28 }}>💡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Dica de ouro</div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0, lineHeight: 1.6 }}>
              Crie suas contas nas 3 plataformas para ter acesso ao maior numero de produtos e maximizar seus ganhos como afiliado!
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
