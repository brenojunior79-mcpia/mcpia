'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

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

export default function EbookPage() {
  const [form, setForm] = useState<EbookFormData>({
    title: '',
    topic: '',
    details: '',
    targetAudience: '',
    tone: 'profissional e didatico',
    chapters: '',
    language: 'pt-BR',
    themeId: '',
  })

  const [credits, setCredits] = useState<CreditInfo | null>(null)
  const [ebooks, setEbooks] = useState<GeneratedEbook[]>([])
  const [themes, setThemes] = useState<Theme[]>(defaultThemes)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const supabase = createClient()

  useEffect(function() {
    checkSubscription()
    loadThemes()
  }, [])

  async function checkSubscription() {
    const userResult = await supabase.auth.getUser()
    const user = userResult.data.user
    if (!user) {
      setHasSubscription(false)
      return
    }
    const result = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()
    const status = result.data?.subscription_status
    const active = status === 'active' || status === 'trialing'
    setHasSubscription(active)
    if (active) {
      loadUserData()
    }
  }

  async function loadThemes() {
    try {
      const res = await fetch('/api/ebook-themes')
      if (res.ok) {
        const data = await res.json()
        if (data.themes && data.themes.length > 0) setThemes(data.themes)
      }
    } catch (err) {
      console.error('Erro ao carregar temas:', err)
    }
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
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoadingData(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(function(prev) { return { ...prev, [e.target.name]: e.target.value } })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setUpgradeRequired(false)
    setLoading(true)

    try {
      const chaptersArray = form.chapters
        ? form.chapters.split('\n').map(function(c) { return c.trim() }).filter(Boolean)
        : []

      const res = await fetch('/api/generate-ebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          topic: form.topic,
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
        if (data.requiresPlan) {
          setHasSubscription(false)
        } else if (data.upgradeRequired) {
          setUpgradeRequired(true)
          setError(data.details ?? 'Limite de creditos atingido.')
        } else {
          setError(data.error ?? 'Erro ao gerar ebook.')
        }
        return
      }

      setSuccess('Ebook gerado com sucesso! ' + data.creditsRemaining + ' credito(s) restante(s).')
      setForm({ title: '', topic: '', details: '', targetAudience: '', tone: 'profissional e didatico', chapters: '', language: 'pt-BR', themeId: '' })
      await loadUserData()
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  function handleDownload(ebook: GeneratedEbook) {
    window.open(ebook.pdf_url, '_blank')
  }

  const noCredits = credits !== null && credits.used >= credits.limit
  const remaining = credits ? credits.limit - credits.used : 0
  const pct = credits ? Math.min(100, Math.round((credits.used / credits.limit) * 100)) : 0

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0a120a', border: '1px solid #1e3a1e',
    borderRadius: '8px', padding: '10px 12px', fontSize: '14px',
    color: '#ffffff', outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 500,
    color: '#9ca3af', marginBottom: '6px',
  }

  const themeOptions = themes.map(function(t) {
    const colors = t.colorKeywords && t.colorKeywords.length > 0 ? ' · ' + t.colorKeywords.slice(0, 3).join(', ') : ''
    return { value: t.id, label: t.name + colors }
  })

  if (hasSubscription === null) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Carregando...</p>
      </div>
    )
  }

  if (!hasSubscription) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f0a', color: '#fff', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Recurso exclusivo para assinantes</h2>
          <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.6, marginBottom: 28 }}>
            Para gerar ebooks profissionais com IA, voce precisa ter um plano ativo. Escolha o plano ideal para o seu negocio.
          </p>
          <a
            href="/dashboard/planos"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #7c5cfc, #9b6dfc)', color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 14, textDecoration: 'none' }}
          >
            Ver planos e precos
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f0a', color: '#fff', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', background: '#1a3a1a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📘</div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>Ebook Builder</h1>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, paddingLeft: '42px' }}>Gerador de ebooks profissionais em PDF</p>
          </div>
          {credits && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0f1a0f', border: '1px solid #1e3a1e', borderRadius: '12px', padding: '12px 16px' }}>
              <div style={{ width: '32px', height: '32px', background: '#1a3a1a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📗</div>
              <div>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px 0' }}>Creditos de Ebook</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: remaining <= 0 ? '#f87171' : remaining <= 1 ? '#fbbf24' : '#ffffff' }}>{remaining} restantes</span>
                  <span style={{ fontSize: '12px', color: '#4b5563' }}>/ {credits.limit} · {credits.planName}</span>
                </div>
                <div style={{ marginTop: '6px', height: '4px', width: '112px', background: '#1a2a1a', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct + '%', background: remaining <= 0 ? '#ef4444' : remaining <= 1 ? '#f59e0b' : '#4ade80', borderRadius: '999px' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {upgradeRequired && (
          <div style={{ display: 'flex', gap: '12px', padding: '16px', borderRadius: '12px', background: 'rgba(120,53,15,0.2)', border: '1px solid rgba(180,83,9,0.3)', marginBottom: '16px' }}>
            <span>⚠️</span>
            <div>
              <p style={{ fontWeight: 600, color: '#fcd34d', margin: '0 0 4px 0', fontSize: '14px' }}>Creditos esgotados</p>
              <p style={{ color: '#fbbf24', margin: '0 0 8px 0', fontSize: '13px' }}>{error}</p>
              <a href="/dashboard/planos" style={{ color: '#fcd34d', fontSize: '12px', fontWeight: 500 }}>Ver planos</a>
            </div>
          </div>
        )}

        {error && !upgradeRequired && (
          <div style={{ display: 'flex', gap: '12px', padding: '16px', borderRadius: '12px', background: 'rgba(127,29,29,0.2)', border: '1px solid rgba(185,28,28,0.3)', marginBottom: '16px' }}>
            <span>❌</span>
            <p style={{ color: '#fca5a5', margin: 0, fontSize: '14px' }}>{error}</p>
          </div>
        )}

        {success && (
          <div style={{ display: 'flex', gap: '12px', padding: '16px', borderRadius: '12px', background: 'rgba(6,78,59,0.2)', border: '1px solid rgba(6,95,70,0.3)', marginBottom: '16px' }}>
            <span>✅</span>
            <p style={{ color: '#6ee7b7', margin: 0, fontSize: '14px' }}>{success}</p>
          </div>
        )}

        <div style={{ background: '#0d150d', border: '1px solid #1a2e1a', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a2e1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Detalhes do Ebook</span>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Titulo <span style={{ color: '#4ade80' }}>*</span></label>
              <input type="text" name="title" value={form.title} onChange={handleChange} placeholder="Ex: Guia Definitivo de Marketing Digital" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Topico principal <span style={{ color: '#4ade80' }}>*</span></label>
              <textarea name="topic" value={form.topic} onChange={handleChange} placeholder="Descreva o tema central do ebook..." required rows={2} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div>
              <label style={labelStyle}>Detalhamento <span style={{ color: '#6b7280', fontWeight: 400 }}>(opcional)</span></label>
              <textarea name="details" value={form.details} onChange={handleChange} placeholder="Ex: Quero um ebook com linguagem simples, exemplos praticos..." rows={4} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
              <label style={labelStyle}>Capitulos <span style={{ color: '#6b7280', fontWeight: 400 }}>(opcional · um por linha)</span></label>
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
              disabled={loading || !form.title || !form.topic || noCredits}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px', borderRadius: '12px', border: 'none',
                cursor: loading || noCredits || !form.title || !form.topic ? 'not-allowed' : 'pointer',
                background: loading || noCredits ? '#1a2e1a' : 'linear-gradient(135deg, #16a34a, #4ade80)',
                color: loading || noCredits ? '#4ade80' : '#0a0f0a',
                fontWeight: 700, fontSize: '14px', opacity: !form.title || !form.topic ? 0.5 : 1,
              }}
            >
              {loading ? 'Gerando ebook — aguarde ate 3 min...' : 'Gerar Ebook com IA'}
            </button>
            {loading && (
              <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', margin: 0 }}>
                Seu ebook esta sendo criado. Nao feche esta aba.
              </p>
            )}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>📄</span>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#d1d5db', margin: 0 }}>Ebooks gerados</h2>
          </div>
          {loadingData ? (
            <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '24px 0' }}>Carregando...</p>
          ) : ebooks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', border: '1px dashed #1a2e1a', borderRadius: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: '28px', marginBottom: '8px' }}>📚</span>
              <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 4px 0' }}>Nenhum ebook gerado ainda.</p>
              <p style={{ fontSize: '12px', color: '#374151', margin: 0 }}>Preencha o formulario acima para comecar.</p>
            </div>
          ) : (
            <div style={{ background: '#0d150d', border: '1px solid #1a2e1a', borderRadius: '16px', overflow: 'hidden' }}>
              {ebooks.map(function(ebook, i) {
                return (
                  <div key={ebook.gamma_generation_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 20px', borderTop: i > 0 ? '1px solid #1a2e1a' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{ width: '28px', height: '28px', background: '#1a2e1a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📄</div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ebook.title}</p>
                        {ebook.created_at && (
                          <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0 0 0' }}>
                            {new Date(ebook.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', color: ebook.status === 'completed' ? '#4ade80' : ebook.status === 'failed' ? '#f87171' : '#60a5fa', fontWeight: 500 }}>
                        {ebook.status === 'completed' ? 'Concluido' : ebook.status === 'failed' ? 'Erro' : 'Processando'}
                      </span>
                      {ebook.status === 'completed' && (
                        <button onClick={function() { handleDownload(ebook) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#1a3a1a', color: '#4ade80', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                          PDF
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
