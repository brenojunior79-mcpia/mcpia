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
          <div classNa
