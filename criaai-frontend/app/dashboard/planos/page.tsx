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

export default function PlanosPage() {
  const [loading, setLoading] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const supabase = createClient()

  useEffect(function() {
    async function loadEmail() {
      const result = await supabase.auth.getUser()
      const email = result.data.user?.email
      if (email) setUserEmail(email)
    }
    loadEmail()
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

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>Planos</div>
          <div className={styles.sub}>Escolha o plano ideal para o seu negocio</div>
        </div>
      </div>
      <div className={styles.content}>
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
                  {loading === p.name ? 'Redirecionando...' : 'Assinar agora'}
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
