'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './planos.module.css'

const plans = [
  {
    name: 'Starter',
    price: 47,
    priceAnual: 38,
    features: ['15 videos/mes', '3 ebooks/mes', 'Formatos 9:16 e 1:1', 'Copy com IA', 'Download em HD'],
    missing: ['Painel admin', 'White label'],
  },
  {
    name: 'Pro',
    price: 97,
    priceAnual: 78,
    featured: true,
    features: ['50 videos/mes', '15 ebooks/mes', 'Todos os formatos', 'Copy com IA', 'Musica automatica', 'Painel admin'],
    missing: ['White label'],
  },
  {
    name: 'Premium',
    price: 197,
    priceAnual: 158,
    features: ['Videos ilimitados', 'Ebooks ilimitados', 'Todos os formatos', 'Painel admin completo', 'White label incluso', 'Suporte prioritario'],
    missing: [],
  },
]

export default function PlanosPage() {
  const [billing, setBilling] = useState('monthly')
  const [loading, setLoading] = useState('')
  const supabase = createClient()

  async function checkout(planName: string) {
    setLoading(planName)
    const sessionResult = await supabase.auth.getSession()
    const session = sessionResult.data.session
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (session ? session.access_token : ''),
      },
      body: JSON.stringify({ plan: planName, billing }),
    })
    const data = await res.json()
    setLoading('')
    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Erro: ' + (data.error || 'Tente novamente'))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>Planos</div>
          <div className={styles.sub}>Escolha o plano ideal para o seu negocio</div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.toggleWrap}>
          <span className={styles.toggleLabel + (billing === 'monthly' ? ' ' + styles.active : '')}>Mensal</span>
          <div
            className={styles.track + (billing === 'yearly' ? ' ' + styles.yearly : '')}
            onClick={function() { setBilling(billing === 'monthly' ? 'yearly' : 'monthly') }}
          >
            <div className={styles.thumb} />
          </div>
          <span className={styles.toggleLabel + (billing === 'yearly' ? ' ' + styles.active : '')}>Anual</span>
          <span className={styles.savePill}>Economize 20%</span>
        </div>

        <div className={styles.plans}>
          {plans.map(function(p: any) {
            return (
              <div key={p.name} className={styles.plan + (p.featured ? ' ' + styles.featured : '')}>
                {p.featured && <div className={styles.popularBadge}>Mais popular</div>}
                <div className={styles.planName}>{p.name}</div>
                <div className={styles.planPrice}>
                  <sup>R$</sup>
                  <span>{billing === 'monthly' ? p.price : p.priceAnual}</span>
                  <sub>/mes</sub>
                </div>
                {billing === 'yearly' && (
                  <div className={styles.anualNote}>R${p.priceAnual * 12} cobrado anualmente</div>
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
                  {loading === p.name ? 'Aguarde...' : 'Assinar agora'}
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
    </div>
  )
}
