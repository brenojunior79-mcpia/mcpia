'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './ebook.module.css'

export default function EbookPage() {
  const [niche, setNiche] = useState('')
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [author, setAuthor] = useState('')
  const [chapters, setChapters] = useState('7')
  const [color, setColor] = useState('#7c5cfc')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<any>(null)
  const supabase = createClient()
  const steps = ['Analisando nicho...','Gerando estrutura...','Escrevendo com IA...','Aplicando design...','Pronto! ✓']
  const colors = ['#7c5cfc','#ef4444','#22c55e','#f59e0b','#0ea5e9','#ec4899']

  async function generate() {
    if (!niche || !title) return alert('Preencha o nicho e o título!')
    setLoading(true); setStep(0); setResult(null)
    for (let i = 0; i < steps.length - 1; i++) { await new Promise(r => setTimeout(r, 1000)); setStep(i + 1) }
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/generate-ebook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, body: JSON.stringify({ niche, title, subtitle, author, chapters: parseInt(chapters), color }) })
    const data = await res.json()
    setLoading(false)
    if (data.ebook) setResult(data)
    else alert('Erro: ' + (data.error || 'Tente novamente'))
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}><div><div className={styles.title}>Ebook Builder</div><div className={styles.sub}>Crie ebooks completos com IA para qualquer nicho</div></div></div>
      <div className={styles.content}>
        <div className={styles.grid}>
          <div className={styles.panel}>
            <div className={styles.sectionTitle}>Conteúdo</div>
            <div className={styles.field}><label>Nicho</label><input type="text" value={niche} onChange={e=>setNiche(e.target.value)} placeholder="Ex: emagrecimento, renda extra..."/></div>
            <div className={styles.field}><label>Título</label><input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex: Guia Completo de..."/></div>
            <div className={styles.field}><label>Subtítulo</label><input type="text" value={subtitle} onChange={e=>setSubtitle(e.target.value)} placeholder="Uma frase de impacto..."/></div>
            <div className={styles.field}><label>Autor</label><input type="text" value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Seu nome ou marca"/></div>
            <div className={styles.field}><label>Capítulos</label><select value={chapters} onChange={e=>setChapters(e.target.value)}><option value="5">5</option><option value="7">7</option><option value="10">10</option><option value="12">12</option></select></div>
            <div className={styles.field}><label>Cor</label><div className={styles.colorRow}>{colors.map(c=><div key={c} className={`${styles.colorSwatch} ${color===c?styles.colorActive:''}`} style={{background:c}} onClick={()=>setColor(c)}/>)}</div></div>
            <button className={styles.btnGenerate} onClick={generate} disabled={loading}>{loading?'Gerando...':<><i className="ti ti-sparkles"/>Gerar ebook com IA · 1 crédito</>}</button>
            {loading && <div className={styles.progress}>{steps.map((s,i)=><div key={i} className={`${styles.progStep} ${i<step?styles.done:i===step?styles.active:''}`}><div className={styles.dot}/><span>{s}</span></div>)}</div>}
          </div>
          <div className={styles.preview}>
            {result ? (
              <div className={styles.ebookCard}>
                <div className={styles.cover} style={{background:`linear-gradient(135deg,${color},${color}99)`}}>
                  <div className={styles.coverNiche}>{niche.toUpperCase()}</div>
                  <div className={styles.coverTitle}>{result.ebook.title}</div>
                  <div className={styles.coverSub}>{result.ebook.subtitle}</div>
                </div>
                <div className={styles.ebookBody}>
                  <div className={styles.tocTitle} style={{color}}>Sumário</div>
                  {result.ebook.chapters?.slice(0,5).map((c:any,i:number)=><div key={i} className={styles.tocItem}><span style={{color,fontWeight:700}}>{String(i+1).padStart(2,'0')}</span><span>{c.title}</span><span className={styles.tocPage}>{(i+1)*3+2}</span></div>)}
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}><i className="ti ti-book-2" style={{fontSize:48,color:'var(--muted)',display:'block',marginBottom:16}}/><div className={styles.emptyTitle}>Seu ebook aparece aqui</div><div className={styles.emptySub}>Preencha as informações e clique em gerar</div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
