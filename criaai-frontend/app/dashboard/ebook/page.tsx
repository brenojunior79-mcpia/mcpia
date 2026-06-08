'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BookOpen, Download, Loader2, Sparkles, AlertCircle, CheckCircle2, ChevronRight, FileText, Zap } from 'lucide-react'

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

function CreditBadge({ info }: { info: CreditInfo | null }) {
  if (!info) return null
  const remaining = info.limit - info.used
  const pct = Math.min(100, Math.round((info.used / info.limit) * 100))
  const isEmpty = remaining <= 0
  const isLow = remaining <= 1 && !isEmpty

  return (
    <div className="flex items-center gap-3 bg-[#0f1a0f] border border-[#1e3a1e] rounded-xl px-4 py-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isEmpty ? 'bg-red-900/40' : isLow ? 'bg-yellow-900/40' : 'bg-[#1a3a1a]'}`}>
        <BookOpen size={15} className={isEmpty ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-[#4ade80]'} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 leading-none mb-1">Créditos de Ebook</p>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isEmpty ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'}`}>
            {remaining} restantes
          </span>
          <span className="text-xs text-gray-600">/ {info.limit} · {info.planName}</span>
        </div>
        <div className="mt-1.5 h-1 w-28 bg-[#1a2a1a] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isEmpty ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-[#4ade80]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; dot: string; text: string }> = {
    completed: { label: 'Concluído', dot: 'bg-[#4ade80]', text: 'text-[#4ade80]' },
    processing: { label: 'Processando', dot: 'bg-blue-400', text: 'text-blue-400' },
    failed: { label: 'Erro', dot: 'bg-red-400', text: 'text-red-400' },
  }
  const s = map[status] ?? { label: status, dot: 'bg-gray-500', text: 'text-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
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
      const { data: { user } } = await supabase.auth.getUser()
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

  return (
    <div className="min-h-screen bg-[#0a0f0a] text-white">
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-[#1a3a1a] rounded-lg flex items-center justify-center">
                <BookOpen size={16} className="text-[#4ade80]" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Ebook Builder</h1>
            </div>
            <p className="text-xs text-gray-500 ml-10">Powered by Gamma · Documentos profissionais em PDF</p>
          </div>
          <CreditBadge info={credits} />
        </div>

        {/* Alertas */}
        {upgradeRequired && (
          <div className="flex gap-3 p-4 rounded-xl bg-yellow-950/40 border border-yellow-800/40 text-sm">
            <AlertCircle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-300">Créditos esgotados</p>
              <p className="text-yellow-400/80 mt-0.5">{error}</p>
              <a href="/dashboard/planos" className="inline-flex items-center gap-1 text-yellow-300 font-medium mt-2 text-xs hover:underline">
                Ver planos <ChevronRight size={12} />
              </a>
            </div>
          </div>
        )}

        {error && !upgradeRequired && (
          <div className="flex gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-sm">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex gap-3 p-4 rounded-xl bg-green-950/40 border border-green-800/40 text-sm">
            <CheckCircle2 size={16} className="text-[#4ade80] shrink-0 mt-0.5" />
            <p className="text-green-300">{success}</p>
          </div>
        )}

        {/* Formulário */}
        <div className="bg-[#0d150d] border border-[#1a2e1a] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a2e1a] flex items-center gap-2">
            <FileText size={14} className="text-[#4ade80]" />
            <span className="text-sm font-semibold text-white">Detalhes do Ebook</span>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Título <span className="text-[#4ade80]">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Ex: Guia Definitivo de Marketing Digital"
                required
                className="w-full bg-[#0a120a] border border-[#1e3a1e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#4ade80]/50 focus:ring-1 focus:ring-[#4ade80]/20 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Tópico / Assunto principal <span className="text-[#4ade80]">*</span>
              </label>
              <textarea
                name="topic"
                value={form.topic}
                onChange={handleChange}
                placeholder="Descreva o tema central, objetivo e contexto do ebook..."
                required
                rows={3}
                className="w-full bg-[#0a120a] border border-[#1e3a1e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#4ade80]/50 focus:ring-1 focus:ring-[#4ade80]/20 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Público-alvo</label>
                <input
                  type="text"
                  name="targetAudience"
                  value={form.targetAudience}
                  onChange={handleChange}
                  placeholder="Ex: empreendedores"
                  className="w-full bg-[#0a120a] border border-[#1e3a1e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#4ade80]/50 focus:ring-1 focus:ring-[#4ade80]/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Tom e estilo</label>
                <select
                  name="tone"
                  value={form.tone}
                  onChange={handleChange}
                  className="w-full bg-[#0a120a] border border-[#1e3a1e] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4ade80]/50 focus:ring-1 focus:ring-[#4ade80]/20 transition-colors"
                >
                  <option value="profissional e didático">Profissional e didático</option>
                  <option value="informal e acessível">Informal e acessível</option>
                  <option value="técnico e detalhado">Técnico e detalhado</option>
                  <option value="motivacional e inspirador">Motivacional e inspirador</option>
                  <option value="acadêmico e formal">Acadêmico e formal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Capítulos <span className="text-gray-600 font-normal">(opcional · um por linha)</span>
              </label>
              <textarea
                name="chapters"
                value={form.chapters}
                onChange={handleChange}
                placeholder={"Introdução\nCapítulo 1\nConclusão"}
                rows={3}
                className="w-full bg-[#0a120a] border border-[#1e3a1e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#4ade80]/50 focus:ring-1 focus:ring-[#4ade80]/20 transition-colors resize-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Idioma</label>
              <select
                name="language"
                value={form.language}
                onChange={handleChange}
                className="w-full bg-[#0a120a] border border-[#1e3a1e] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4ade80]/50 focus:ring-1 focus:ring-[#4ade80]/20 transition-colors"
              >
                <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                <option value="en-US">🇺🇸 English (US)</option>
                <option value="es-ES">🇪🇸 Español</option>
              </select>
            </div>

            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !form.title || !form.topic || noCredits}
              className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all text-sm mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: loading || noCredits ? '#1a2e1a' : 'linear-gradient(135deg, #16a34a, #4ade80)',
                color: loading || noCredits ? '#4ade80' : '#0a0f0a',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Gerando ebook — aguarde até 3 min...
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  Gerar Ebook com IA
                </>
              )}
            </button>

            {loading && (
              <div className="flex items-center gap-2 justify-center">
                <Zap size={12} className="text-[#4ade80]" />
                <p className="text-xs text-center text-gray-500">
                  O Gamma está criando seu documento. Não feche esta aba.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Histórico */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-300">Ebooks gerados</h2>
          </div>

          {loadingData ? (
            <div className="flex items-center gap-2 text-gray-600 text-sm py-6 justify-center">
              <Loader2 size={14} className="animate-spin" />
              Carregando...
            </div>
          ) : ebooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-[#1a2e1a] rounded-2xl">
              <BookOpen size={24} className="text-gray-700 mb-2" />
              <p className="text-sm text-gray-600">Nenhum ebook gerado ainda.</p>
              <p className="text-xs text-gray-700 mt-1">Preencha o formulário acima para começar.</p>
            </div>
          ) : (
            <div className="bg-[#0d150d] border border-[#1a2e1a] rounded-2xl overflow-hidden divide-y divide-[#1a2e1a]">
              {ebooks.map((ebook) => (
                <div key={ebook.gamma_generation_id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#0f1a0f] transition-colors">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-7 h-7 bg-[#1a2e1a] rounded-lg flex items-center justify-center shrink-0">
                      <FileText size={13} className="text-[#4ade80]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{ebook.title}</p>
                      {ebook.created_at && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {new Date(ebook.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={ebook.status} />
                    {ebook.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(ebook)}
                        className="flex items-center gap-1.5 text-xs bg-[#1a3a1a] hover:bg-[#1e4a1e] text-[#4ade80] font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Download size={12} />
                        PDF
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
