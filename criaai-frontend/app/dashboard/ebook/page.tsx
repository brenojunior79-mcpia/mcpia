'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BookOpen, Download, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'

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
  const isLow = remaining <= 1
  const isEmpty = remaining <= 0

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
      isEmpty ? 'bg-red-50 border-red-200 text-red-700'
      : isLow ? 'bg-amber-50 border-amber-200 text-amber-700'
      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
    }`}>
      <BookOpen size={14} />
      <span>{remaining} de {info.limit} ebooks — Plano {info.planName}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    completed: { label: 'Concluído', className: 'bg-emerald-100 text-emerald-700' },
    processing: { label: 'Processando', className: 'bg-blue-100 text-blue-700' },
    failed: { label: 'Erro', className: 'bg-red-100 text-red-700' },
  }
  const s = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>
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
          planName: plan?.name ?? 'Desconhecido',
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

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={24} />
            Gerar Ebook com IA
          </h1>
          <p className="text-gray-500 text-sm mt-1">Powered by Gamma — documentos profissionais em PDF</p>
        </div>
        <CreditBadge info={credits} />
      </div>

      {upgradeRequired && (
        <div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Créditos esgotados</p>
            <p>{error}</p>
            <a href="/dashboard/planos" className="underline font-medium mt-1 inline-block">Ver planos disponíveis →</a>
          </div>
        </div>
      )}

      {error && !upgradeRequired && (
        <div className="flex gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <p>{success}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-800">Detalhes do Ebook</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-red-500">*</span></label>
            <input type="text" name="title" value={form.title} onChange={handleChange} placeholder="Ex: Guia Definitivo de Marketing Digital" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tópico <span className="text-red-500">*</span></label>
            <textarea name="topic" value={form.topic} onChange={handleChange} placeholder="Descreva o tema central..." required rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Público-alvo</label>
              <input type="text" name="targetAudience" value={form.targetAudience} onChange={handleChange} placeholder="Ex: empreendedores iniciantes" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tom e estilo</label>
              <select name="tone" value={form.tone} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="profissional e didático">Profissional e didático</option>
                <option value="informal e acessível">Informal e acessível</option>
                <option value="técnico e detalhado">Técnico e detalhado</option>
                <option value="motivacional e inspirador">Motivacional e inspirador</option>
                <option value="acadêmico e formal">Acadêmico e formal</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capítulos <span className="text-gray-400 font-normal">(opcional — um por linha)</span></label>
            <textarea name="chapters" value={form.chapters} onChange={handleChange} placeholder={"Introdução\nCapítulo 1\nConclusão"} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
            <select name="language" value={form.language} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </select>
          </div>
        </div>

        <button type="submit" onClick={handleSubmit} disabled={loading || !form.title || !form.topic || (credits !== null && credits.used >= credits.limit)} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-2.5 rounded-xl transition-colors text-sm">
          {loading ? <><Loader2 size={16} className="animate-spin" />Gerando ebook (pode levar até 3 min)...</> : <><Sparkles size={16} />Gerar Ebook</>}
        </button>

        {loading && <p className="text-xs text-center text-gray-400">O Gamma está criando seu documento. Não feche esta aba.</p>}
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">Ebooks gerados</h2>
        {loadingData ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-4"><Loader2 size={16} className="animate-spin" />Carregando...</div>
        ) : ebooks.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Nenhum ebook gerado ainda.</p>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
            {ebooks.map((ebook) => (
              <div key={ebook.gamma_generation_id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{ebook.title}</p>
                  {ebook.created_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(ebook.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={ebook.status} />
                  {ebook.status === 'completed' && (
                    <button onClick={() => handleDownload(ebook)} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                      <Download size={14} />PDF
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
