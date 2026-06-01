'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'

export default function LoginPage() {
  const [tab, setTab] = useState<'login'|'cadastro'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [plan, setPlan] = useState('Starter')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('E-mail ou senha incorretos.'); setLoading(false); return }
    router.push('/dashboard')
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name, plan } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true); setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` }
    })
  }

  return (
    <div className={styles.split}>
      <div className={styles.left}>
        <div className={styles.logo}>MCP<span>.IA</span></div>
        <div className={styles.leftContent}>
          <div className={styles.tag}>✦ Plataforma de criativos com IA</div>
          <h1 className={styles.title}>Gere vídeos e ebooks<br/><span>em segundos</span></h1>
          <p className={styles.sub}>Suba a imagem do produto, a IA gera o criativo pronto para escalar no Facebook Ads.</p>
          <div className={styles.features}>
            {[
              ['ti-video', 'Vídeos gerados com Kling AI em 9:16 e 1:1'],
              ['ti-book-2', 'Ebooks completos com GPT-4o em qualquer nicho'],
              ['ti-speakerphone', 'Copy para Facebook Ads gerada automaticamente'],
              ['ti-shield-check', '7 dias grátis, cancele quando quiser'],
            ].map(([icon, text]) => (
              <div key={icon} className={styles.feature}>
                <div className={styles.featureDot}><i className={`ti ${icon}`}/></div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.testimonial}>
          <p>"Reduzi meu custo por criativo de R$80 para menos de R$5. A plataforma paga sozinha no primeiro dia."</p>
          <div className={styles.testAuthor}>
            <div className={styles.avatar}>MF</div>
            <div><div className={styles.testName}>Marcos Ferreira</div><div className={styles.testRole}>Gestor de tráfego · Pro</div></div>
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.authBox}>
          {success ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}><i className="ti ti-check"/></div>
              <h2>Conta criada! 🎉</h2>
              <p>Verifique seu e-mail para confirmar a conta e começar seus 7 dias grátis no plano {plan}.</p>
            </div>
          ) : (
            <>
              <div className={styles.tabs}>
                <div className={`${styles.tab} ${tab==='login'?styles.active:''}`} onClick={()=>setTab('
