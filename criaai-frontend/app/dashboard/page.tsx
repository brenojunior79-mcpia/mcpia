'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [niche, setNiche] = useState('')
  const [tone, setTone] = useState('lifestyle')
  const [format, setFormat] = useState('9:16')
  const [music, setMusic] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState('')
  const supabase = createClient()

  const steps = [
    'Analisando imagem do produto...',
    'Gerando prompt com GPT-4o...',
    'Enviando para Kling AI...',
    'Processando vídeo...',
    'Adicionando copy e música...',
    'Criativo pronto! ✓'
  ]

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  async function generate() {
    if (!image || !niche) return alert('Suba uma imagem e preencha o nicho!')
    setLoading(true); setStep(0)

    // Simular progresso enquanto processa
    for (let i = 0; i < steps.length - 1; i++) {
      await new Promise(r => setTimeout(r, 1200))
      setStep(i + 1)
    }

    // Upload imagem para Supabase Storage
    const { data: { session } } = await supabase.auth.getSession()
    const fileName = `${Date.now()}-${image.name}`
    await supabase.storage.from('products').upload(fileName, image)
    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName)

    // Chamar API
    const res = await fetch('/api/generate-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ imageUrl: publicUrl, niche, tone, format })
    })

    const data = await res.json()
    setLoading(false)
    if (data.videoUrl) setResult(data.videoUrl)
    else alert('Erro: ' + data.error)
  }

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
          {[
            { label: 'Vídeos gerados', value: '24', sub: '↑ 8 essa semana' },
            { label: 'Criativos ativos', value: '12', sub: '↑ 3 hoje' },
            { label: 'Créditos usados', value: '32', sub: '68 restantes' },
            { label: 'Economia estimada', value: 'R$2.4k', sub: 'vs agência' },
          ].map(s => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statSub}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div className={styles.uploadSection}>
          <div className={`${styles.uploadBox} ${preview?styles.hasImage:''}`} onClick={() => document.getElementById('file-input')?.click()}>
            <input id="file-input" type="file" accept="image/*" style={{display:'none'}} onChange={handleUpload}/>
            {preview ? (
              <>
                <img src={preview} alt="preview" className={styles.previewImg}/>
                <div className={styles.uploadSub}>Clique para trocar</div>
              </>
            ) : (
              <>
                <i className="ti ti-photo-up" style={{fontSize:32,color:'var(--muted)',display:'block',marginBottom:12}}/>
                <div className={styles.uploadTitle}>Imagem do produto</div>
                <div className={styles.uploadSub}>PNG, JPG ou WEBP · Máx 10MB</div>
              </>
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
                {['9:16','1:1','ambos'].map(f => (
                  <div key={f} className={`${styles.toggleBtn} ${format===f?styles.toggleOn:''}`} onClick={()=>setFormat(f)}>{f === '9:16' ? '9:16 Stories' : f === '1:1' ? '1:1 Feed' : 'Ambos'}</div>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label>Música</label>
              <select value={music} onChange={e=>setMusic(e.target.value)}>
                <option value="auto">Automática (IA escolhe)</option>
                <option value="trending">Trending / viral</option>
                <option value="calm">Calma / lifestyle</option>
                <option value="energy">Energética / hype</option>
                <option value="none">Sem música</option>
              </select>
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
                <div className={styles.progDot}/>
                <span>{s}</span>
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
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
