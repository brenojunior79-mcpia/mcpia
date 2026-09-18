'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const STORAGE_KEY = 'mcpia_ebook_form'

interface EbookFormData {
  title: string
  topic: string
  details: string
  targetAudience: string
  tone: string
  chapters: string
  language: string
  themeId: string
}

interface GeneratedEbook {
  id?: string
  gamma_generation_id: string
  title: string
  pdf_url: string
  created_at?: string
  status: string
}

interface CreditInfo {
  used: number
  limit: number
  planName: string
}

interface Theme {
  id: string
  name: string
  colorKeywords: string[]
  toneKeywords: string[]
}

const defaultThemes: Theme[] = [
  { id: 'Chisel', name: 'Chisel', colorKeywords: ['Moderno', 'Clean'], toneKeywords: [] },
  { id: 'Prism', name: 'Prism', colorKeywords: ['Colorido', 'Vibrante'], toneKeywords: [] },
  { id: 'Pitch', name: 'Pitch', colorKeywords: ['Escuro', 'Elegante'], toneKeywords: [] },
  { id: 'Candy', name: 'Candy', colorKeywords: ['Pastel', 'Suave'], toneKeywords: [] },
  { id: 'Marble', name: 'Marble', colorKeywords: ['Claro', 'Sofisticado'], toneKeywords: [] },
]

const defaultForm: EbookFormData = {
  title: '',
  topic: '',
  details: '',
  targetAudience: '',
  tone: 'profissional e didatico',
  chapters: '',
  language: 'pt-BR',
  themeId: '',
}

const capaColors = [
  { label: 'Roxo', value: 'linear-gradient(135deg,#5b4ef8,#9b8ffc)' },
  { label: 'Azul', value: 'linear-gradient(135deg,#1d4ed8,#60a5fa)' },
  { label: 'Verde', value: 'linear-gradient(135deg,#15803d,#4ade80)' },
  { label: 'Laranja', value: 'linear-gradient(135deg,#ea580c,#fbbf24)' },
  { label: 'Rosa', value: 'linear-gradient(135deg,#be185d,#f472b6)' },
  { label: 'Escuro', value: 'linear-gradient(135deg,#111827,#374151)' },
]

const capaIcons = ['📘','📗','📕','📙','📓','📔','💡','🚀','⭐','🔥','✝️','💰']

function Capa3D({ title, subtitle, gradient, icon, author }: { title: string; subtitle: string; gradient: string; icon: string; author: string }) {
  return (
    <div style={{ perspective: 800, display: 'inline-block' }}>
      <div style={{
        width: 180,
        height: 240,
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: 'rotateY(-20deg) rotateX(5deg)',
        transition: 'transform 0.4s ease',
        cursor: 'pointer',
      }}
        onMouseEnter={function(e) { (e.currentTarget as HTMLElement).style.transform = 'rotateY(-8deg) rotateX(3deg) scale(1.04)' }}
        onMouseLeave={function(e) { (e.currentTarget as HTMLElement).style.transform = 'rotateY(-20deg) rotateX(5deg)' }}
      >
        {/* Frente */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: gradient,
          borderRadius: '2px 8px 8px 2px',
          boxShadow: '6px 6px 30px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          backfaceVisibility: 'hidden',
          overflow: 'hidden',
        }}>
          {/* Brilho */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(180deg,rgba(255,255,255,0.18),transparent)', borderRadius: '2px 8px 0 0' }} />
          {/* Icone */}
          <div style={{ fontSize: 42, marginBottom: 12, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{icon}</div>
          {/* Titulo */}
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.3, fontFamily: 'Syne, sans-serif', textShadow: '0 1px 3px rgba(0,0,0,0.4)', marginBottom: 8 }}>
            {title || 'Título do Ebook'}
          </div>
          {subtitle && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.4 }}>{subtitle}</div>
          )}
          {/* Linha decorativa */}
          <div style={{ position: 'absolute', bottom: 28, left: 16, right: 16, height: 1, background: 'rgba(255,255,255,0.3)' }} />
          {/* Autor */}
          <div style={{ position: 'absolute', bottom: 12, fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.08em' }}>
            {author || 'Cristão Próspero'}
          </div>
        </div>
        {/* Lombada */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: -18,
          width: 18,
          height: '100%',
          background: gradient,
          filter: 'brightness(0.6)',
          transformOrigin: 'right',
          transform: 'rotateY(-90deg)',
          borderRadius: '4px 0 0 4px',
        }} />
        {/* Sombra no chao */}
        <div style={{
          position: 'absolute',
          bottom: -20,
          left: 10,
          right: -10,
          height: 20,
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '50%',
          filter: 'blur(8px)',
          transform: 'rotateX(90deg)',
        }} />
      </div>
    </div>
  )
}

function EbookMockup({ title, pdfUrl }: { title: string; pdfUrl: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <Capa3D title={title} subtitle="" gradient="linear-gradient(135deg,#5b4ef8,#9b8ffc)" icon="📘" author="Cristão Próspero" />
      <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#5b4ef8,#9b8ffc)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '11px 22px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 6px 16px rgba(91,78,248,0.3)' }}>
        <i className="ti ti-download" style={{ fontSize: 16 }} /> Baixar Ebook (PDF)
      </a>
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
          width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}>
          <div style={{ width: 0, height: 0, marginLeft: 4, borderTop: '11px solid transparent', borderBottom: '11px solid transparent', borderLeft: '18px solid ' + color }} />
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-player-play" style={{ color: '#fff', fontSize: 13, opacity: 0.85 }} />
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{title}</span>
      </div>
    </div>
  )
}

export default function EbookPage() {
  const [form, setForm] = useState<EbookFormData>(defaultForm)
  const [credits, setCredits] = useState<CreditInfo | null>(null)
  const [ebooks, setEbooks] = useState<GeneratedEbook[]>([])
  const [themes, setThemes] = useState<Theme[]>(defaultThemes)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)

  // Estado da capa 3D
  const [capaTitle, setCapaTitle] = useState('')
  const [capaSubtitle, setCapaSubtitle] = useState('')
  const [capaAuthor, setCapaAuthor] = useState('')
  const [capaGradient, setCapaGradient] = useState(capaColors[0].value)
  const [capaIcon, setCapaIcon] = useState(capaIcons[0])

  const supabase = createClient()
  const router = useRouter()

  useEffect(function() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setForm(function(prev) { return { ...prev, ...parsed } })
      }
    } catch (e) {}
    checkSubscription()
    loadUserData()
    loadThemes()
  }, [])

  function saveToStorage(updatedForm: EbookFormData) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedForm)) } catch (e) {}
  }

  async function checkSubscription() {
    const userResult = await supabase.auth.getUser()
    const user = userResult.data.user
    if (!user) { router.push('/login'); return }
    const result = await supabase.from('profiles').select('subscription_status, full_name').eq('id', user.id).single()
    const status = result.data?.subscription_status
    const active = status === 'active' || status === 'trialing'
    setHasSubscription(active)
    if (!active) { router.push('/dashboard/planos'); return }
    if (result.data?.full_name) {
      setCapaAuthor(result.data.full_name.split(' ')[0])
    }
  }

  async function loadThemes() {
    try {
      const res = await fetch('/api/ebook-themes')
      if (res.ok) {
        const data = await res.json()
        if (data.themes && data.themes.length > 0) setThemes(data.themes)
      }
    } catch (err) {}
  }

  async function loadUserData() {
    setLoadingData(true)
    try {
      const res = await fetch('/api/list-ebooks')
      if (res.ok) {
        const data = await res.json()
        if (data.credits) setCredits(data.credits)
        if (data.ebooks) setEbooks(data.ebooks)
      }
    } catch (err) {} finally {
      setLoadingData(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const updated = { ...form, [e.target.name]: e.target.value }
    setForm(updated)
    saveToStorage(updated)
    if (e.target.name === 'title') setCapaTitle(e.target.value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hasSubscription) { window.location.href = '/dashboard/planos'; return }
    setError(null); setSuccess(null); setUpgradeRequired(false); setLoading(true)
    try {
      const chaptersArray = form.chapters ? form.chapters.split('\n').map(function(c) { return c.trim() }).filter(Boolean) : []
      const res = await fetch('/api/generate-ebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, topic: form.topic,
          details: form.details || undefined,
          targetAudience: form.targetAudience || undefined,
          tone: form.tone || undefined,
          chapters: chaptersArray.length > 0 ? chaptersArray : undefined,
          language: form.language,
          themeId: form.themeId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.requiresPlan) { setHasSubscription(false) }
        else if (data.upgradeRequired) { setUpgradeRequired(true); setError(data.details ?? 'Limite atingido.') }
        else { setError(data.error ?? 'Erro ao gerar ebook.') }
        return
      }
      setSuccess('Ebook gerado com sucesso!')
      const resetForm = { ...defaultForm, tone: form.tone, language: form.language, themeId: form.themeId }
      setForm(resetForm); saveToStorage(resetForm)
      await loadUserData()
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  function clearForm() {
    setForm(defaultForm)
    try { localStorage.removeItem(STORAGE_KEY) } catch (e) {}
  }

  function downloadCapa() {
    alert('Para baixar a capa, tire um print da visualizacao acima ou use uma ferramenta como o Canva para criar sua versao personalizada.')
  }

  const noCredits = credits !== null && credits.used >= credits.limit
  const remaining = credits ? credits.limit - credits.used : 0
  const pct = credits ? Math.min(100, Math.round((credits.used / credits.limit) * 100)) : 0

  const themeOptions = themes.map(function(t) {
    const colors = t.colorKeywords && t.colorKeywords.length > 0 ? ' · ' + t.colorKeywords.slice(0, 2).join(', ') : ''
    return { value: t.id, label: t.name + colors }
  })

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface)', border: '1.5px solid var(--border)',
    borderRadius: 10, padding: '10px 14px', fontSize: 14,
    color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'var(--muted2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  if (hasSubscription === null) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <i className="ti ti-loader" style={{ fontSize: 28, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#5b4ef8,#9b8ffc)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📘</div>
              <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text)', margin: 0 }}>Gerador de Ebook</h1>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0, paddingLeft: 46 }}>Crie ebooks profissionais em PDF com inteligencia artificial</p>
          </div>

          {hasSubscription && credits && (
            <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '12px 18px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: 11, color: 'var(--muted2)', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creditos de Ebook</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: remaining <= 0 ? 'var(--red)' : remaining <= 1 ? 'var(--amber)' : 'var(--accent)' }}>{remaining}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>/ {credits.limit} · {credits.planName}</span>
              </div>
              <div style={{ height: 5, width: 140, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pct + '%', background: remaining <= 0 ? 'var(--red)' : remaining <= 1 ? 'var(--amber)' : 'linear-gradient(90deg,var(--accent),#9b8ffc)', borderRadius: 99 }} />
              </div>
            </div>
          )}
        </div>

        {/* Aula */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 38, height: 38, background: 'var(--surface2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎬</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Aula: Como criar seu e-book</div>
              <div style={{ fontSize: 12, color: 'var(--muted2)' }}>Veja o passo a passo antes de gerar o seu</div>
            </div>
          </div>
          <div style={{ padding: '20px' }}>
            <VideoLesson videoId="1202593192" title="Como criar seu e-book" color="#5b4ef8" />
          </div>
        </div>

        {/* Avisos */}
        {hasSubscription === false && (
          <div style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 12, background: '#eef2ff', border: '1px solid rgba(91,78,248,0.2)', marginBottom: 16 }}>
            <span>🔒</span>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--accent)', margin: '0 0 4px', fontSize: 14 }}>Recurso exclusivo para assinantes</p>
              <a href="/dashboard/planos" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>Ver planos →</a>
            </div>
          </div>
        )}

        {upgradeRequired && (
          <div style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 12, background: '#fffbeb', border: '1px solid rgba(217,119,6,0.2)', marginBottom: 16 }}>
            <span>⚠️</span>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--amber)', margin: '0 0 4px', fontSize: 14 }}>Creditos esgotados</p>
              <p style={{ color: 'var(--muted2)', margin: '0 0 8px', fontSize: 13 }}>{error}</p>
              <a href="/dashboard/planos" style={{ color: 'var(--amber)', fontSize: 12, fontWeight: 600 }}>Ver planos</a>
            </div>
          </div>
        )}

        {error && !upgradeRequired && hasSubscription && (
          <div style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 12, background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)', marginBottom: 16 }}>
            <span>❌</span>
            <p style={{ color: 'var(--red)', margin: 0, fontSize: 14 }}>{error}</p>
          </div>
        )}

        {success && (
          <div style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 12, background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.2)', marginBottom: 16 }}>
            <span>✅</span>
            <p style={{ color: 'var(--green)', margin: 0, fontSize: 14 }}>{success}</p>
          </div>
        )}

        {/* Formulario */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', marginBottom: 28, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📋</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Detalhes do Ebook</span>
            </div>
            {(form.title || form.topic) && (
              <button onClick={clearForm} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                🗑️ Limpar
              </button>
            )}
          </div>
          <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Titulo <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input type="text" name="title" value={form.title} onChange={handleChange} placeholder="Ex: Guia Definitivo de Marketing Digital" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Topico principal <span style={{ color: 'var(--accent)' }}>*</span></label>
              <textarea name="topic" value={form.topic} onChange={handleChange} placeholder="Descreva o tema central do ebook..." required rows={2} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div>
              <label style={labelStyle}>Detalhamento <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(opcional)</span></label>
              <textarea name="details" value={form.details} onChange={handleChange} placeholder="Ex: Linguagem simples, exemplos praticos..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Publico-alvo</label>
                <input type="text" name="targetAudience" value={form.targetAudience} onChange={handleChange} placeholder="Ex: empreendedores" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tom e estilo</label>
                <select name="tone" value={form.tone} onChange={handleChange} style={inputStyle}>
                  <option value="profissional e didatico">Profissional e didatico</option>
                  <option value="informal e acessivel">Informal e acessivel</option>
                  <option value="tecnico e detalhado">Tecnico e detalhado</option>
                  <option value="motivacional e inspirador">Motivacional e inspirador</option>
                  <option value="academico e formal">Academico e formal</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Design visual</label>
              <select name="themeId" value={form.themeId} onChange={handleChange} style={inputStyle}>
                <option value="">Automatico (IA escolhe)</option>
                {themeOptions.map(function(opt) {
                  return <option key={opt.value} value={opt.value}>{opt.label}</option>
                })}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Capitulos <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(opcional · um por linha)</span></label>
              <textarea name="chapters" value={form.chapters} onChange={handleChange} placeholder={'Introducao\nCapitulo 1\nConclusao'} rows={3} style={{ ...inputStyle, resize: 'none', fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={labelStyle}>Idioma</label>
              <select name="language" value={form.language} onChange={handleChange} style={inputStyle}>
                <option value="pt-BR">Portugues (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Espanol</option>
              </select>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || (hasSubscription === true && (!form.title || !form.topic || noCredits))}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '13px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: hasSubscription === false ? 'linear-gradient(135deg,#5b4ef8,#9b8ffc)' : loading || noCredits ? 'var(--surface2)' : 'linear-gradient(135deg,#5b4ef8,#9b8ffc)',
                color: loading || noCredits ? 'var(--muted2)' : '#fff',
                fontWeight: 700, fontSize: 15, fontFamily: 'Inter, sans-serif',
                boxShadow: loading || noCredits ? 'none' : '0 8px 20px rgba(91,78,248,0.3)',
              }}
            >
              {hasSubscription === false ? '🔒 Assinar para gerar ebooks' : loading ? 'Gerando ebook — aguarde...' : '✨ Gerar Ebook com IA'}
            </button>
            {loading && <p style={{ fontSize: 12, color: 'var(--muted2)', textAlign: 'center', margin: 0 }}>Nao feche esta aba.</p>}
          </div>
        </div>

        {/* ===== BLOCO CAPA 3D ===== */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', marginBottom: 28, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,rgba(91,78,248,0.05),transparent)' }}>
            <span style={{ fontSize: 20 }}>🎨</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Criar Capa 3D do Ebook</div>
              <div style={{ fontSize: 11, color: 'var(--muted2)' }}>Personalize e visualize a capa do seu ebook em 3D</div>
            </div>
          </div>
          <div style={{ padding: '22px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Titulo da capa</label>
                <input type="text" value={capaTitle} onChange={function(e) { setCapaTitle(e.target.value) }} placeholder={form.title || 'Titulo do seu ebook'} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Subtitulo <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(opcional)</span></label>
                <input type="text" value={capaSubtitle} onChange={function(e) { setCapaSubtitle(e.target.value) }} placeholder="Ex: O guia completo para..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Autor</label>
                <input type="text" value={capaAuthor} onChange={function(e) { setCapaAuthor(e.target.value) }} placeholder="Seu nome" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Cor da capa</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {capaColors.map(function(c) {
                    return (
                      <div
                        key={c.value}
                        onClick={function() { setCapaGradient(c.value) }}
                        style={{
                          width: 36, height: 36, borderRadius: 10, background: c.value, cursor: 'pointer',
                          border: capaGradient === c.value ? '3px solid var(--accent)' : '2px solid transparent',
                          boxShadow: capaGradient === c.value ? '0 0 0 2px white, 0 0 0 4px var(--accent)' : 'var(--shadow-sm)',
                          transition: 'all 0.15s',
                        }}
                        title={c.label}
                      />
                    )
                  })}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Icone da capa</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {capaIcons.map(function(ic) {
                    return (
                      <div
                        key={ic}
                        onClick={function() { setCapaIcon(ic) }}
                        style={{
                          width: 40, height: 40, borderRadius: 10, background: 'var(--surface2)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                          border: capaIcon === ic ? '2px solid var(--accent)' : '2px solid var(--border)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {ic}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Preview 3D */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minWidth: 220 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Preview 3D</div>
              <Capa3D
                title={capaTitle || form.title || 'Titulo do Ebook'}
                subtitle={capaSubtitle}
                gradient={capaGradient}
                icon={capaIcon}
                author={capaAuthor}
              />
              <button
                onClick={downloadCapa}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 13, padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              >
                <i className="ti ti-download" style={{ fontSize: 15 }} />
                Salvar capa
              </button>
            </div>
          </div>
        </div>

        {/* Lista de ebooks gerados */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16 }}>📚</span>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'Syne, sans-serif' }}>Ebooks gerados</h2>
          </div>
          {loadingData ? (
            <p style={{ fontSize: 14, color: 'var(--muted2)', textAlign: 'center', padding: '24px 0' }}>Carregando...</p>
          ) : ebooks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', border: '2px dashed var(--border)', borderRadius: 16, textAlign: 'center' }}>
              <span style={{ fontSize: 32, marginBottom: 10 }}>📚</span>
              <p style={{ fontSize: 14, color: 'var(--muted2)', margin: '0 0 4px' }}>Nenhum ebook gerado ainda.</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Preencha o formulario acima para comecar.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {ebooks.map(function(ebook) {
                return (
                  <div key={ebook.gamma_generation_id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24, boxShadow: 'var(--shadow-sm)' }}>
                    {ebook.status === 'completed' && ebook.pdf_url ? (
                      <EbookMockup title={ebook.title} pdfUrl={ebook.pdf_url} />
                    ) : (
                      <div style={{ width: 120, height: 160, background: 'var(--surface2)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 32 }}>📄</span>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px', fontFamily: 'Syne, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ebook.title}</p>
                      {ebook.created_at && (
                        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>
                          {new Date(ebook.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 600, color: ebook.status === 'completed' ? 'var(--green)' : ebook.status === 'failed' ? 'var(--red)' : 'var(--accent)', background: ebook.status === 'completed' ? 'var(--green-light)' : ebook.status === 'failed' ? 'var(--red-light)' : 'var(--accent-light)', padding: '3px 10px', borderRadius: 99 }}>
                        {ebook.status === 'completed' ? '✓ Concluido' : ebook.status === 'failed' ? '✗ Erro' : '⏳ Processando'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
