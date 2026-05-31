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
        <div className={styles.logo}>Cria<span>AI</span></div>
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
                <div className={`${styles.tab} ${tab==='login'?styles.active:''}`} onClick={()=>setTab('login')}>Entrar</div>
                <div className={`${styles.tab} ${tab==='cadastro'?styles.active:''}`} onClick={()=>setTab('cadastro')}>Criar conta</div>
              </div>

              {error && <div className={styles.errorMsg}><i className="ti ti-alert-circle"/>{error}</div>}

              {tab === 'login' ? (
                <form onSubmit={handleLogin}>
                  <h2 className={styles.formTitle}>Bem-vindo de volta</h2>
                  <p className={styles.formSub}>Entre na sua conta para continuar</p>
                  <div className={styles.field}>
                    <label>E-mail</label>
                    <div className={styles.inputWrap}><i className="ti ti-mail"/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" required/></div>
                  </div>
                  <div className={styles.field}>
                    <label>Senha</label>
                    <div className={styles.inputWrap}><i className="ti ti-lock"/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/></div>
                  </div>
                  <button type="submit" className={styles.btnMain} disabled={loading}>
                    {loading ? 'Entrando...' : <><i className="ti ti-login"/> Entrar na plataforma</>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCadastro}>
                  <h2 className={styles.formTitle}>Criar sua conta</h2>
                  <p className={styles.formSub}>7 dias grátis, sem cartão de crédito</p>
                  <div className={styles.planSelector}>
                    {['Starter','Pro','Agency'].map(p => (
                      <div key={p} className={`${styles.planOpt} ${plan===p?styles.planOn:''}`} onClick={()=>setPlan(p)}>
                        <div className={styles.planName}>{p}</div>
                        <div className={styles.planPrice}>{p==='Starter'?'R$97':p==='Pro'?'R$197':'R$497'}/mês</div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.trialBadge}><i className="ti ti-gift"/>7 dias grátis · Sem cobrança agora</div>
                  <div className={styles.field}>
                    <label>Nome completo</label>
                    <div className={styles.inputWrap}><i className="ti ti-user"/><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="João Silva" required/></div>
                  </div>
                  <div className={styles.field}>
                    <label>E-mail</label>
                    <div className={styles.inputWrap}><i className="ti ti-mail"/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" required/></div>
                  </div>
                  <div className={styles.field}>
                    <label>Senha</label>
                    <div className={styles.inputWrap}><i className="ti ti-lock"/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" minLength={8} required/></div>
                  </div>
                  <button type="submit" className={styles.btnMain} disabled={loading}>
                    {loading ? 'Criando conta...' : <><i className="ti ti-rocket"/> Começar 7 dias grátis</>}
                  </button>
                </form>
              )}

              <div className={styles.dividerOr}><span>ou continue com</span></div>
              <button className={styles.btnGoogle} onClick={handleGoogle}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {tab==='login'?'Entrar':'Cadastrar'} com Google
              </button>
              <div className={styles.switchMode}>
                {tab==='login'?<>Não tem conta? <span onClick={()=>setTab('cadastro')}>Criar agora grátis</span></>:<>Já tem conta? <span onClick={()=>setTab('login')}>Entrar</span></>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
