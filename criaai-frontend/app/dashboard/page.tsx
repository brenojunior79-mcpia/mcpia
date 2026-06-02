'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [niche, setNiche] = useState('')
  const [tone, setTone] = useState('lifestyle')
  const [format, setFormat] = useState('9:16')
  const [customPrompt, setCustomPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ videos: 0, ebooks: 0, creditsUsed: 0, creditsLimit: 15 })
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  const steps = [
    'Analisando imagem do produto...',
    'Gerando prompt com GPT-4o...',
    'Enviando para Kling AI...',
    'Processando vídeo...',
    'Adicionando copy e música...',
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

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  async function pollStatus(taskId: string, session: any) {
    let attempts = 0
    const maxAttempts = 36

    pollingRef.current = setInterval(async () => {
      attempts++
      setStep(Math.min(3 + Math.floor(attempts / 4), 4))

      try {
        const res = await fetch(`/api/generate-video/status?taskId=${taskId}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
        const data = await res.json()

        if (data.status === 'completed' && data.videoUrl) {
          clearInterval(pollingRef.current!)
          setStep(5)
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
    if (!image || !niche) return alert('Sobe uma imagem e preencha o nicho!')
    setLoading(true); setStep(0); setResult('')

    const { data: { session } } = await supabase.auth.getSession()

    setStep(1)
    const fileName = `${Date.now()}-${image.name}`
    await supabase.storage.from('products').upload(fileName, image)
    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName)

    setStep(2)
    const res = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ imageUrl: publicUrl, niche, tone, format, customPrompt })
    })
    const data = await res.json()

    if (!data.taskId) {
      setLoading(false)
      alert('Erro: ' + (data.error || 'Tente novamente'))
      return
    }

    setStep(3)
    await pollStatus(data.taskId, session)
  }

  const plan = profile?.plans
  const economia = Math.round((stats.videos * 80 + stats.ebooks * 30))

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.pageTitle}>Gerar vídeo</div>
          <div className={styles.pageSub}>Suba a imagem do produto e gere seu criativo</div>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.stats}>
          <div className={styles.statCard}><div className={styles.statLabel}>Vídeos gerados</div><div className={styles.statValue}>{stats.videos}</div><div className={styles.statSub}>total na conta</div></div>
          <div className={styles.statCard}><div className={styles.statLabel}>Ebooks gerados</div><div className={styles.statValue}>{stats.ebooks}</div><div className={styles.statSub}>total na conta</div></div>
          <div className={styles.statCard}><div className={styles.statLabel}>Créditos usados</div><div className={styles.statValue}>{stats.creditsUsed}</div><div className={styles.statSub}>{plan?.is_unlimited ? '∞' : stats.creditsLimit - stats.creditsUsed} restantes</div></div>
          <div className={styles.statCard}><div className={styles.statLabel}>Economia estimada</div><div className={styles.statValue}>R${economia}</div><div className={styles.statSub}>vs agência</div></div>
        </div>

        <div className={styles.uploadSection}>
          <div className={`${styles.uploadBox} ${preview?styles.hasImage:''}`} onClick={() => document.getElementById('file-input')?.click()}>
            <input id="file-input" type="file" accept="image/*" style={{display:'none'}} onChange={handleUpload}/>
            {preview ? (
              <><img src={preview} alt="preview" className={styles.previewImg}/><div className={styles.uploadSub}>Clique para trocar</div></>
            ) : (
              <><i className="ti ti-photo-up" style={{fontSize:32,color:'var(--muted)',display:'block',marginBottom:12}}/><div className={styles.uploadTitle}>Imagem do produto</div><div className={styles.uploadSub}>PNG, JPG ou WEBP · Máx 10MB</div></>
            )}
          </div>

          <div className={styles.configPanel}>
            <div className={styles.configTitle}>Configurações</div>
            <div className={styles.field}>
              <label>Nicho / produto</label>
              <input type="text" value={niche} onChange={e=>setNiche(e.target.value)} placeholder="Ex: skincare, tênis, suplemento..."/>
            </div>
            <div className={styles.field}>
              <label>Tom do criativo</label>
              <div className={styles.toggleGroup}>
                {['lifestyle','urgência','luxo','humor'].map(t => (
                  <div key={t} className={`${styles.toggleBtn} ${tone===t?styles.toggleOn:''}`} onClick={()=>setTone(t)}>{t}</div>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label>Formato</label>
              <div className={styles.toggleGroup}>
                {[['9:16','9:16 Stories'],['1:1','1:1 Feed'],['ambos','Ambos']].map(([v,l]) => (
                  <div key={v} className={`${styles.toggleBtn} ${format===v?styles.toggleOn:''}`} onClick={()=>setFormat(v)}>{l}</div>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label>Detalhe seu criativo (opcional)</label>
              <textarea
                value={customPrompt}
                onChange={e=>setCustomPrompt(e.target.value)}
                placeholder="Ex: quero que mostre o produto sendo usado por uma mulher jovem..."
                rows={3}
                style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:9,padding:'10px 14px',color:'var(--text)',fontSize:14,fontFamily:'DM Sans, sans-serif',outline:'none',resize:'vertical'}}
              />
            </div>
          </div>
        </div>

        <button className={styles.btnGenerate} onClick={generate} disabled={loading}>
          {loading ? <><i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}}/> Gerando...</> : <><i className="ti ti-sparkles"/> Gerar criativo com IA · 1 crédito</>}
        </button>

        {loading && (
          <div className={styles.progressWrap}>
            {steps.map((s, i) => (
              <div key={i} className={`${styles.progStep} ${i < step ? styles.done : i === step ? styles.stepActive : ''}`}>
                <div className={styles.progDot}/><span>{s}</span>
              </div>
            ))}
          </div>
        )}

        {result && (
          <div className={styles.resultBox}>
            <video src={result} controls className={styles.resultVideo}/>
            <a href={result} download className={styles.downloadBtn}><i className="ti ti-download"/> Baixar vídeo</a>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
