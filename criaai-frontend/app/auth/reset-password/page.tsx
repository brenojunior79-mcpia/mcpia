'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [noSession, setNoSession] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const [tokenHash, setTokenHash] = useState('')

  // Link vindo do e-mail: guardamos o codigo e so o usamos ao salvar a senha.
  // Sem codigo e sem sessao = o link nao funcionou neste navegador (ou expirou): avisamos em vez de mostrar erro tecnico.
  useEffect(function() {
    async function check() {
      let th = ''
      try { th = new URLSearchParams(window.location.search).get('token_hash') || '' } catch (e) {}
      if (th) { setTokenHash(th); return }
      const u = await supabase.auth.getUser()
      if (!u.data?.user) setNoSession(true)
    }
    check()
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('As senhas nao coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    setError('')
    if (tokenHash) {
      const v = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
      if (v.error) { setNoSession(true); setLoading(false); return }
      setTokenHash('')
    }
    const result = await supabase.auth.updateUser({ password })
    if (result.error) {
      const m = result.error.message || ''
      if (m.indexOf('session missing') !== -1) setNoSession(true)
      else if (m.indexOf('same as the old') !== -1) setError('A nova senha precisa ser diferente da antiga.')
      else if (/known to be weak|easy to guess|pwned|leaked/i.test(m)) setError('Essa senha é muito comum e fácil de adivinhar. Escolha outra, com letras e números (ex.: Prospero2026).')
      else if (/should contain at least one character|weak_password|weak password|at least/i.test(m)) setError('Senha fraca. Use pelo menos 6 caracteres, com letras e números.')
      else if (/failed to fetch|network|timeout/i.test(m)) setError('Sem conexão com o servidor. Confira sua internet e tente novamente.')
      else setError('Não foi possível salvar a senha. Tente uma senha diferente, com letras e números, ou peça um novo link.')
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    setTimeout(function() { router.push('/dashboard') }, 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 36, backdropFilter: 'blur(20px)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, marginBottom: 32, textAlign: 'center' }}>
          MCP<span style={{ color: 'var(--accent2)' }}>.IA</span>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(34,197,94,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'var(--green)', margin: '0 auto 16px' }}>
              <i className="ti ti-check" />
            </div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Senha redefinida!</h2>
            <p style={{ fontSize: 14, color: 'var(--muted2)' }}>Redirecionando para o dashboard...</p>
          </div>
        ) : noSession ? (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Esse link não funcionou</h2>
            <p style={{ fontSize: 14, color: 'var(--muted2)', lineHeight: 1.6, marginBottom: 18 }}>
              O link para trocar a senha expirou ou foi aberto em outro aparelho ou navegador. Peça um novo link e abra no mesmo celular ou computador em que você pediu.
            </p>
            <button
              onClick={function() { router.push('/login') }}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5b4ef8, #ec4899)', color: '#fff', fontWeight: 800, fontSize: 15 }}
            >
              Pedir novo link
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Nova senha</div>
            <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 24 }}>Digite sua nova senha abaixo.</div>

            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Nova senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={function(e) { setPassword(e.target.value) }}
                  placeholder="Mínimo 6 caracteres, com letras e números"
                  required
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Confirmar senha</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={function(e) { setConfirm(e.target.value) }}
                  placeholder="Repita a senha"
                  required
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: 14, fontSize: 15, fontFamily: 'Syne, sans-serif', fontWeight: 700, background: 'linear-gradient(135deg, var(--accent), #9b6dfc)', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
              >
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
