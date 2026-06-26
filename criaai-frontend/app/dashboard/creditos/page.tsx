'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './creditos.module.css'

const CAKTO_PACKS = [
  { id: 'pack10', credits: 10, price: 19.90, label: 'Pack 10', url: 'https://pay.cakto.com.br/i74jv7b_943777' },
  { id: 'pack30', credits: 30, price: 49.90, label: 'Pack 30', url: 'https://pay.cakto.com.br/35j9btc_943780', badge: 'Mais vendido' },
  { id: 'pack100', credits: 100, price: 149.90, label: 'Pack 100', url: 'https://pay.cakto.com.br/bjwi3d9_943781', badge: 'Melhor preco' },
]

export default function CreditosPage() {
  const [selected, setSelected] = useState('pack30')
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const supabase = createClient()

  useEffect(function() {
    async function load() {
      const result = await supabase.auth.getUser()
      const email = result.data.user?.email
      if (email) setUserEmail(email)
    }
    load()
  }, [])

  function perCredit(price: number, credits: number) {
    return (price / credits).toFixed(2)
  }

  function comprar() {
    const pack = CAKTO_PACKS.find(function(p) { return p.id === selected })
    if (!pack) return
    setLoading(true)

    let url = pack.url
    if (userEmail) {
      const params = new URLSearchParams({
        email: userEmail,
        confirmEmail: userEmail,
      })
      url = pack.url + '?' + params.toString()
    }

    window.location.href = url
  }

  const atual = CAKTO_PACKS.find(function(p) { return p.id === selected })

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.title}>Comprar creditos</div>
        <div className={styles.sub}>Adicione creditos extras sem precisar mudar de plano</div>
      </div>
      <div className={styles.content}>
        <div className={styles.packs}>
          {CAKTO_PACKS.map(function(p) {
            return (
              <div
                key={p.id}
                className={styles.pack + (selected === p.id ? ' ' + styles.selected : '')}
                onClick={function() { setSelected(p.id) }}
              >
                {p.badge && <div className={styles.packBadge}>{p.badge}</div>}
                <div className={styles.packCredits}>{p.credits}</div>
                <div className={styles.packLabel}>creditos de video</div>
                <div className={styles.packPrice}>R${p.price.toFixed(2).replace('.', ',')}</div>
                <div className={styles.packPer}>R${perCredit(p.price, p.credits)} por credito</div>
              </div>
            )
          })}
        </div>

        <div className={styles.infoBox}>
          <i className="ti ti-info-circle" style={{ fontSize: 18, flexShrink: 0, color: 'var(--accent2)' }} />
          <div>
            <strong>Como funcionam os creditos extras?</strong>
            <p>Os creditos sao adicionados apos a confirmacao do pagamento e somam ao seu saldo atual. Nao expiram e podem ser usados a qualquer momento.</p>
          </div>
        </div>

        <button
          className={styles.btnBuy}
          onClick={comprar}
          disabled={loading || !atual}
        >
          <i className="ti ti-credit-card" />
          {loading ? 'Redirecionando...' : atual ? 'Comprar ' + atual.credits + ' creditos · R$' + atual.price.toFixed(2).replace('.', ',') : 'Carregando...'}
        </button>

        <div className={styles.guarantee}>
          <i className="ti ti-shield-check" style={{ fontSize: 24, color: 'var(--green)', flexShrink: 0 }} />
          <div>
            <strong>Garantia de 7 dias</strong>
            <p>Se nao gostar, devolvemos 100% do valor.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
