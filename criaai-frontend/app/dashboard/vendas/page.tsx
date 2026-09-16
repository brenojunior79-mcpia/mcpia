'use client'
import { useState } from 'react'

const lessons = [
  {
    id: 1,
    title: 'Como criar sua conta no Gerenciador de Anuncios',
    description: 'Passo a passo completo para criar e configurar sua conta no Meta Business Suite e ter acesso ao Gerenciador de Anuncios.',
    duration: 'Em breve',
    videoUrl: '',
    icon: '🏗️',
  },
  {
    id: 2,
    title: 'Configurando sua primeira campanha',
    description: 'Aprenda a configurar o objetivo certo para sua campanha, publico-alvo e orcamento diario para comecar a vender.',
    duration: 'Em breve',
    videoUrl: '',
    icon: '🎯',
  },
  {
    id: 3,
    title: 'Criando anuncios que vendem',
    description: 'Como usar os criativos gerados pelo MCP.IA diretamente nos seus anuncios do Facebook e Instagram.',
    duration: 'Em breve',
    videoUrl: '',
    icon: '📱',
  },
  {
    id: 4,
    title: 'Publico-alvo — Como encontrar seus compradores',
    description: 'Descubra como segmentar corretamente seu publico para vender os produtos em alta com o menor custo possivel.',
    duration: 'Em breve',
    videoUrl: '',
    icon: '👥',
  },
  {
    id: 5,
    title: 'Analisando resultados e escalando',
    description: 'Aprenda a ler as metricas dos seus anuncios e saber quando e como escalar para vender mais.',
    duration: 'Em breve',
    videoUrl: '',
    icon: '📈',
  },
]

const tools = [
  {
    name: 'Meta Business Suite',
    description: 'Gerencie suas paginas, anuncios e resultados em um so lugar.',
    url: 'https://business.facebook.com',
    icon: '📘',
    color: '#1877f2',
  },
  {
    name: 'Gerenciador de Anuncios',
    description: 'Crie e acompanhe suas campanhas no Facebook e Instagram.',
    url: 'https://www.facebook.com/adsmanager',
    icon: '📊',
    color: '#7c5cfc',
  },
  {
    name: 'Meta Pixel Helper',
    description: 'Extensao para verificar se seu pixel esta instalado corretamente.',
    url: 'https://chromewebstore.google.com/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc',
    icon: '🔍',
    color: '#4ade80',
  },
]

export default function VendasAutoPage() {
  const [activeLesson, setActiveLesson] = useState<number | null>(null)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 28 }}>🚀</div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, margin: 0 }}>Vendendo no Automatico</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted2)', margin: 0 }}>
            Aprenda a criar anuncios no Facebook e Instagram para vender os produtos em alta no piloto automatico
          </p>
        </div>

        {/* Banner de acao rapida */}
        <div style={{ background: 'linear-gradient(135deg, rgba(124,92,252,0.15), rgba(124,92,252,0.05))', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 16, padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: '#a78bfa', marginBottom: 4 }}>Pronto para comecar?</div>
            <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Acesse o Gerenciador de Anuncios e coloque seu primeiro anuncio no ar hoje</div>
          </div>
          <a
            href="https://www.facebook.com/adsmanager"
            target="_blank"
            rel="noreferrer"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #9b6dfc)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Abrir Gerenciador →
          </a>
        </div>

        {/* Ferramentas */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ferramentas essenciais</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {tools.map(function(tool) {
              return (
                <a
                  key={tool.name}
                  href={tool.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s' }}
                >
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{tool.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{tool.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{tool.description}</div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>

        {/* Aulas */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Aulas — Do zero ao primeiro anuncio</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lessons.map(function(lesson) {
              const isActive = activeLesson === lesson.id
              return (
                <div
                  key={lesson.id}
                  style={{ background: 'var(--surface)', border: '1px solid ' + (isActive ? 'rgba(124,92,252,0.4)' : 'var(--border)'), borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s' }}
                >
                  <div
                    style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                    onClick={function() { setActiveLesson(isActive ? null : lesson.id) }}
                  >
                    <div style={{ width: 44, height: 44, background: isActive ? 'rgba(124,92,252,0.15)' : 'var(--surface2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {lesson.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent2)' }}>AULA {lesson.id}</span>
                        {lesson.videoUrl === '' && (
                          <span style={{ fontSize: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', borderRadius: 99, padding: '1px 8px', fontWeight: 600 }}>Em breve</span>
                        )}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{lesson.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>{lesson.description}</div>
                    </div>
                    <div style={{ fontSize: 18, color: 'var(--muted2)', flexShrink: 0 }}>{isActive ? '▲' : '▼'}</div>
                  </div>

                  {isActive && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
                      {lesson.videoUrl ? (
                        <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                          <iframe
                            src={lesson.videoUrl}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <div style={{ background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Aula em producao</div>
                          <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Esta aula estara disponivel em breve. Fique de olho!</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Dica final */}
        <div style={{ marginTop: 28, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 28 }}>💡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#4ade80', marginBottom: 4 }}>Dica do MCP.IA</div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0, lineHeight: 1.6 }}>
              Use o <strong style={{ color: 'var(--text)' }}>Criador de Criativos</strong> para gerar videos prontos para anunciar e o <strong style={{ color: 'var(--text)' }}>Criador de Site</strong> para criar sua pagina de captura. Tudo integrado!
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
