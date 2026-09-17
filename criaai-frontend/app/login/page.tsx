'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

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

  // Traduz erros do Supabase para português
  function traduzErro(msg: string): string {
    if (!msg) return 'Ocorreu um erro. Tente novamente.'
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
    if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.'
    if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado. Faça login ou redefina sua senha.'
    if (msg.includes('Password should be at least')) return 'A senha deve ter no mínimo 6 caracteres.'
    if (msg.includes('Unable to validate email address')) return 'E-mail inválido. Verifique e tente novamente.'
    if (msg.includes('Email rate limit exceeded')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
    if (msg.includes('over_email_send_rate_limit')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
    if (msg.includes('signup is disabled')) return 'Cadastro temporariamente desativado. Entre em contato com o suporte.'
    return 'Ocorreu um erro. Tente novamente.'
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.error) {
      setError(traduzErro(result.error.message))
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
    setError('')
    const whatsappDigits = whatsapp.replace(/\D/g, '')
    if (!name.trim()) {
      setError('Por favor, informe seu nome completo.')
      return
    }
    if (whatsappDigits.length < 10) {
      setError('Digite um número de WhatsApp válido com DDD. Ex: (37) 99999-9999')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    setLoading(true)
    const result = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim(), whatsapp: whatsappDigits } },
    })
    if (result.error) {
      setError(traduzErro(result.error.message))
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!resetEmail.trim()) {
      return
    }
    setResetLoading(true)
    await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
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

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✝️</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: '#1a1a2e', margin: '0 0 6px', lineHeight: 1.2 }}>
            Plataforma do<br />
            <span style={{ color: '#5b4ef8' }}>Cristão Próspero</span>
          </h1>
          <p style={{ fontSize: 13, color: '#9b9aaa', margin: 0 }}>
            A plataforma completa para você prosperar no digital de forma simples e rápida
          </p>
        </div>

        {/* Caixa */}
        <div style={{ background: '#ffffff', borderRadius: 20, padding: '32px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)' }}>

          {/* Conta criada com sucesso */}
          {success ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: 60, height: 60, background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✅</div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Conta criada com sucesso!</h2>
              <p style={{ fontSize: 14, color: '#6b6880', marginBottom: 6 }}>
                Verifique seu e-mail para confirmar o cadastro.
              </p>
              <p style={{ fontSize: 12, color: '#9b9aaa', marginBottom: 24 }}>
                Não encontrou? Confira a pasta de <strong>spam</strong> ou <strong>lixo eletrônico</strong>.
              </p>
              <button
                onClick={function() { setSuccess(false); setTab('login') }}
                style={{ background: 'linear-gradient(135deg, #5b4ef8, #9b8ffc)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              >
                Ir para o login
              </button>
            </div>

          /* Redefinir senha */
          ) : showReset ? (
            <div>
              <button
                onClick={function() { setShowReset(false); setResetSent(false); setError('') }}
                style={{ background: 'none', border: 'none', color: '#5b4ef8', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontFamily: 'Inter, sans-serif', padding: 0 }}
              >
                ← Voltar para o login
              </button>

              {resetSent ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>📧</div>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Link enviado!</h2>
                  <p style={{ fontSize: 14, color: '#6b6880', marginBottom: 6 }}>
                    Enviamos o link de redefinição de senha para:
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>{resetEmail}</p>
                  <p style={{ fontSize: 12, color: '#9b9aaa', marginBottom: 20 }}>
                    Não encontrou? Confira a pasta de <strong>spam</strong> ou <strong>lixo eletrônico</strong>.
                  </p>
                  <button
                    onClick={function() { setResetSent(false) }}
                    style={{ background: 'none', border: '1px solid #e2e0f0', borderRadius: 10, padding: '10px 20px', fontSize: 13, color: '#6b6880', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  >
                    Reenviar link
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset}>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>Esqueceu sua senha?</h2>
                  <p style={{ fontSize: 13, color: '#6b6880', marginBottom: 20, lineHeight: 1.6 }}>
                    Informe seu e-mail de cadastro e enviaremos um link para você criar uma nova senha.
                  </p>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>E-mail cadastrado</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={function(e) { setResetEmail(e.target.value) }}
                      placeholder="seu@email.com"
                      required
                      style={inputStyle}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #5b4ef8, #9b8ffc)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: resetLoading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 6px 16px rgba(91,78,248,0.3)' }}
                  >
                    {resetLoading ? 'Enviando...' : 'Enviar link de redefinição'}
                  </button>
                </form>
              )}
            </div>

          /* Login e Cadastro */
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
                        flex: 1, padding: '9px', border: 'none', borderRadius: 8,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
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

              {/* Erro */}
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ flexShrink: 0 }}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Formulario Login */}
              {tab === 'login' ? (
                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>E-mail</label>
                    <input type="email" value={email} onChange={function(e) { setEmail(e.target.value) }} placeholder="seu@email.com" required style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Senha</label>
                    <input type="password" value={password} onChange={function(e) { setPassword(e.target.value) }} placeholder="Sua senha" required style={inputStyle} />
                  </div>
                  <div style={{ textAlign: 'right', marginBottom: 20 }}>
                    <span
                      onClick={function() { setShowReset(true); setResetEmail(email); setError('') }}
                      style={{ fontSize: 12, color: '#5b4ef8', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Esqueci minha senha
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #5b4ef8, #9b8ffc)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 6px 16px rgba(91,78,248,0.3)', opacity: loading ? 0.8 : 1 }}
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>

              /* Formulario Cadastro */
              ) : (
                <form onSubmit={handleCadastro}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Nome completo</label>
                    <input type="text" value={name} onChange={function(e) { setName(e.target.value) }} placeholder="Seu nome completo" required style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>E-mail</label>
                    <input type="email" value={email} onChange={function(e) { setEmail(e.target.value) }} placeholder="seu@email.com" required style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>WhatsApp <span style={{ color: '#9b9aaa', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(com DDD)</span></label>
                    <input type="text" value={whatsapp} onChange={function(e) { setWhatsapp(formatWhatsapp(e.target.value)) }} placeholder="(37) 99999-9999" required style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <label style={labelStyle}>Senha</label>
                    <input type="password" value={password} onChange={function(e) { setPassword(e.target.value) }} placeholder="Mínimo 6 caracteres" required style={inputStyle} />
                  </div>
                  <p style={{ fontSize: 11, color: '#9b9aaa', marginBottom: 20, marginTop: 6 }}>
                    Use letras e números para maior segurança.
                  </p>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #5b4ef8, #9b8ffc)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 6px 16px rgba(91,78,248,0.3)', opacity: loading ? 0.8 : 1 }}
                  >
                    {loading ? 'Criando sua conta...' : 'Criar conta gratuita'}
                  </button>
                  <p style={{ fontSize: 11, color: '#9b9aaa', textAlign: 'center', marginTop: 12 }}>
                    Ao criar sua conta você concorda com nossos termos de uso.
                  </p>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Rodape */}
        {!success && !showReset && (
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {[
              { icon: '🎯', label: 'Criativos com IA' },
              { icon: '📘', label: 'Ebooks em minutos' },
              { icon: '💰', label: 'Venda no automático' },
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
