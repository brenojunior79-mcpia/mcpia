'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import s from './login.module.css'

// ---------- icones (SVG simples, herdam a cor do texto) ----------
type IconProps = { size?: number }

function IconMail({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M4 7.5l8 5.5 8-5.5" />
    </svg>
  )
}
function IconLock({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
      <path d="M8 10.5V8a4 4 0 018 0v2.5" />
    </svg>
  )
}
function IconUser({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.7" />
      <path d="M4.5 20c.9-3.6 3.8-5.5 7.5-5.5s6.6 1.9 7.5 5.5" />
    </svg>
  )
}
function IconPhone({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6.5" y="2.5" width="11" height="19" rx="3" />
      <path d="M11 18.5h2" />
    </svg>
  )
}
function IconEye({ off }: { off: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  )
}
function IconAlert() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l9.2 16H2.8L12 3.5z" />
      <path d="M12 10v4.2M12 17.3v.1" />
    </svg>
  )
}
function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

export default function LoginPage() {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [verSenha, setVerSenha] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const paginaRef = useRef<HTMLDivElement>(null)

  // A luz de fundo acompanha o mouse (so decoracao)
  function seguirMouse(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || !paginaRef.current) return
    paginaRef.current.style.setProperty('--mx', e.clientX + 'px')
    paginaRef.current.style.setProperty('--my', e.clientY + 'px')
  }

  // Traduz erros do Supabase para português
  function traduzErro(msg: string): string {
    if (!msg) return 'Ocorreu um erro. Tente novamente.'
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos. Confira se digitou o mesmo e-mail da compra. Se esqueceu a senha, toque em "Esqueci minha senha".'
    if (/known to be weak|easy to guess|pwned|leaked/i.test(msg)) return 'Essa senha é muito comum e fácil de adivinhar. Escolha uma senha diferente, com letras e números (ex.: Prospero2026).'
    if (/should contain at least one character|weak_password|weak password/i.test(msg)) return 'Senha fraca. Use pelo menos 6 caracteres, com letras e números.'
    if (/failed to fetch|network|timeout/i.test(msg)) return 'Sem conexão com o servidor. Confira sua internet e tente novamente.'
    if (/rate limit|too many requests|security purposes/i.test(msg)) return 'Muitas tentativas. Aguarde 1 minuto e tente novamente.'
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
    router.push('/dashboard')
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!resetEmail.trim()) {
      return
    }
    setResetLoading(true)
    setResetError('')
    const r = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: window.location.origin + '/auth/callback?type=recovery',
    })
    setResetLoading(false)
    // Antes a tela sempre dizia "Link enviado" mesmo quando o envio falhava (ex.: pediu 2 vezes seguidas)
    if (r.error) {
      const m = String(r.error.message || '')
      if (/only request this after|security purposes|rate limit/i.test(m)) {
        setResetError('Você já pediu o link agora há pouco. Aguarde 1 minuto, confira o e-mail (e o spam) e tente de novo só se não chegar.')
      } else {
        setResetError('Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos ou fale com o suporte.')
      }
      return
    }
    setResetSent(true)
  }

  function trocarAba(nova: string) {
    setTab(nova)
    setError('')
    setVerSenha(false)
  }

  const tipoSenha = verSenha ? 'text' : 'password'

  return (
    <div className={s.page} ref={paginaRef} onPointerMove={seguirMouse}>
      {/* Fundo: degrade macio em roxo da marca, sem linhas (so decoracao) */}
      <div className={s.bg} aria-hidden="true">
        <div className={s.blobA + ' ' + s.blob} />
        <div className={s.blobB + ' ' + s.blob} />
        <div className={s.blobC + ' ' + s.blob} />
        <div className={s.blobD + ' ' + s.blob} />
        <div className={s.spot} />
      </div>

      <div className={s.shell}>
        {/* Marca */}
        <section className={s.hero}>
          <div className={s.lockup + ' ' + s.rise} style={{ ['--d' as any]: '0.05s' }}>
            <div className={s.logoWrap}>
              <img src="/logo.png" alt="MCP" className={s.logo} />
              <span className={s.shine} aria-hidden="true" style={{ WebkitMaskImage: 'url(/logo.png)', maskImage: 'url(/logo.png)' }} />
            </div>
            <p className={s.tagline}>Mentoria Cristão Próspero Oficial</p>
          </div>

          <div className={s.sway}>
            <h1 className={s.headline}>#BoraProsperar</h1>
          </div>

        </section>

        {/* Formulario */}
        <main className={s.panel}>
          <div className={s.card + ' ' + s.rise} style={{ ['--d' as any]: '0.3s' }}>

            {/* Redefinir senha */}
            {showReset ? (
              <div>
                <button
                  type="button"
                  className={s.back}
                  onClick={function() { setShowReset(false); setResetSent(false); setResetError(''); setError('') }}
                >
                  <IconArrowLeft /> Voltar para o login
                </button>

                {resetSent ? (
                  <div className={s.sent}>
                    <div className={s.sentIcon}>
                      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 12.5V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3h6.5" />
                        <path d="M3.8 7.6l8.2 5.6 8.2-5.6" />
                        <circle cx="18" cy="18" r="4.6" fill="currentColor" stroke="none" />
                        <path className={s.draw} stroke="#fff" d="M15.9 18.1l1.6 1.6 2.8-3.2" />
                      </svg>
                    </div>
                    <h2 className={s.cardTitle}>Link enviado!</h2>
                    <p className={s.cardSub} style={{ marginBottom: 8 }}>Enviamos o link de redefinição de senha para:</p>
                    <div className={s.sentEmail}>{resetEmail}</div>
                    <p className={s.hint} style={{ marginTop: 0, marginBottom: 14 }}>
                      Não encontrou? Confira a pasta de <b>spam</b> ou <b>lixo eletrônico</b>. Só chega se este for o e-mail usado no cadastro.
                    </p>
                    <button type="button" className={s.ghostBtn} onClick={function() { setResetSent(false) }}>
                      Reenviar link
                    </button>
                  </div>
                ) : (
                  <form className={s.form} onSubmit={handleReset}>
                    <h2 className={s.cardTitle}>Esqueceu sua senha?</h2>
                    <p className={s.cardSub}>
                      Informe seu e-mail de cadastro e enviaremos um link para você criar uma nova senha.
                    </p>
                    <div className={s.field}>
                      <label className={s.label} htmlFor="reset-email">E-mail cadastrado</label>
                      <div className={s.inputWrap}>
                        <span className={s.inputIcon}><IconMail /></span>
                        <input
                          id="reset-email"
                          className={s.input}
                          type="email"
                          autoComplete="email"
                          value={resetEmail}
                          onChange={function(e) { setResetEmail(e.target.value) }}
                          placeholder="seu@email.com"
                          required
                        />
                      </div>
                    </div>
                    {resetError && (
                      <div className={s.error} role="alert" key={resetError}>
                        <IconAlert /><span>{resetError}</span>
                      </div>
                    )}
                    <button type="submit" className={s.submit} disabled={resetLoading}>
                      {resetLoading ? <><span className={s.spinner} /> Enviando...</> : 'Enviar link de redefinição'}
                    </button>
                  </form>
                )}
              </div>

            /* Login e Cadastro */
            ) : (
              <div>
                {/* Abas */}
                <div className={s.tabs} role="tablist" aria-label="Entrar ou criar conta">
                  <div className={s.tabPill + (tab === 'cadastro' ? ' ' + s.tabPillRight : '')} aria-hidden="true" />
                  {[['login', 'Entrar'], ['cadastro', 'Criar conta']].map(function(item) {
                    return (
                      <button
                        key={item[0]}
                        type="button"
                        role="tab"
                        aria-selected={tab === item[0]}
                        className={s.tab + (tab === item[0] ? ' ' + s.tabOn : '')}
                        onClick={function() { trocarAba(item[0]) }}
                      >
                        {item[1]}
                      </button>
                    )
                  })}
                </div>

                {/* Erro */}
                {error && (
                  <div className={s.error} role="alert" key={error}>
                    <IconAlert /><span>{error}</span>
                  </div>
                )}

                {/* Formulario Login */}
                {tab === 'login' ? (
                  <form className={s.form} onSubmit={handleLogin} key="login">
                    <div className={s.field}>
                      <label className={s.label} htmlFor="login-email">E-mail</label>
                      <div className={s.inputWrap}>
                        <span className={s.inputIcon}><IconMail /></span>
                        <input id="login-email" className={s.input} type="email" autoComplete="email" value={email} onChange={function(e) { setEmail(e.target.value) }} placeholder="seu@email.com" required />
                      </div>
                    </div>
                    <div className={s.field}>
                      <label className={s.label} htmlFor="login-senha">Senha</label>
                      <div className={s.inputWrap}>
                        <span className={s.inputIcon}><IconLock /></span>
                        <input id="login-senha" className={s.input + ' ' + s.inputPass} type={tipoSenha} autoComplete="current-password" value={password} onChange={function(e) { setPassword(e.target.value) }} placeholder="Sua senha" required />
                        <button type="button" className={s.eye} onClick={function() { setVerSenha(!verSenha) }} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}>
                          <IconEye off={verSenha} />
                        </button>
                      </div>
                    </div>
                    <div className={s.rowEnd}>
                      <button
                        type="button"
                        className={s.linkBtn}
                        onClick={function() { setShowReset(true); setResetEmail(email); setError('') }}
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <button type="submit" className={s.submit} disabled={loading}>
                      {loading ? <><span className={s.spinner} /> Entrando...</> : 'Entrar'}
                    </button>
                  </form>

                /* Formulario Cadastro */
                ) : (
                  <form className={s.form} onSubmit={handleCadastro} key="cadastro">
                    <div className={s.notice}>
                      <IconAlert />
                      <span>Faça o cadastro com o <b>mesmo e-mail que você usou na compra</b>. É assim que liberamos o seu acesso.</span>
                    </div>
                    <div className={s.field}>
                      <label className={s.label} htmlFor="cad-nome">Nome completo</label>
                      <div className={s.inputWrap}>
                        <span className={s.inputIcon}><IconUser /></span>
                        <input id="cad-nome" className={s.input} type="text" autoComplete="name" value={name} onChange={function(e) { setName(e.target.value) }} placeholder="Seu nome completo" required />
                      </div>
                    </div>
                    <div className={s.field}>
                      <label className={s.label} htmlFor="cad-email">E-mail</label>
                      <div className={s.inputWrap}>
                        <span className={s.inputIcon}><IconMail /></span>
                        <input id="cad-email" className={s.input} type="email" autoComplete="email" value={email} onChange={function(e) { setEmail(e.target.value) }} placeholder="seu@email.com" required />
                      </div>
                      <p className={s.hint}>O mesmo e-mail da sua compra.</p>
                    </div>
                    <div className={s.field}>
                      <label className={s.label} htmlFor="cad-whats">WhatsApp <small>(com DDD)</small></label>
                      <div className={s.inputWrap}>
                        <span className={s.inputIcon}><IconPhone /></span>
                        <input id="cad-whats" className={s.input} type="tel" inputMode="numeric" autoComplete="tel-national" value={whatsapp} onChange={function(e) { setWhatsapp(formatWhatsapp(e.target.value)) }} placeholder="(37) 99999-9999" required />
                      </div>
                    </div>
                    <div className={s.field}>
                      <label className={s.label} htmlFor="cad-senha">Senha</label>
                      <div className={s.inputWrap}>
                        <span className={s.inputIcon}><IconLock /></span>
                        <input id="cad-senha" className={s.input + ' ' + s.inputPass} type={tipoSenha} autoComplete="new-password" value={password} onChange={function(e) { setPassword(e.target.value) }} placeholder="Mínimo 6 caracteres" required />
                        <button type="button" className={s.eye} onClick={function() { setVerSenha(!verSenha) }} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}>
                          <IconEye off={verSenha} />
                        </button>
                      </div>
                      <p className={s.hint}>Use letras e números para maior segurança.</p>
                    </div>
                    <button type="submit" className={s.submit} disabled={loading} style={{ marginTop: 4 }}>
                      {loading ? <><span className={s.spinner} /> Criando sua conta...</> : 'Criar conta gratuita'}
                    </button>
                    <p className={s.fine}>Ao criar sua conta você concorda com nossos termos de uso.</p>
                  </form>
                )}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
