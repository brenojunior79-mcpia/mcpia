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
  const [whatsapp, setWhatsapp] = useState('')
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

  function formatWhatsapp(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2)
    return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7)
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    const whatsappDigits = whatsapp.replace(/\D/g, '')
    if (whatsappDigits.length < 10) {
      setError('Digite um numero de WhatsApp valido com DDD.')
      return
    }
    setLoading(true)
    setError('')
    const result = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, whatsapp: whatsappDigits } },
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
      redirectTo: window.location.origin + '/auth/callback?type=recovery',
    })
    setResetLoading(false)
    setResetSent(true)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    border: '1.5px solid #e2e0f0',
    borderRadius: 12,
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    color: '#1a1a2e',
    background: '#fafafa',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#6b6880',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #f4f4f7 0%, #eeedf5 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* Logo e nome da plataforma */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✝️</div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 26,
            fontWeight: 800,
            color: '#1a1a2e',
            margin: '0 0 6px',
            lineHeight: 1.2,
          }}>
            Plataforma do<br />
            <span style={{ color: '#5b4ef8' }}>Cristão Próspero</span>
          </h1>
          <p style={{ fontSize: 13, color: '#9b9aaa', margin: 0 }}>
            A plataforma completa para você prosperar no digital de forma simples e rápida
          </p>
        </div>

        {/* Caixa do formulario */}
        <div style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '32px 36px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}>

          {success ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: 56, height: 56, background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✅</div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Conta criada!</h2>
              <p style={{ fontSize: 14, color: '#6b6880', marginBottom: 24 }}>Sua conta foi criada com sucesso. Faca login para comecar.</p>
              <button
                onClick={function() { setSuccess(false); setTab('login') }}
                style={{ background: 'linear-gradient(135deg, #5b4ef8, #9b8ffc)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              >
                Fazer login agora
              </button>
            </div>

          ) : showReset ? (
            <div>
              <button
                onClick={function() { setShowReset(false); setResetSent(false) }}
                style={{ background: 'none', border: 'none', color: '#5b4ef8', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontFamily: 'Inter, sans-serif', padding: 0 }}
              >
                ← Voltar
              </button>
              {resetSent ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Link enviado!</h2>
                  <p style={{ fontSize: 13, color: '#6b6880' }}>Verifique seu e-mail para redefinir sua senha. Confira tambem o spam.</p>
                </div>
              ) : (
                <form onSubmit={handleReset}>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>Esqueceu a senha?</h2>
                  <p style={{ fontSize: 13, color: '#6b6880', marginBottom: 20 }}>Digite seu e-mail para receber o link de redefinicao.</p>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>E-mail</label>
                    <input type="email" value={resetEmail} onChange={function(e) { setResetEmail(e.target.value) }} placeholder="seu@email.com" required style={inputStyle} />
                  </div>
                  <button type="submit" disabled={resetLoading} style={{ width: '100%', background: 'linear-gradient(135deg, #5b4ef8, #9b8ffc)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {resetLoading ? 'Enviando...' : 'Enviar link'}
                  </button>
                </form>
              )}
            </div>

          ) : (
            <div>
              {/* Abas */}
              <div style={{ display: 'flex', background: '#f4f4f7', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
                {[['login', 'Entrar'], ['cadastro', 'Criar conta']].map(function(item) {
                  return (
                    <button
                      key={item[0]}
                      onClick={function() { setTab(item[0]); setError('') }}
                      style={{
                        flex: 1, padding: '9px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        background: tab === item[0] ? '#fff' : 'transparent',
                        color: tab === item[0] ? '#5b4ef8' : '#9b9aaa',
                        boxShadow: tab === item[0] ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      {item[1]}
                    </button>
                  )
                })}
              </div>

              {tab === 'login' ? (
                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>E-mail</label>
                    <input type="email" value={email} onChange={function(e) { setEmail(e.target.value) }} placeholder="seu@email.com" required style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Senha</label>
                    <input type="password" value={password} onChange={function(e) { setPassword(e.target.value) }} placeholder="sua senha" required style={inputStyle} />
                  </div>
                  <div style={{ textAlign: 'right', marginBottom: 20 }}>
                    <span onClick={function() { setShowReset(true); setResetEmail(email) }} style={{ fontSize: 12, color: '#5b4ef8', cursor: 'pointer', fontWeight: 600 }}>
                      Esqueci minha senha
                    </span>
                  </div>
                  {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
                      {error}
                    </div>
                  )}
                  <button type="submit" disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg, #5b4ef8, #9b8ffc)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 6px 16px rgba(91,78,248,0.3)' }}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCadastro}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Nome completo</label>
                    <input type="text" value={name} onChange={function(e) { setName(e.target.value) }} placeholder="Seu nome" required style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>E-mail</label>
                    <input type="email" value={email} onChange={function(e) { setEmail(e.target.value) }} placeholder="seu@email.com" required style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>WhatsApp</label>
                    <input type="text" value={whatsapp} onChange={function(e) { setWhatsapp(formatWhatsapp(e.target.value)) }} placeholder="(11) 91234-5678" required style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Senha</label>
                    <input type="password" value={password} onChange={function(e) { setPassword(e.target.value) }} placeholder="Minimo 6 caracteres" required style={inputStyle} />
                  </div>
                  {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
                      {error}
                    </div>
                  )}
                  <button type="submit" disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg, #5b4ef8, #9b8ffc)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 6px 16px rgba(91,78,248,0.3)' }}>
                    {loading ? 'Criando conta...' : 'Criar conta gratis'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Rodape */}
        {!success && !showReset && (
          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {[
              { icon: '🎯', label: 'Criativos com IA' },
              { icon: '📘', label: 'Ebooks em minutos' },
              { icon: '💰', label: 'Venda no automatico' },
            ].map(function(item) {
              return (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9b9aaa' }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
