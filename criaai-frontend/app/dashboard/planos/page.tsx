'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './planos.module.css'
import CheckoutCartao from '@/components/CheckoutCartao'


const plans = [
  {
    name: 'Starter',
    price: 39.90,
    features: ['10 criativos/mes', '2 ebooks/mes', '2 sites/mes'],
    missing: [],
  },
  {
    name: 'Pro',
    price: 49.90,
    featured: true,
    features: ['18 criativos/mes', '3 ebooks/mes', '3 sites/mes', 'Gerenciador de Anúncios com IA'],
    missing: [],
  },
  {
    name: 'Premium',
    price: 79.90,
    features: ['30 criativos/mes', '10 ebooks/mes', '10 sites/mes', 'Gerenciador de Anúncios com IA', 'Grupo VIP no WhatsApp com o Breno'],
    missing: [],
  },
]

function useCountdown(createdAt: string | null) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(function() {
    if (!createdAt) return
    const deadline = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000

    function update() {
      const diff = deadline - Date.now()
      if (diff <= 0) {
        setTimeLeft(0)
      } else {
        setTimeLeft(diff)
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return function() { clearInterval(interval) }
  }, [createdAt])

  return timeLeft
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
  }
}

export default function PlanosPage() {
  const [loading, setLoading] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [libEmail, setLibEmail] = useState('')
  const [libPlano, setLibPlano] = useState('Starter')
  const [libMsg, setLibMsg] = useState('')
  const [libBusy, setLibBusy] = useState(false)
  // Checkout no cartao (Mercado Pago)
  const [pagando, setPagando] = useState<{ nome: string; valor: number } | null>(null)
  const [sucesso, setSucesso] = useState('')
  const [assinaturaCartao, setAssinaturaCartao] = useState<{ tem: boolean; plano: string | null }>({ tem: false, plano: null })
  const [cancelando, setCancelando] = useState(false)
  const [cancelMsg, setCancelMsg] = useState('')
  const supabase = createClient()
  const timeLeft = useCountdown(createdAt)
  const showTimer = timeLeft !== null && timeLeft > 0

  useEffect(function() {
    async function load() {
      const result = await supabase.auth.getUser()
      const user = result.data.user
      if (!user) return
      setUserEmail(user.email || '')

      const profileResult = await supabase
        .from('profiles')
        .select('created_at, subscription_status, is_admin')
        .eq('id', user.id)
        .single()

      const data = profileResult.data
      if (data && (data as any).is_admin) setIsAdmin(true)
      if (data && data.subscription_status !== 'active') {
        setCreatedAt(data.created_at)
      }
    }
    load()
    carregarAssinatura()
  }, [])

  function carregarAssinatura() {
    fetch('/api/mp/cancelar', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) { setAssinaturaCartao({ tem: !!j.temAssinatura, plano: j.plano || null }) }).catch(function() {})
  }

  function checkout(planName: string) {
    const p = plans.find(function(x) { return x.name === planName })
    if (!p) return
    setSucesso(''); setCancelMsg('')
    setPagando({ nome: p.name, valor: p.price })
  }

  async function cancelarAssinatura() {
    if (cancelando) return
    if (!window.confirm('Cancelar a assinatura no cartão? A cobrança mensal para e o plano deixa de funcionar.')) return
    setCancelando(true); setCancelMsg('')
    try {
      const r = await fetch('/api/mp/cancelar', { method: 'POST' })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setCancelMsg(j.error || 'Não foi possível cancelar agora.')
      else { setCancelMsg('Assinatura cancelada. A cobrança no cartão foi interrompida.'); setAssinaturaCartao({ tem: false, plano: null }) }
    } catch (e) { setCancelMsg('Sem conexão. Tente de novo.') }
    setCancelando(false)
  }

  // Admin: libera um plano para o aluno pelo e-mail
  async function liberarPlano() {
    const email = libEmail.trim()
    if (!email || libBusy) return
    if (!window.confirm('Liberar o plano ' + libPlano + ' para ' + email + '?')) return
    setLibBusy(true); setLibMsg('')
    try {
      const r = await fetch('/api/admin/liberar-plano', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, plano: libPlano }) })
      const j = await r.json().catch(function() { return {} })
      if (!r.ok) setLibMsg('⚠ ' + (j.error || 'Não foi possível liberar.'))
      else { setLibMsg('✓ Plano ' + j.plano + ' liberado para ' + (j.nome || j.email) + ' (' + j.email + ').'); setLibEmail('') }
    } catch (e) { setLibMsg('⚠ Sem conexão. Tente de novo.') }
    setLibBusy(false)
  }

  const timer = timeLeft && timeLeft > 0 ? formatTime(timeLeft) : null

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>Planos</div>
          <div className={styles.sub}>Escolha o plano ideal para o seu negocio</div>
        </div>
      </div>
      <div className={styles.content}>

        {/* Somente admin: liberar plano pelo e-mail do aluno */}
        {isAdmin && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>🔑 Liberar plano para um aluno</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginBottom: 12 }}>Digite o e-mail do aluno, escolha o plano e libere na hora. Só o admin vê esta barra.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input type="email" value={libEmail} onChange={function(e) { setLibEmail(e.target.value) }} onKeyDown={function(e) { if (e.key === 'Enter') liberarPlano() }} placeholder="E-mail do aluno" style={{ flex: '1 1 240px', minWidth: 0, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              <select value={libPlano} onChange={function(e) { setLibPlano(e.target.value) }} style={{ border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontWeight: 700 }}>
                {plans.map(function(p: any) { return <option key={p.name} value={p.name}>{p.name} · R$ {p.price.toFixed(2).replace('.', ',')}</option> })}
              </select>
              <button onClick={liberarPlano} disabled={libBusy || !libEmail.trim()} style={{ cursor: libBusy || !libEmail.trim() ? 'default' : 'pointer', border: 0, background: '#16a34a', color: '#fff', borderRadius: 10, padding: '10px 16px', fontWeight: 800, fontSize: 14, opacity: libBusy || !libEmail.trim() ? 0.6 : 1 }}>{libBusy ? 'Liberando…' : 'Liberar plano'}</button>
            </div>
            {libMsg && <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: libMsg.indexOf('✓') === 0 ? '#16a34a' : '#dc2626' }}>{libMsg}</div>}
          </div>
        )}

        {/* Banner cronometro de boas-vindas */}
        {showTimer && timer && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(124,92,252,0.2), rgba(124,92,252,0.08))',
            border: '1px solid rgba(124,92,252,0.4)',
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            animation: 'pulse 2s ease infinite',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 36 }}>🎁</div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: '#a78bfa', marginBottom: 4 }}>
                  Oferta de boas-vindas!
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                  Assine agora e ganhe <span style={{ color: '#4ade80' }}>+5 creditos de criativo gratis</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>
                  Bonus exclusivo para novos membros — valido apenas nas proximas horas
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              {[
                { value: timer.h, label: 'horas' },
                { value: timer.m, label: 'min' },
                { value: timer.s, label: 'seg' },
              ].map(function(unit, i) {
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{
                      background: 'rgba(124,92,252,0.2)',
                      border: '1px solid rgba(124,92,252,0.4)',
                      borderRadius: 10,
                      padding: '8px 14px',
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 800,
                      fontSize: 24,
                      color: '#a78bfa',
                      minWidth: 52,
                      textAlign: 'center',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {unit.value}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {unit.label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {sucesso && (
          <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.35)', color: 'var(--text)', borderRadius: 14, padding: '14px 16px', marginBottom: 20, fontSize: 14.5, fontWeight: 700 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 24, color: '#16a34a', flexShrink: 0 }} />{sucesso}
          </div>
        )}
        {assinaturaCartao.tem && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 14, color: 'var(--text)' }}><b>Sua assinatura no cartão:</b> plano {assinaturaCartao.plano || ''}, cobrado todo mês pelo Mercado Pago.</div>
            <button type="button" onClick={cancelarAssinatura} disabled={cancelando} style={{ cursor: 'pointer', border: '1px solid rgba(220,38,38,0.4)', background: 'transparent', color: '#dc2626', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13.5, fontFamily: 'inherit' }}>{cancelando ? 'Cancelando…' : 'Cancelar assinatura'}</button>
          </div>
        )}
        {cancelMsg && <div style={{ marginBottom: 16, fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{cancelMsg}</div>}
        {pagando && (
          <CheckoutCartao plano={pagando.nome} valor={pagando.valor} email={userEmail}
            onFechar={function() { setPagando(null) }}
            onSucesso={function(msg) { setPagando(null); setSucesso(msg); carregarAssinatura(); setTimeout(function() { window.location.reload() }, 2500) }} />
        )}

        <div className={styles.plans}>
          {plans.map(function(p: any) {
            return (
              <div key={p.name} className={styles.plan + (p.featured ? ' ' + styles.featured : '')}>
                {p.featured && <div className={styles.popularBadge}>Mais popular</div>}
                <div className={styles.planName}>{p.name}</div>
                <div className={styles.planPrice}>
                  <sup>R$</sup>
                  <span>{p.price.toFixed(2).replace('.', ',')}</span>
                  <sub>/mes</sub>
                </div>
                {showTimer && (
                  <div style={{
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.25)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 12,
                    color: '#4ade80',
                    fontWeight: 600,
                    marginBottom: 12,
                    textAlign: 'center',
                  }}>
                    🎁 +5 creditos gratis se assinar agora
                  </div>
                )}
                <ul className={styles.features}>
                  {p.features.map(function(f: string) {
                    return (
                      <li key={f}>
                        <i className="ti ti-check" style={{ color: 'var(--green)' }} />{f}
                      </li>
                    )
                  })}
                  {p.missing.map(function(f: string) {
                    return (
                      <li key={f} className={styles.missing}>
                        <i className="ti ti-x" style={{ color: 'var(--muted)' }} />{f}
                      </li>
                    )
                  })}
                </ul>
                {p.extra && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(124,92,252,0.10)', border: '1px solid rgba(124,92,252,0.32)', borderRadius: 12, padding: '11px 12px', marginBottom: 14, textAlign: 'left' }}>
                    <i className="ti ti-brand-whatsapp" style={{ color: 'var(--accent)', fontSize: 20, flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>{p.extra.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted2)', lineHeight: 1.45, marginTop: 2 }}>{p.extra.desc}</div>
                    </div>
                  </div>
                )}
                <button
                  className={styles.btn + ' ' + (p.featured ? styles.btnFilled : styles.btnOutline)}
                  onClick={function() { checkout(p.name) }}
                  disabled={loading === p.name}
                >
                  {showTimer ? 'Assinar e ganhar +5 creditos' : 'Assinar agora'}
                </button>
              </div>
            )
          })}
        </div>

        <div className={styles.guarantee}>
          <i className="ti ti-shield-check" style={{ fontSize: 28, color: 'var(--green)', flexShrink: 0 }} />
          <div>
            <strong>Garantia de 7 dias sem risco</strong>
            <p>Se nao gostar por qualquer motivo, devolvemos 100% do valor.</p>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(124,92,252,0.2) } 50% { box-shadow: 0 0 0 8px rgba(124,92,252,0) } }`}</style>
    </div>
  )
}
