'use client'
import { useState, useEffect, useRef } from 'react'

const blocks = [
  {
    id: 'configurando',
    title: 'Configurando o aplicativo de vendas',
    icon: '🛠️',
    lessons: [
      {
        id: 1,
        title: 'Introducao',
        description: 'Visao geral do que voce vai aprender nesse modulo, do zero ao primeiro anuncio no ar.',
        videoId: '',
        icon: '👋',
      },
      {
        id: 2,
        title: 'Criando pagina',
        description: 'Passo a passo para criar sua pagina de vendas antes de comecar a anunciar.',
        videoId: '1133546045',
        icon: '🖥️',
      },
      {
        id: 3,
        title: 'Criando conta no gerenciador de anuncios',
        description: 'Como criar e configurar sua conta no Meta Business Suite para ter acesso ao Gerenciador de Anuncios.',
        videoId: '1177382733',
        icon: '🏗️',
      },
      {
        id: 4,
        title: 'Criando pixel',
        description: 'Aprenda a criar o Pixel da Meta para rastrear os resultados dos seus anuncios.',
        videoId: '1133467600',
        icon: '🎯',
      },
      {
        id: 5,
        title: 'Adicionando Pixel na plataforma',
        description: 'Como instalar o Pixel dentro da sua plataforma de vendas para comecar a rastrear conversoes.',
        videoId: '1145980958',
        icon: '🔌',
      },
    ],
  },
  {
    id: 'digital',
    title: 'Vendendo produto digital no automatico',
    icon: '💻',
    lessons: [
      {
        id: 6,
        title: 'Subindo anuncio na pratica',
        description: 'Veja na pratica como subir seu primeiro anuncio do zero, direto no Gerenciador de Anuncios.',
        videoId: '',
        icon: '📤',
      },
      {
        id: 7,
        title: 'Escalando suas vendas',
        description: 'Aprenda a ler as metricas dos seus anuncios e saber quando e como escalar para vender mais.',
        videoId: '',
        icon: '📈',
      },
    ],
  },
  {
    id: 'fisicos',
    title: 'Vendendo produtos fisicos',
    icon: '📦',
    lessons: [
      {
        id: 8,
        title: 'Introducao as vendas de produtos fisicos',
        description: 'Como funciona a venda de produtos fisicos por WhatsApp e o que muda em relacao aos digitais.',
        videoId: '',
        icon: '📦',
      },
      {
        id: 9,
        title: 'Anunciando produtos fisicos',
        description: 'Como criar anuncios para produtos fisicos e direcionar o cliente para o WhatsApp de vendas.',
        videoId: '',
        icon: '🚚',
      },
    ],
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

function VideoLesson({ videoId, title, color }: { videoId: string; title: string; color: string }) {
  const [playing, setPlaying] = useState(false)
  const [thumb, setThumb] = useState<string | null>(null)

  useEffect(function() {
    if (!videoId) return
    let active = true
    fetch('https://vimeo.com/api/oembed.json?url=' + encodeURIComponent('https://vimeo.com/' + videoId))
      .then(function(res) { return res.ok ? res.json() : null })
      .then(function(data) { if (active && data && data.thumbnail_url) setThumb(data.thumbnail_url) })
      .catch(function() {})
    return function() { active = false }
  }, [videoId])

  if (playing) {
    return (
      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
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
        position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, borderRadius: 12,
        overflow: 'hidden', cursor: 'pointer',
        background: thumb ? '#000' : 'linear-gradient(135deg,' + color + 'dd,' + color + '88)',
        backgroundImage: thumb ? 'url(' + thumb + ')' : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.35) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}>
          <div style={{ width: 0, height: 0, marginLeft: 4, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '16px solid ' + color }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-player-play" style={{ color: '#fff', fontSize: 12, opacity: 0.85 }} />
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{title}</span>
      </div>
    </div>
  )
}

function LessonCard({ lesson }: { lesson: any }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', flex: '0 0 290px', scrollSnapAlign: 'start' }}>
      <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 40, height: 40, background: 'var(--surface2)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {lesson.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent2)' }}>AULA {lesson.id}</span>
            {!lesson.videoId && (
              <span style={{ fontSize: 9, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', borderRadius: 99, padding: '1px 7px', fontWeight: 600 }}>Em breve</span>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</div>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 11, color: 'var(--muted2)', margin: '0 0 12px', lineHeight: 1.5, minHeight: 33 }}>{lesson.description}</p>
        {lesson.videoId ? (
          <VideoLesson videoId={lesson.videoId} title={lesson.title} color="#7c5cfc" />
        ) : (
          <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 12 }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span style={{ fontSize: 22 }}>🎬</span>
              <span style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 600 }}>Aula em producao</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LessonCarousel({ block }: { block: any }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(dir: number) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * 310, behavior: 'smooth' })
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{block.icon}</span>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, margin: 0 }}>{block.title}</h2>
          <span style={{ fontSize: 11, color: 'var(--muted2)', background: 'var(--surface2)', borderRadius: 99, padding: '2px 9px' }}>{block.lessons.length} aulas</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={function() { scroll(-1) }}
            aria-label="Aula anterior"
            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <i className="ti ti-chevron-left" />
          </button>
          <button
            onClick={function() { scroll(1) }}
            aria-label="Proxima aula"
            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <i className="ti ti-chevron-right" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        style={{ display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 8, marginBottom: -8, scrollbarWidth: 'none' }}
      >
        {block.lessons.map(function(lesson: any) {
          return <LessonCard key={lesson.id} lesson={lesson} />
        })}
      </div>
    </div>
  )
}

export default function VendasAutoPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 28 }}>🚀</div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, margin: 0 }}>Vendendo no Automatico</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted2)', margin: 0 }}>
            Arraste os carrosseis para o lado para ver mais aulas. Do zero ao primeiro anuncio no ar.
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
        <div style={{ marginBottom: 36 }}>
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

        {/* 3 blocos de aulas em carrossel */}
        {blocks.map(function(block) {
          return <LessonCarousel key={block.id} block={block} />
        })}

        {/* Dica final */}
        <div style={{ marginTop: 12, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
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
