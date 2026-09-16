'use client'

import { useState, useEffect } from 'react'
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

function EbookMockup({ title, pdfUrl }: { title: string; pdfUrl: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Mockup do ebook */}
      <div style={{ position: 'relative', width: 160, height: 220 }}>
        {/* Sombra do livro */}
        <div style={{ position: 'absolute', bottom: -8, left: 8, right: -8, height: '100%', background: 'rgba(91,78,248,0.15)', borderRadius: 4, transform: 'skewY(-1deg)' }} />
        {/* Livro principal */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #5b4ef8, #9b8ffc)',
          borderRadius: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          boxShadow: '0 20px 40px rgba(91,78,248,0.3)',
        }}>
          {/* Lombada */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 12, background: 'rgba(0,0,0,0.2)', borderRadius: '4px 0 0 4px' }} />
          {/* Icone */}
          <div style={{ fontSize: 36, marginBottom: 12 }}>📘</div>
          {/* Titulo */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.4, fontFamily: 'Syne, sans-serif' }}>
            {title.slice(0, 40)}{title.length > 40 ? '...' : ''}
          </div>
          {/* Linha decorativa */}
          <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, height: 1, background: 'rgba(255,255,255,0.3)' }} />
          <div style={{ position: 'absolute', bottom: 12, fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.1em' }}>MCP.IA</div>
        </div>
      </div>
      {/* Botao de download */}
      <a
        href={pdfUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'linear-gradient(135deg, #5b4ef8, #9b8ffc)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          padding: '12px 24px',
          borderRadius: 12,
          textDecoration: 'none',
          boxShadow: '0 8px 20px rgba(91,78,248,0.3)',
          transition: 'all 0.2s',
        }}
      >
        <i className="ti ti-download" style={{ fontSize: 16 }} />
        Baixar Ebook (PDF)
      </a>
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
  const supabase = createClient()

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
    if (!user) { setHasSubscription(false); return }
    const result = await supabase.from('profiles').select('subscription_status').eq('id', user.id).single()
    const status = result.data?.subscription_status
    setHasSubscription(status === 'active' || status === 'trialing')
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
    fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'var(--muted2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  if (hasSubscription === null) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <i className="ti ti-loader" style={{ fontSize: 28, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #5b4ef8, #9b8ffc)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📘</div>
              <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text)', margin: 0 }}>Gerador de Ebook</h1>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0, paddingLeft: 46 }}>Crie ebooks profissionais em PDF com inteligencia artificial</p>
          </div>

          {hasSubscription && credits && (
            <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '12px 18px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: 11, color: 'var(--muted2)', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creditos de Ebook</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: remaining <= 0 ? 'var(--red)' : remaining <= 1 ? 'var(--amber)' : 'var(--accent)' }}>{remaining}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>/ {credits.limit} restantes · {credits.planName}</span>
              </div>
              <div style={{ height: 5, width: 140, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pct + '%', background: remaining <= 0 ? 'var(--red)' : remaining <= 1 ? 'var(--amber)' : 'linear-gradient(90deg, var(--accent), #9b8ffc)', borderRadius: 99 }} />
              </div>
            </div>
          )}

          {hasSubscription === false && (
            <div style={{ background: '#eef2ff', border: '1px solid rgba(91,78,248,0.2)', borderRadius: 12, padding: '10px 16px' }}>
              <p style={{ fontSize: 12, color: 'var(--accent)', margin: 0, fontWeight: 600 }}>🔒 Sem plano ativo</p>
              <a href="/dashboard/planos" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>Assinar agora →</a>
            </div>
          )}
        </div>

        {/* Avisos */}
        {hasSubscription === false && (
          <div style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 12, background: '#eef2ff', border: '1px solid rgba(91,78,248,0.2)', marginBottom: 16 }}>
            <span>🔒</span>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--accent)', margin: '0 0 4px', fontSize: 14 }}>Recurso exclusivo para assinantes</p>
              <p style={{ color: 'var(--muted2)', margin: '0 0 8px', fontSize: 13 }}>Assine um plano para gerar ebooks com IA.</p>
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
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📋</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Detalhes do Ebook</span>
            </div>
            {(form.title || form.topic || form.details) && (
              <button onClick={clearForm} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Inter, sans-serif' }}>
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
              <textarea name="details" value={form.details} onChange={handleChange} placeholder="Ex: Quero linguagem simples, exemplos praticos, voltado para iniciantes..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
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
                padding: '13px', borderRadius: 12, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                background: hasSubscription === false ? 'linear-gradient(135deg, #5b4ef8, #9b8ffc)' : loading || noCredits ? 'var(--surface2)' : 'linear-gradient(135deg, #5b4ef8, #9b8ffc)',
                color: loading || noCredits ? 'var(--muted2)' : '#fff',
                fontWeight: 700, fontSize: 15, fontFamily: 'Inter, sans-serif',
                boxShadow: loading || noCredits ? 'none' : '0 8px 20px rgba(91,78,248,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {hasSubscription === false ? '🔒 Assinar para gerar ebooks' : loading ? 'Gerando ebook — aguarde ate 3 min...' : '✨ Gerar Ebook com IA'}
            </button>
            {loading && (
              <p style={{ fontSize: 12, color: 'var(--muted2)', textAlign: 'center', margin: 0 }}>
                Seu ebook esta sendo criado. Nao feche esta aba.
              </p>
            )}
          </div>
        </div>

        {/* Lista de ebooks gerados */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16 }}>📚</span>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: 'Syne, sans-serif' }}>Ebooks gerados</h2>
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

                    {/* Mockup do ebook */}
                    {ebook.status === 'completed' && ebook.pdf_url ? (
                      <EbookMockup title={ebook.title} pdfUrl={ebook.pdf_url} />
                    ) : (
                      <div style={{ width: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 120, height: 160, background: 'var(--surface2)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 32 }}>📄</span>
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px', fontFamily: 'Syne, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ebook.title}</p>
                      {ebook.created_at && (
                        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>
                          {new Date(ebook.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: ebook.status === 'completed' ? 'var(--green)' : ebook.status === 'failed' ? 'var(--red)' : 'var(--accent)',
                          background: ebook.status === 'completed' ? 'var(--green-light)' : ebook.status === 'failed' ? 'var(--red-light)' : 'var(--accent-light)',
                          padding: '3px 10px', borderRadius: 99,
                        }}>
                          {ebook.status === 'completed' ? '✓ Concluido' : ebook.status === 'failed' ? '✗ Erro' : '⏳ Processando'}
                        </span>
                      </div>
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
