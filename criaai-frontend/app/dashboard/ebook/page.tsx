'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface EbookFormData {
  title: string
  topic: string
  targetAudience: string
  tone: string
  chapters: string
  language: string
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

export default function EbookPage() {
  const supabase = createClientComponentClient()

  const [form, setForm] = useState<EbookFormData>({
    title: '',
    topic: '',
    targetAudience: '',
    tone: 'profissional e didático',
    chapters: '',
    language: 'pt-BR',
  })

  const [credits, setCredits] = useState<CreditInfo | null>(null)
  const [ebooks, setEbooks] = useState<GeneratedEbook[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)

  useEffect(() => { loadUserData() }, [])

  async function loadUserData() {
    setLoadingData(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('credits_ebooks_used, credits_ebooks_extra, plans(name, credits_ebooks)')
        .eq('id', user.id)
        .single()

      if (profile) {
        const plan = (profile as any).plans
        setCredits({
          used: profile.credits_ebooks_used ?? 0,
          limit: (plan?.credits_ebooks ?? 0) + (profile.credits_ebooks_extra ?? 0),
          planName: plan?.name ?? 'Starter',
        })
      }

      const { data: ebookList } = await supabase
        .from('ebooks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (ebookList) setEbooks(ebookList as GeneratedEbook[])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoadingData(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setUpgradeRequired(false)
    setLoading(true)

    try {
      const chaptersArray = form.chapters
        ? form.chapters.split('\n').map((c) => c.trim()).filter(Boolean)
        : []

      const res = await fetch('/api/generate-ebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          topic: form.topic,
          targetAudience: form.targetAudience || undefined,
          tone: form.tone || undefined,
          chapters: chaptersArray.length > 0 ? chaptersArray : undefined,
          language: form.language,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.upgradeRequired) {
          setUpgradeRequired(true)
          setError(data.details ?? 'Limite de créditos atingido.')
        } else {
          setError(data.error ?? 'Erro ao gerar ebook.')
        }
        return
      }

      setSuccess(`Ebook gerado com sucesso! ${data.creditsRemaining} crédito(s) restante(s).`)
      setForm({ title: '', topic: '', targetAudience: '', tone: 'profissional e didático', chapters: '', language: 'pt-BR' })
      await loadUserData()
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  function handleDownload(ebook: GeneratedEbook) {
    const url = `/api/generate-pdf?generationId=${encodeURIComponent(ebook.gamma_generation_id)}`
    const link = document.createElement('a')
    link.href = url
    link.download = `${ebook.title}.pdf`
    link.click()
  }

  const noCredits = credits !== null && credits.used >= credits.limit
  const remaining = credits ? credits.limit - credits.used : 0
  const pct = credits ? Math.min(100, Math.round((credits.used / credits.limit) * 100)) : 0

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0a120a',
    border: '1px solid #1e3a1e',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: '#9ca3af',
    marginBottom: '6px',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f0a', color: '#fff', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', background: '#1a3a1a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                📘
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>Ebook Builder</h1>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, paddingLeft: '42px' }}>Powered by Gamma · Documentos profissionais em PDF</p>
          </div>

          {/* Badge créditos */}
          {credits && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0f1a0f', border: '1px solid #1e3a1e', borderRadius: '12px', padding: '12px 16px' }}>
              <div style={{ width: '32px', height: '32px', background: '#1a3a1a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                📗
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px 0' }}>Créditos de Ebook</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: remaining <= 0 ? '#f87171' : remaining <= 1 ? '#fbbf24' : '#ffffff' }}>
                    {remaining} restantes
                  </span>
                  <span style={{ fontSize: '12px', color: '#4b5563' }}>/ {credits.limit} · {credits.planName}</span>
                </div>
                <div style={{ marginTop: '6px', height: '4px', width: '112px', background: '#1a2a1a', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: remaining <= 0 ? '#ef4444' : remaining <= 1 ? '#f59e0b' : '#4ade80', borderRadius: '999px' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alertas */}
        {upgradeRequired && (
          <div style={{ display: 'flex', gap: '12px', padding: '16px', borderRadius: '12px', background: 'rgba(120,53,15,0.2)', border: '1px solid rgba(180,83,9,0.3)', marginBottom: '16px' }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 600, color: '#fcd34d', margin: '0 0 4px 0', fontSize: '14px' }}>Créditos esgotados</p>
              <p style={{ color: '#fbbf24', margin: '0 0 8px 0', fontSize: '13px' }}>{error}</p>
              <a href="/dashboard/planos" style={{ color: '#fcd34d', fontSize: '12px', fontWeight: 500 }}>Ver planos →</a>
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

        {/* Formulário */}
        <div style={{ background: '#0d150d', border: '1px solid #1a2e1a', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a2e1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>📋</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Detalhes do Ebook</span>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div>
              <label style={labelStyle}>Título <span style={{ color: '#4ade80' }}>*</span></label>
              <input type="text" name="title" value={form.title} onChange={handleChange} placeholder="Ex: Guia Definitivo de Marketing Digital" required style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Tópico / Assunto principal <span style={{ color: '#4ade80' }}>*</span></label>
              <textarea name="topic" value={form.topic} onChange={handleChange} placeholder="Descreva o tema central, objetivo e contexto do ebook..." required rows={3} style={{ ...inputStyle, resize: 'none' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Público-alvo</label>
                <input type="text" name="targetAudience" value={form.targetAudience} onChange={handleChange} placeholder="Ex: empreendedores" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tom e estilo</label>
                <select name="tone" value={form.tone} onChange={handleChange} style={inputStyle}>
                  <option value="profissional e didático">Profissional e didático</option>
                  <option value="informal e acessível">Informal e acessível</option>
                  <option value="técnico e detalhado">Técnico e detalhado</option>
                  <option value="motivacional e inspirador">Motivacional e inspirador</option>
                  <option value="acadêmico e formal">Acadêmico e formal</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Capítulos <span style={{ color: '#6b7280', fontWeight: 400 }}>(opcional · um por linha)</span></label>
              <textarea name="chapters" value={form.chapters} onChange={handleChange} placeholder={"Introdução\nCapítulo 1\nConclusão"} rows={3} style={{ ...inputStyle, resize: 'none', fontFamily: 'monospace' }} />
            </div>

            <div>
              <label style={labelStyle}>Idioma</label>
              <select name="language" value={form.language} onChange={handleChange} style={inputStyle}>
                <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                <option value="en-US">🇺🇸 English (US)</option>
                <option value="es-ES">🇪🇸 Español</option>
              </select>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !form.title || !form.topic || noCredits}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                cursor: loading || noCredits || !form.title || !form.topic ? 'not-allowed' : 'pointer',
                background: loading || noCredits ? '#1a2e1a' : 'linear-gradient(135deg, #16a34a, #4ade80)',
                color: loading || noCredits ? '#4ade80' : '#0a0f0a',
                fontWeight: 700,
                fontSize: '14px',
                opacity: !form.title || !form.topic ? 0.5 : 1,
              }}
            >
              {loading ? '⏳ Gerando ebook — aguarde até 3 min...' : '✨ Gerar Ebook com IA'}
            </button>

            {loading && (
              <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', margin: 0 }}>
                ⚡ O Gamma está criando seu documento. Não feche esta aba.
              </p>
            )}
          </div>
        </div>

        {/* Histórico */}
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
              <p style={{ fontSize: '12px', color: '#374151', margin: 0 }}>Preencha o formulário acima para começar.</p>
            </div>
          ) : (
            <div style={{ background: '#0d150d', border: '1px solid #1a2e1a', borderRadius: '16px', overflow: 'hidden' }}>
              {ebooks.map((ebook, i) => (
                <div key={ebook.gamma_generation_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 20px', borderTop: i > 0 ? '1px solid #1a2e1a' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{ width: '28px', height: '28px', background: '#1a2e1a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px' }}>📄</div>
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
                      {ebook.status === 'completed' ? '● Concluído' : ebook.status === 'failed' ? '● Erro' : '● Processando'}
                    </span>
                    {ebook.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(ebook)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#1a3a1a', color: '#4ade80', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                      >
                        ⬇ PDF
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
