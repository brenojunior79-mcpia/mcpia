'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from '../dashboard.module.css'

export default function CriativoPage() {
  const [niche, setNiche] = useState('')
  const [tone, setTone] = useState('lifestyle')
  const [format, setFormat] = useState('9:16')
  const [customPrompt, setCustomPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState('')
  const [script, setScript] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [stats, setStats] = useState({ videos: 0, ebooks: 0, creditsUsed: 0, creditsLimit: 15 })
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  const steps = [
    'Gerando roteiro com GPT-4o...',
    'Criando video com Creatomate...',
    'Processando video...',
    'Finalizando criativo...',
    'Criativo pronto!',
  ]

  useEffect(function() {
    async function loadProfile() {
      const userResult = await supabase.auth.getUser()
      const user = userResult.data.user
      if (!user) return
      const profileResult = await supabase
        .from('profiles')
        .select('*, plans(name, credits_videos, credits_ebooks, is_unlimited, price_monthly)')
        .eq('id', user.id)
        .single()
      const data = profileResult.data
      if (data) {
        setProfile(data)
        const status = data.subscription_status
        setHasSubscription(status === 'active' || status === 'trialing')
        const gensResult = await supabase.from('generations').select('type').eq('user_id', user.id)
        const gens = gensResult.data || []
        const videos = gens.filter(function(g) { return g.type === 'video' }).length
        const ebooks = gens.filter(function(g) { return g.type === 'ebook' }).length
        setStats({
          videos,
          ebooks,
          creditsUsed: data.credits_videos_used || 0,
          creditsLimit: (data.plans?.credits_videos || 15) + (data.credits_videos_extra || 0),
        })
      }
    }
    loadProfile()
    return function() { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  async function pollStatus(renderId: string) {
    let attempts = 0
    const maxAttempts = 60
    pollingRef.current = setInterval(async function() {
      attempts++
      setStep(Math.min(2 + Math.floor(attempts / 5), 3))
      try {
        const sessionResult = await supabase.auth.getSession()
        const session = sessionResult.data.session
        const res = await fetch('/api/generate-video/status?renderId=' + renderId, {
          headers: { 'Authorization': 'Bearer ' + (session ? session.access_token : '') }
        })
        const data = await res.json()
        if (data.status === 'completed' && data.videoUrl) {
          clearInterval(pollingRef.current!)
          setStep(4)
          setResult(data.videoUrl)
          setLoading(false)
          setStats(function(s) { return { ...s, videos: s.videos + 1, creditsUsed: s.creditsUsed + 1 } })
        } else if (data.status === 'failed' || attempts >= maxAttempts) {
          clearInterval(pollingRef.current!)
          setLoading(false)
          alert(data.error || 'Timeout na geracao. Tente novamente.')
        }
      } catch (e) {
        if (attempts >= maxAttempts) {
          clearInterval(pollingRef.current!)
          setLoading(false)
          alert('Erro ao verificar status. Tente novamente.')
        }
      }
    }, 5000)
  }

  async function generate() {
    if (!hasSubscription) {
      window.location.href = '/dashboard/planos'
      return
    }
    if (!niche && !customPrompt) {
      alert('Preencha o nicho ou descreva o criativo!')
      return
    }
    setLoading(true)
    setStep(0)
    setResult('')
    setScript(null)
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, tone, format, customPrompt }),
      })
      const data = await res.json()
      if (!data.renderId) {
        setLoading(false)
        if (data.requiresPlan) {
          window.location.href = '/dashboard/planos'
        } else {
          alert('Erro: ' + (data.error || 'Tente novamente'))
        }
        return
      }
      setScript(data.script)
      setStep(1)
      await pollStatus(data.renderId)
    } catch (err) {
      setLoading(false)
      alert('Erro inesperado. Tente novamente.')
    }
  }

  const plan = profile?.plans
  const economia = Math.round((stats.videos * 80 + stats.ebooks * 30))

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.pageTitle}>Criador de Criativos</div>
          <div className={styles.pageSub}>Descreva seu criativo e a IA gera o video automaticamente</div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Videos gerados</div>
            <div className={styles.statValue}>{stats.videos}</div>
            <div className={styles.statSub}>total na conta</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Ebooks gerados</div>
            <div className={styles.statValue}>{stats.ebooks}</div>
            <div className={styles.statSub}>total na conta</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Creditos usados</div>
            <div className={styles.statValue}>{stats.creditsUsed}</div>
            <div className={styles.statSub}>{plan?.is_unlimited ? '' : stats.creditsLimit - stats.creditsUsed} restantes</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Economia estimada</div>
            <div className={styles.statValue}>R${economia}</div>
            <div className={styles.statSub}>vs agencia</div>
          </div>
        </div>

        {hasSubscription === false && (
          <div style={{ maxWidth: 700, display: 'flex', gap: 12, padding: 16, borderRadius: 12, background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.25)', marginBottom: 16 }}>
            <span>🔒</span>
            <div>
              <p style={{ fontWeight: 600, color: '#a78bfa', margin: '0 0 4px 0', fontSize: 14 }}>Recurso exclusivo para assinantes</p>
              <p style={{ color: '#9ca3af', margin: '0 0 8px 0', fontSize: 13 }}>Assine um plano para gerar videos com IA.</p>
              <a href="/dashboard/planos" style={{ color: '#7c5cfc', fontSize: 13, fontWeight: 600 }}>Ver planos</a>
            </div>
          </div>
        )}

        <div className={styles.configPanel} style={{ maxWidth: 700 }}>
          <div className={styles.configTitle}>Configuracoes do criativo</div>
          <div className={styles.field}>
            <label>Niche / produto</label>
            <input type="text" value={niche} onChange={function(e) { setNiche(e.target.value) }} placeholder="Ex: skincare, curso online, suplemento, ebook..." />
          </div>
          <div className={styles.field}>
            <label>Descreva seu criativo <span style={{ color: 'var(--accent2)', fontSize: 12 }}>(quanto mais detalhado, melhor)</span></label>
            <textarea value={customPrompt} onChange={function(e) { setCustomPrompt(e.target.value) }} placeholder="Ex: Quero um video para mulheres 25-40 anos que querem emagrecer." rows={4} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div className={styles.field}>
            <label>Tom do criativo</label>
            <div className={styles.toggleGroup}>
              {['lifestyle', 'urgencia', 'luxo', 'humor'].map(function(t) {
                return (
                  <div key={t} className={styles.toggleBtn + (tone === t ? ' ' + styles.toggleOn : '')} onClick={function() { setTone(t) }}>{t}</div>
                )
              })}
            </div>
          </div>
          <div className={styles.field}>
            <label>Formato</label>
            <div className={styles.toggleGroup}>
              {[['9:16', '9:16 Stories'], ['1:1', '1:1 Feed']].map(function(item) {
                return (
                  <div key={item[0]} className={styles.toggleBtn + (format === item[0] ? ' ' + styles.toggleOn : '')} onClick={function() { setFormat(item[0]) }}>{item[1]}</div>
                )
              })}
            </div>
          </div>
        </div>

        <button
          className={styles.btnGenerate}
          onClick={generate}
          disabled={loading}
          style={{ maxWidth: 700, background: hasSubscription === false ? 'linear-gradient(135deg, #7c5cfc, #9b6dfc)' : undefined }}
        >
          {hasSubscription === false ? 'Assinar para gerar videos' : loading ? 'Gerando...' : 'Gerar criativo com IA - 1 credito'}
        </button>

        {loading && (
          <div className={styles.progressWrap}>
            {steps.map(function(s, i) {
              return (
                <div key={i} className={styles.progStep + (i < step ? ' ' + styles.done : i === step ? ' ' + styles.stepActive : '')}>
                  <div className={styles.progDot} /><span>{s}</span>
                </div>
              )
            })}
          </div>
        )}

        {script && !result && (
          <div style={{ maxWidth: 700, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 10, fontWeight: 600 }}>ROTEIRO GERADO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[script.text1, script.text2, script.text3, script.text4].map(function(text, i) {
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{['Hook', 'Problema', 'Beneficio', 'CTA'][i]}</span>
                    <span style={{ fontSize: 14, color: 'var(--text)' }}>{text}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {result && (
          <div className={styles.resultBox}>
            <video src={result} controls className={styles.resultVideo} />
            <a href={result} download className={styles.downloadBtn}>Baixar video</a>
          </div>
        )}
      </div>
    </div>
  )
}
