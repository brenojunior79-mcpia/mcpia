'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const [niche, setNiche] = useState('')
  const [tone, setTone] = useState('lifestyle')
  const [format, setFormat] = useState('9:16')
  const [customPrompt, setCustomPrompt] = useState('')
  const [duration, setDuration] = useState('10')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ videos: 0, ebooks: 0, creditsUsed: 0, creditsLimit: 15 })
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  const steps = [
    'Gerando roteiro com GPT-4o...',
    'Enviando para Kling AI...',
    'Processando vídeo...',
    'Finalizando criativo...',
    'Criativo pronto! ✓'
  ]

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('*, plans(name, credits_videos, credits_ebooks, is_unlimited, price_monthly)')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
        const { data: gens } = await supabase.from('generations').select('type').eq('user_id', user.id)
        const videos = gens?.filter(g => g.type === 'video').length || 0
        const ebooks = gens?.filter(g => g.type === 'ebook').length || 0
        setStats({
          videos,
          ebooks,
          creditsUsed: data.credits_videos_used || 0,
          creditsLimit: (data.plans?.credits_videos || 15) + (data.credits_videos_extra || 0)
        })
      }
    }
    loadProfile()
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  async function pollStatus(taskId: string, session: any) {
    let attempts = 0
    const maxAttempts = 120

    pollingRef.current = setInterval(async () => {
      attempts++
      setStep(Math.min(2 + Math.floor(attempts / 5), 3))

      try {
        const res = await fetch(`/api/generate-video/status?taskId=${taskId}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
        const data = await res.json()

        if (data.status === 'completed' && data.videoUrl) {
          clearInterval(pollingRef.current!)
          setStep(4)
          setResult(data.videoUrl)
          setLoading(false)
          setStats(s => ({ ...s, videos: s.videos + 1, creditsUsed: s.creditsUsed + 1 }))
        } else if (data.status === 'failed' || attempts >= maxAttempts) {
          clearInterval(pollingRef.current!)
          setLoading(false)
          alert(data.error || 'Timeout na geração. Tente novamente.')
        }
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(pollingRef.current!)
          setLoading(false)
          alert('Erro ao verificar status. Tente novamente.')
        }
      }
    }, 5000)
  }

  async function generate() {
    if (!niche && !customPrompt) {
      alert('Preencha o nicho ou descreva o criativo!')
      return
    }
    setLoading(true)
    setStep(0)
    setResult('')

    const { data: { session } } = await supabase.auth.getSession()

    setStep(1)
    const res = await fetch('/api/generate-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({
        imageUrl: null,
        niche,
        tone,
        format,
        customPrompt,
        duration: parseInt(duration),
      })
    })
    const data = await res.json()

    if (!data.taskId) {
      setLoading(false)
      alert('Erro: ' + (data.error || 'Tente novamente'))
      return
    }

    setStep(2)
    await pollStatus(data.taskId, session)
  }

  const plan = profile?.plans
  const economia = Math.round((stats.videos * 80 + stats.ebooks * 30))

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.pageTitle}>Gerar vídeo</div>
          <div className={styles.pageSub}>Descreva seu criativo e a IA gera o vídeo automaticamente</div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Vídeos gerados</div>
            <div className={styles.statValue}>{stats.videos}</div>
            <div className={styles.statSub}>total na conta</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Ebooks gerados</div>
            <div className={styles.statValue}>{stats.ebooks}</div>
            <div className={styles.statSub}>total na conta</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Créditos usados</div>
            <div className={styles.statValue}>{stats.creditsUsed}</div>
            <div className={styles.statSub}>{plan?.is_unlimited ? '∞' : stats.creditsLimit - stats.creditsUsed} restantes</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Economia estimada</div>
            <div className={styles.statValue}>R${economia}</div>
            <div className={styles.statSub}>vs agência</div>
          </div>
        </div>

        <div className={styles.configPanel} style={{ maxWidth: 700 }}>
          <div className={styles.configTitle}>Configurações do criativo</div>

          <div className={styles.field}>
            <label>Nicho / produto</label>
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="Ex: skincare, tênis, suplemento, curso online..."
            />
          </div>

          <div className={styles.field}>
            <label>Descreva seu criativo <span style={{ color: 'var(--accent2)', fontSize: 12 }}>(quanto mais detalhado, melhor)</span></label>
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="Ex: Uma mulher jovem de 25 anos, sorrindo, segurando o produto na mão direita, em uma sala iluminada, olhando para a câmera com expressão animada. Fundo desfocado, estilo UGC, tom inspirador."
              rows={5}
              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 14px', color: 'var(--text)', fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div className={styles.field}>
            <label>Tom do criativo</label>
            <div className={styles.toggleGroup}>
              {['lifestyle', 'urgência', 'luxo', 'humor'].map(t => (
                <div
                  key={t}
                  className={`${styles.toggleBtn} ${tone === t ? styles.toggleOn : ''}`}
                  onClick={() => setTone(t)}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label>Duração do vídeo</label>
            <div className={styles.toggleGroup}>
              {[['5', '5 segundos'], ['10', '10 segundos']].map(([v, l]) => (
                <div
                  key={v}
                  className={`${styles.toggleBtn} ${duration === v ? styles.toggleOn : ''}`}
                  onClick={() => setDuration(v)}
                >
                  {l}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label>Formato</label>
            <div className={styles.toggleGroup}>
              {[['9:16', '9:16 Stories'], ['1:1', '1:1 Feed'], ['ambos', 'Ambos']].map(([v, l]) => (
                <div
                  key={v}
                  className={`${styles.toggleBtn} ${format === v ? styles.toggleOn : ''}`}
                  onClick={() => setFormat(v)}
                >
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          className={styles.btnGenerate}
          onClick={generate}
          disabled={loading}
          style={{ maxWidth: 700 }}
        >
          {loading
            ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Gerando...</>
            : <><i className="ti ti-sparkles" /> Gerar criativo com IA · 1 crédito</>
          }
        </button>

        {loading && (
          <div className={styles.progressWrap}>
            {steps.map((s, i) => (
              <div
                key={i}
                className={`${styles.progStep} ${i < step ? styles.done : i === step ? styles.stepActive : ''}`}
              >
                <div className={styles.progDot} /><span>{s}</span>
              </div>
            ))}
          </div>
        )}

        {result && (
          <div className={styles.resultBox}>
            <video src={result} controls className={styles.resultVideo} />
            <a href={result} download className={styles.downloadBtn}>
              <i className="ti ti-download" /> Baixar vídeo
            </a>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
