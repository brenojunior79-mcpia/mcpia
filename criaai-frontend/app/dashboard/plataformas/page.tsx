'use client'
import { useState, useEffect } from 'react'

const platforms = [
  {
    id: 'cakto',
    name: 'Cakto',
    description: 'Plataforma brasileira de produtos digitais. Crie sua conta gratuitamente e comece a vender ou se afiliar a produtos com alta conversao.',
    logoUrl: 'https://app.cakto.com.br/favicon.ico',
    logoFallback: 'C',
    logoBg: '#7c5cfc',
    color: '#7c5cfc',
    colorBg: 'rgba(124,92,252,0.08)',
    colorBorder: 'rgba(124,92,252,0.2)',
    registerUrl: 'https://app.cakto.com.br/auth/register/',
    loginUrl: 'https://sso.cakto.com.br/accounts/login/?next=https%3A%2F%2Fapp.cakto.com.br%2Fdashboard%2Fhome%2F',
    features: ['Pagamentos via Pix, cartao e boleto', 'Painel de afiliados completo', 'Checkout de alta conversao', 'Suporte brasileiro'],
    badge: 'Parceira oficial',
    videoId: '1141473630',
  },
  {
    id: 'kiwify',
    name: 'Kiwify',
    description: 'Uma das maiores plataformas de infoprodutos do Brasil. Centenas de produtos para afiliar com comissoes atrativas.',
    logoUrl: 'https://kiwify.com.br/favicon.ico',
    logoFallback: 'K',
    logoBg: '#16a34a',
    color: '#16a34a',
    colorBg: 'rgba(22,163,74,0.08)',
    colorBorder: 'rgba(22,163,74,0.2)',
    registerUrl: 'https://dashboard.kiwify.com.br/signup',
    loginUrl: 'https://dashboard.kiwify.com.br/login',
    features: ['Marketplace com milhares de produtos', 'Comissoes de ate 80%', 'Pagamento rapido', 'Relatorios detalhados'],
    badge: 'Mais produtos',
    videoId: '1133465792',
  },
  {
    id: 'logzz',
    name: 'Logzz',
    description: 'Plataforma de automacao e gestao de negocios digitais. Gerencie seus afiliados, vendas e campanhas em um so lugar.',
    logoUrl: 'https://app.logzz.com.br/favicon.ico',
    logoFallback: 'L',
    logoBg: '#f59e0b',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.08)',
    colorBorder: 'rgba(245,158,11,0.2)',
    registerUrl: 'https://app.logzz.com.br/cadastrar/useg02v2k',
    loginUrl: 'https://app.logzz.com.br/login',
    features: ['Automacao de campanhas', 'Gestao de afiliados', 'CRM integrado', 'Relatorios em tempo real'],
    badge: 'Automacao',
    videoId: '1141470290',
  },
]

function PlatformLogo({ logoUrl, fallback, bg }: { logoUrl: string; fallback: string; bg: string }) {
  return (
    <div style={{ width: 56, height: 56, background: bg + '22', border: '1.5px solid ' + bg + '44', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
      <img
        src={logoUrl}
        alt=""
        width={34}
        height={34}
        style={{ objectFit: 'contain', position: 'absolute' }}
        onError={function(e: any) {
          e.target.style.display = 'none'
          const next = e.target.nextElementSibling as HTMLElement
          if (next) next.style.display = 'flex'
        }}
      />
      <div style={{ width: 34, height: 34, background: bg, borderRadius: 8, display: 'none', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'Syne, sans-serif', position: 'absolute' }}>
        {fallback}
      </div>
    </div>
  )
}

function VideoLesson({ videoId, title, color }: { videoId: string; title: string; color: string }) {
  const [playing, setPlaying] = useState(false)
  const [thumb, setThumb] = useState<string | null>(null)

  useEffect(function() {
    let active = true
    fetch('https://vimeo.com/api/oembed.json?url=' + encodeURIComponent('https://vimeo.com/' + videoId))
      .then(function(res) { return res.ok ? res.json() : null })
      .then(function(data) { if (active && data && data.thumbnail_url) setThumb(data.thumbnail_url) })
      .catch(function() {})
    return function() { active = false }
  }, [videoId])

  if (playing) {
    return (
      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, borderRadius: 14, overflow: 'hidden', background: '#000' }}>
        <iframe
          src={'https://player.vimeo.com/video/' + videoId + '?title=0&byline=0&portrait=0&dnt=1&autoplay=1'}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
          allowFullScreen
          title={title}
        />
      </div>
    )
  }

  return (
    <div
      onClick={function() { setPlaying(true) }}
      role="button"
      aria-label={'Assistir: ' + title}
      style={{
        position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, borderRadius: 14,
        overflow: 'hidden', cursor: 'pointer',
        background: thumb ? '#000' : 'linear-gradient(135deg,' + color + 'dd,' + color + '88)',
        backgroundImage: thumb ? 'url(' + thumb + ')' : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.35) 100%)' }} />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)', transition: 'transform 0.15s',
        }}>
          <div style={{ width: 0, height: 0, marginLeft: 4, borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderLeft: '20px solid ' + color }} />
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-player-play" style={{ color: '#fff', fontSize: 14, opacity: 0.85 }} />
        <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{title}</span>
      </div>
    </div>
  )
}

function PlatformCard({ p }: { p: typeof platforms[number] }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>

      <div style={{ padding: '22px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <PlatformLogo logoUrl={p.logoUrl} fallback={p.logoFallback} bg={p.logoBg} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800 }}>{p.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: p.color, borderRadius: 99, padding: '3px 10px' }}>{p.badge}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0, maxWidth: 480, lineHeight: 1.5 }}>{p.description}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <a href={p.loginUrl} target="_blank" rel="noreferrer" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 13, padding: '10px 18px', borderRadius: 10, textDecoration: 'none', display: 'inline-block' }}>
            Entrar
          </a>
          <a href={p.registerUrl} target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg,' + p.color + ',' + p.color + 'cc)', color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 22px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 12px ' + p.color + '33', display: 'inline-block' }}>
            ✨ Criar conta grátis
          </a>
        </div>
      </div>

      <div style={{ padding: '16px 26px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {p.features.map(function(f) {
          return (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, background: p.colorBg, border: '1px solid ' + p.colorBorder, borderRadius: 10, padding: '6px 12px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 500 }}>{f}</span>
            </div>
          )
        })}
      </div>

      {p.videoId && (
        <div style={{ padding: '0 26px 22px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Aula: Cadastrando na {p.name}
          </div>
          <VideoLesson videoId={p.videoId} title={'Cadastrando na ' + p.name} color={p.color} />
        </div>
      )}
    </div>
  )
}

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

        {/* Banner */}
        <div style={{ background: 'linear-gradient(135deg,rgba(91,78,248,0.1),rgba(91,78,248,0.04))', border: '1px solid rgba(91,78,248,0.2)', borderRadius: 16, padding: '18px 22px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>📋</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent2)', marginBottom: 4 }}>Como comecar?</div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0, lineHeight: 1.6 }}>
              1. Crie sua conta gratuita em cada plataforma · 2. Acesse o marketplace de afiliados · 3. Escolha os produtos em alta e gere seu link · 4. Use a plataforma para criar os criativos e vender!
            </p>
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {platforms.map(function(p) {
            return <PlatformCard key={p.id} p={p} />
          })}
        </div>

        <div style={{ marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 28 }}>💡</div>
          <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0, lineHeight: 1.6 }}>
            Crie suas contas nas 3 plataformas para ter acesso ao maior numero de produtos e maximizar seus ganhos como afiliado!
          </p>
        </div>

      </div>
    </div>
  )
}
