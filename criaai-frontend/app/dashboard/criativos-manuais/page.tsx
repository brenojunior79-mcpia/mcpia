'use client'
import { useState, useEffect, useRef } from 'react'

const lessons = [
  {
    id: 1,
    title: 'Introducao Criativos',
    description: 'Visao geral de como criar seus proprios criativos manualmente.',
    videoId: '1133466432',
    icon: '👋',
  },
  {
    id: 2,
    title: 'Ideias de criativos',
    description: 'De onde tirar ideias e referencias para criar bons criativos.',
    videoId: '1133466048',
    icon: '💡',
  },
  {
    id: 3,
    title: 'Formato 01',
    description: 'Aprenda o primeiro formato de criativo manual.',
    videoId: '1133466650',
    icon: '🎬',
  },
  {
    id: 4,
    title: 'Formato 02',
    description: 'Aprenda o segundo formato de criativo manual.',
    videoId: '1133466188',
    icon: '🎬',
  },
  {
    id: 5,
    title: 'Formato 03',
    description: 'Aprenda o terceiro formato de criativo manual.',
    videoId: '1133466788',
    icon: '🎬',
  },
  {
    id: 6,
    title: 'Formato 04',
    description: 'Aprenda o quarto formato de criativo manual.',
    videoId: '1201539936',
    icon: '🎬',
  },
  {
    id: 7,
    title: 'Formato 05',
    description: 'Aprenda o quinto formato de criativo manual.',
    videoId: '1133466317',
    icon: '🎬',
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
