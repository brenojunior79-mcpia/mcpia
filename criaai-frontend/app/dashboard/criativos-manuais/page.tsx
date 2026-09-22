'use client'
import { useState, useEffect, useRef } from 'react'

const lessons = [
  {
    id: 1,
    title: 'Introducao Criativos',
    description: 'Visao geral de como criar seus proprios criativos manualmente.',
    videoId: '1133466432',
    icon: '👋',
    links: [] as { label: string; url: string }[],
  },
  {
    id: 2,
    title: 'Ideias de criativos',
    description: 'De onde tirar ideias e referencias para criar bons criativos.',
    videoId: '1133466048',
    icon: '💡',
    links: [
      { label: 'Biblioteca de Anuncios do Facebook', url: 'https://www.facebook.com/ads/library/?active_status=all&ad_type=political_and_issue_ads&country=BR&is_targeted_country=false&media_type=all&sort_data[mode]=total_impressions&sort_data[direction]=desc' },
    ],
  },
  {
    id: 3,
    title: 'Modelo 01 - Noticias',
    description: 'Aprenda o formato de criativo estilo noticia.',
    videoId: '1133466650',
    icon: '📰',
    links: [
      { label: 'Canva (iOS)', url: 'https://apps.apple.com/br/app/canva-editor-de-fotos-e-v%C3%ADdeo/id897446215' },
      { label: 'Canva (Android)', url: 'https://play.google.com/store/apps/details/Canva_AI_Photo_Video_Editor?id=com.canva.editor&hl=pt_BR' },
      { label: 'Canva (Web)', url: 'https://www.canva.com/' },
    ],
  },
  {
    id: 4,
    title: 'Modelo 02 - Podcast',
    description: 'Aprenda o formato de criativo estilo podcast.',
    videoId: '1133466188',
    icon: '🎙️',
    links: [],
  },
  {
    id: 5,
    title: 'Modelo 03 - Produtos e Resultados',
    description: 'Aprenda o formato de criativo mostrando produtos e resultados.',
    videoId: '1133466788',
    icon: '📦',
    links: [],
  },
  {
    id: 6,
    title: 'Modelo 04 - Imagens que geram impacto',
    description: 'Aprenda a criar imagens de impacto para seus criativos.',
    videoId: '1133466317',
    icon: '⚡',
    links: [
      { label: 'Leonardo AI', url: 'https://app.leonardo.ai/' },
      { label: 'ChatGPT', url: 'https://chatgpt.com/' },
      { label: 'Pexels', url: 'https://www.pexels.com/pt-br/' },
    ],
  },
]

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
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', flex: '0 0 calc(50% - 8px)', minWidth: 280, scrollSnapAlign: 'start' }}>
      <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 40, height: 40, background: 'var(--surface2)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {lesson.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent2)', marginBottom: 2 }}>AULA {lesson.id}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</div>
        </div>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 11, color: 'var(--muted2)', margin: '0 0 12px', lineHeight: 1.5, minHeight: 33 }}>{lesson.description}</p>
        <VideoLesson videoId={lesson.videoId} title={lesson.title} color="#7c5cfc" />
        {lesson.links && lesson.links.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {lesson.links.map(function(link: any) {
              return (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
                    color: 'var(--accent2)', background: 'var(--accent-glow)', border: '1px solid rgba(124,92,252,0.25)',
                    borderRadius: 99, padding: '5px 10px', textDecoration: 'none',
                  }}
                >
                  <i className="ti ti-link" style={{ fontSize: 11 }} />
                  {link.label}
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CriativosManuaisPage() {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(dir: number) {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.querySelector('div') ? (el.querySelector('div') as HTMLElement).offsetWidth + 16 : 300
    el.scrollBy({ left: dir * cardWidth * 2, behavior: 'smooth' })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 28 }}>🎬</div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, margin: 0 }}>Criativos Manuais</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted2)', margin: 0 }}>
            Aprenda a criar seus proprios criativos manualmente, do zero. Arraste ou use as setas para ver as proximas aulas.
          </p>
        </div>

        {/* Carrossel */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📚</span>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, margin: 0 }}>Aulas de criativos manuais</h2>
              <span style={{ fontSize: 11, color: 'var(--muted2)', background: 'var(--surface2)', borderRadius: 99, padding: '2px 9px' }}>{lessons.length} aulas</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={function() { scroll(-1) }}
                aria-label="Aula anterior"
                style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <i className="ti ti-chevron-left" style={{ fontSize: 18 }} />
              </button>
              <button
                onClick={function() { scroll(1) }}
                aria-label="Proxima aula"
                style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <i className="ti ti-chevron-right" style={{ fontSize: 18 }} />
              </button>
            </div>
          </div>
          <div
            ref={scrollRef}
            style={{ display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 8, marginBottom: -8, scrollbarWidth: 'none' }}
          >
            {lessons.map(function(lesson) {
              return <LessonCard key={lesson.id} lesson={lesson} />
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
