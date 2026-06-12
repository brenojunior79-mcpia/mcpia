'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'

export default function LoginPage() {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [plan, setPlan] = useState('Starter')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, plan } },
    })
    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + '/dashboard',
    })
    setResetLoading(false)
    setResetSent(true)
  }

  return (
    <div className={styles.split}>
      <div className={styles.right}>
        <div className={styles.logo}>MCP<span>.IA</span></div>

        <div className={styles.authBox}>
          {success ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>
                <i className="ti ti-mail" />
              </div>
              <h2>Verifique seu e-mail!</h2>
              <p>Enviamos um link de ativacao para:</p>
              <div className={styles.emailHighlight}>{email}</div>
              <div className={styles.verifySteps}>
                <div className={styles.verifyStep}>
                  <div className={styles.stepNum}>1</div>
                  <span>Abra seu e-mail agora</span>
                </div>
                <div className={styles.verifyStep}>
                  <div className={styles.stepNum}>2</div>
                  <span>Clique no link de confirmacao</span>
                </div>
                <div className={styles.verifyStep}>
                  <div className={styles.stepNum}>3</div>
                  <span>Faca login e comece a criar!</span>
                </div>
              </div>
              <div className={styles.spamNote}>
                Nao recebeu? Verifique a pasta de spam ou lixo eletronico.
              </div>
            </div>
          ) : showReset ? (
            <div>
              <button className={styles.backBtn} onClick={function() { setShowReset(false); setResetSent(false) }}>
                <i className="ti ti-arrow-left" /> Voltar
              </button>
              {resetSent ? (
                <div className={styles.successState} style={{ paddingTop: 16 }}>
                  <div className={styles.successIcon}><i className="ti ti-mail" /></div>
                  <h2>Link enviado!</h2>
                  <p>Verifique seu e-mail para redefinir sua senha.</p>
                  <div className={styles.spamNote}>Verifique tambem a pasta de spam.</div>
                </div>
              ) : (
                <form onSubmit={handleReset} className={styles.form}>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Esqueceu a senha?</div>
                    <div style={{ fontSize: 13, color: 'var(--muted2)' }}>Digite seu e-mail para receber o link de redefinicao.</div>
                  </div>
                  <div className={styles.field}>
                    <label>E-mail</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={function(e) { setResetEmail(e.target.value) }}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  <button type="submit" className={styles.submitBtn} disabled={resetLoading}>
                    {resetLoading ? 'Enviando...' : 'Enviar link de redefinicao'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <div className={styles.tabs}>
                <div
                  className={styles.tab + (tab === 'login' ? ' ' + styles.active : '')}
                  onClick={function() { setTab('login'); setError('') }}
                >
                  Entrar
                </div>
                <div
                  className={styles.tab + (tab === 'cadastro' ? ' ' + styles.active : '')}
                  onClick={function() { setTab('cadastro'); setError('') }}
                >
                  Criar conta
                </div>
              </div>

              {tab === 'login' ? (
                <form onSubmit={handleLogin} className={styles.form}>
                  <div className={styles.field}>
                    <label>E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={function(e) { setEmail(e.target.value) }}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Senha</label>
                    <input
                      type="password"
                      value={password}
                      onChange={function(e) { setPassword(e.target.value) }}
                      placeholder="sua senha"
                      required
                    />
                  </div>
                  <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
                    <span
                      className={styles.forgotLink}
                      onClick={function() { setShowReset(true); setResetEmail(email) }}
                    >
                      Esqueci minha senha
                    </span>
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
                    <input
                      type="text"
                      value={name}
                      onChange={function(e) { setName(e.target.value) }}
                      placeholder="Seu nome"
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label>E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={function(e) { setEmail(e.target.value) }}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Senha</label>
                    <input
                      type="password"
                      value={password}
                      onChange={function(e) { setPassword(e.target.value) }}
                      placeholder="Minimo 6 caracteres"
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Plano de interesse</label>
                    <select value={plan} onChange={function(e) { setPlan(e.target.value) }}>
                      <option value="Starter">Starter - R$47/mes</option>
                      <option value="Pro">Pro - R$97/mes</option>
                      <option value="Premium">Premium - R$197/mes</option>
                    </select>
                  </div>
                  {error && <div className={styles.error}>{error}</div>}
                  <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? 'Criando conta...' : 'Criar conta'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {!success && !showReset && (
          <div className={styles.copySection}>
            <div className={styles.copyBadge}>Plataforma de criacao com IA</div>
            <div className={styles.copyTitle}>
              Seu ebook, sua pagina de vendas<br />
              <span>e seu criativo em 5 minutos</span>
            </div>
            <div className={styles.copySub}>
              Descreva seu produto e a IA gera tudo automaticamente.
            </div>
            <div className={styles.features}>
              {[
                ['ti-video', 'Criativos de video'],
                ['ti-book-2', 'Ebooks profissionais'],
                ['ti-layout', 'Paginas de vendas'],
                ['ti-sparkles', '100% com IA'],
              ].map(function(item) {
                return (
                  <div key={item[0]} className={styles.feature}>
                    <div className={styles.featureDot}><i className={'ti ' + item[0]} /></div>
                    <span>{item[1]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
