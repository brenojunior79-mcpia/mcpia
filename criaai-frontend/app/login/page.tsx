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
            <div>
              <div className={styles.testName}>Marcos Ferreira</div>
              <div className={styles.testRole}>Gestor de tráfego · Pro</div>
            </div>
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
                <div
                  className={`${styles.tab} ${tab==='login' ? styles.active : ''}`}
                  onClick={() => setTab('login')}
                >Entrar</div>
                <div
                  className={`${styles.tab} ${tab==='cadastro' ? styles.active : ''}`}
                  onClick={() => setTab('cadastro')}
                >Criar conta</div>
              </div>

              <button className={styles.googleBtn} onClick={handleGoogle}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                Continuar com Google
              </button>

              <div className={styles.divider}><span>ou</span></div>

              {tab === 'login' ? (
                <form onSubmit={handleLogin} className={styles.form}>
                  <div className={styles.field}>
                    <label>E-mail</label>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" required />
                  </div>
                  <div className={styles.field}>
                    <label>Senha</label>
                    <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  {error && <div className={styles.error}>{error}</div>}
                  <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCadastro} className={styles.form}>
                  <div className={styles.field}>
                    <label>Nome completo</label>
                    <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" required />
                  </div>
                  <div className={styles.field}>
                    <label>E-mail</label>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" required />
                  </div>
                  <div className={styles.field}>
                    <label>Senha</label>
                    <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
                  </div>
                  <div className={styles.field}>
                    <label>Plano de interesse</label>
                    <select value={plan} onChange={e=>setPlan(e.target.value)}>
                      <option value="Starter">Starter</option>
                      <option value="Pro">Pro</option>
                      <option value="Agency">Agency</option>
                    </select>
                  </div>
                  {error && <div className={styles.error}>{error}</div>}
                  <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? 'Criando conta...' : 'Criar conta grátis'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
