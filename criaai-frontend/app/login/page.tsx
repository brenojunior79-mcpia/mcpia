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

  return (
    <div className={styles.split}>
      <div className={styles.right}>
        <div className={styles.logo}>MCP<span>.IA</span></div>

        <div className={styles.authBox}>
          {success ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}><i className="ti ti-mail" /></div>
              <h2>Confirme seu e-mail!</h2>
              <p>Enviamos um link de confirmacao para <strong>{email}</strong>.</p>
              <p style={{ marginTop: 8, fontSize: 13, color: 'var(--muted2)' }}>
                Verifique sua caixa de entrada e clique no link para ativar sua conta antes de fazer login.
              </p>
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, fontSize: 12, color: 'var(--muted2)', border: '1px solid var(--border)' }}>
                Nao recebeu? Verifique a pasta de spam.
              </div>
            </div>
          ) : (
            <div>
              <div className={styles.tabs}>
                <div
                  className={styles.tab + (tab === 'login' ? ' ' + styles.active : '')}
                  onClick={function() { setTab('login') }}
                >
                  Entrar
                </div>
                <div
                  className={styles.tab + (tab === 'cadastro' ? ' ' + styles.active : '')}
                  onClick={function() { setTab('cadastro') }}
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
                      <option value="Starter">Starter — R$47/mes</option>
                      <option value="Pro">Pro — R$97/mes</option>
                      <option value="Premium">Premium — R$197/mes</option>
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

        <div className={styles.copySection}>
          <div className={styles.copyTitle}>
            Seu ebook, sua pagina de vendas<br />
            <span>e seu criativo em 5 minutos</span>
          </div>
          <div className={styles.copySub}>
            Descreva seu produto e a IA gera tudo — sem designer, sem agencia.
          </div>
          <div className={styles.features}>
            {[
              ['ti-video', 'Criativos de video com IA'],
              ['ti-book-2', 'Ebooks em qualquer nicho'],
              ['ti-layout', 'Paginas de alta conversao'],
              ['ti-sparkles', '100% automatizado'],
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
      </div>
    </div>
  )
}
