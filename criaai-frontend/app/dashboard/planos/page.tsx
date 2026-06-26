'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './planos.module.css'

const CAKTO_LINKS: Record<string, string> = {
  Starter: 'https://pay.cakto.com.br/jkx9urd_929562',
  Pro: 'https://pay.cakto.com.br/hqhmn8e',
  Premium: 'https://pay.cakto.com.br/kbwoae2',
}

const plans = [
  {
    name: 'Starter',
    price: 29.90,
    features: ['15 videos/mes', '3 ebooks/mes', 'Formatos 9:16 e 1:1', 'Copy com IA', 'Download em HD'],
    missing: ['Painel admin', 'White label'],
  },
  {
    name: 'Pro',
    price: 39.90,
    featured: true,
    features: ['25 videos/mes', '6 ebooks/mes', 'Todos os formatos', 'Copy com IA', 'Musica automatica', 'Painel admin'],
    missing: ['White label'],
  },
  {
    name: 'Premium',
    price: 69.90,
    features: ['50 videos/mes', '15 ebooks/mes', 'Todos os formatos', 'Painel admin completo', 'White label incluso', 'Suporte prioritario'],
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
        .select('created_at, subscription_status')
        .eq('id', user.id)
        .single()

      const data = profileResult.data
      if (data && data.subscription_status !== 'active') {
        setCreatedAt(data.created_at)
      }
    }
    load()
  }, [])

  function checkout(planName: string) {
    setLoading(planName)
    const baseUrl = CAKTO_LINKS[planName]
    if (!baseUrl) {
      alert('Plano nao configurado. Tente novamente mais tarde.')
      setLoading('')
      return
    }

    let url = baseUrl
    if (userEmail) {
      const params = new URLSearchParams({
        email: userEmail,
        confirmEmail: userEmail,
      })
      url = baseUrl + '?' + params.toString()
    }

    window.location.href = url
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
                  Assine agora e ganhe <span style={{ color: '#4ade80' }}>+5 creditos de video gratis</span>
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
                <button
                  className={styles.btn + ' ' + (p.featured ? styles.btnFilled : styles.btnOutline)}
                  onClick={function() { checkout(p.name) }}
                  disabled={loading === p.name}
                >
                  {loading === p.name ? 'Redirecionando...' : showTimer ? 'Assinar e ganhar +5 creditos' : 'Assinar agora'}
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
