'use client'
import { useState } from 'react'
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
function IconSpark({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
    </svg>
  )
}
function IconBook({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5v-15z" />
      <path d="M4 20.5A2.5 2.5 0 006.5 23H20v-5" transform="translate(0 -2)" />
      <path d="M9 8h7" />
    </svg>
  )
}
function IconCoin({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2c-.5-.8-1.5-1.2-2.8-1.2-1.6 0-2.7.8-2.7 1.9 0 2.8 5.6 1.3 5.6 4.1 0 1.2-1.2 2-2.9 2-1.4 0-2.5-.5-3-1.4M12 6.5V8m0 8v1.5" />
    </svg>
  )
}

const BENEFICIOS = [
  { label: 'Criativos com IA', Icon: IconSpark },
  { label: 'Ebooks em minutos', Icon: IconBook },
  { label: 'Venda no automático', Icon: IconCoin },
]

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
    <div className={s.page}>
      {/* Fundo: noite em indigo, amanhecer dourado e raios de luz (so decoracao) */}
      <div className={s.bg} aria-hidden="true">
        <div className={s.blobViolet + ' ' + s.blob} />
        <div className={s.blobRose + ' ' + s.blob} />
        <div className={s.blobGold + ' ' + s.blob} />
        <div className={s.rays} />
        <div className={s.vignette} />
      </div>

      <div className={s.shell}>
        {/* Marca */}
        <section className={s.hero}>
          <div className={s.brand + ' ' + s.rise} style={{ ['--d' as any]: '0.05s' }}>
            <div className={s.mark} aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 3.5v17M6.5 9h11" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </div>
            <div className={s.brandName}>
              <span>Plataforma do</span>
              Cristão Próspero
            </div>
          </div>

          <h1 className={s.headline + ' ' + s.rise} style={{ ['--d' as any]: '0.18s' }}>
            Prospere no digital, de um jeito simples e rápido.
          </h1>

          <p className={s.lead + ' ' + s.rise} style={{ ['--d' as any]: '0.3s' }}>
            A plataforma completa para criar, anunciar e vender, tudo em um só lugar.
          </p>

          <ul className={s.perks + ' ' + s.rise} style={{ ['--d' as any]: '0.42s' }}>
            {BENEFICIOS.map(function(b) {
              return (
                <li key={b.label} className={s.perk}>
                  <span className={s.perkIcon}><b.Icon /></span>
                  {b.label}
                </li>
              )
            })}
          </ul>
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
                        <circle cx="18" cy="18" r="4.4" fill="#120f33" />
                        <path className={s.draw} d="M15.9 18.1l1.6 1.6 2.8-3.2" />
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

          {/* Beneficios no celular (no computador ficam ao lado) */}
          {!showReset && (
            <ul className={s.perksMobile + ' ' + s.rise} style={{ ['--d' as any]: '0.6s' }}>
              {BENEFICIOS.map(function(b) {
                return (
                  <li key={b.label} className={s.perkSmall}>
                    <b.Icon size={16} />
                    {b.label}
                  </li>
                )
              })}
            </ul>
          )}
        </main>
      </div>
    </div>
  )
}
