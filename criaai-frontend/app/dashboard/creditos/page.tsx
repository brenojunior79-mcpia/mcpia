'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './creditos.module.css'

const packs = [
  { id: 'pack_10', credits: 10, price: 27, perCredit: 2.70, label: '' },
  { id: 'pack_30', credits: 30, price: 67, perCredit: 2.23, label: 'Mais vendido' },
  { id: 'pack_100', credits: 100, price: 197, perCredit: 1.97, label: 'Melhor preço' },
]

export default function CreditosPage() {
  const [selected, setSelected] = useState('pack_30')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function comprar() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ plan: selected, billing: 'once' })
    })
    const data = await res.json()
    setLoading(false)
    if (data.url) window.location.href = data.url
    else alert('Erro: ' + (data.error || 'Tente novamente'))
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.title}>Comprar créditos</div>
        <div className={styles.sub}>Adicione créditos extras sem precisar mudar de plano</div>
      </div>
      <div className={styles.content}>
        <div className={styles.packs}>
          {packs.map(p => (
            <div key={p.id} className={`${styles.pack} ${selected===p.id?styles.selected:''}`} onClick={()=>setSelected(p.id)}>
              {p.label && <div className={styles.packBadge}>{p.label}</div>}
              <div className={styles.packCredits}>{p.credits}</div>
              <div className={styles.packLabel}>créditos de vídeo</div>
              <div className={styles.packPrice}>R${p.price}</div>
              <div className={styles.packPer}>R${p.perCredit.toFixed(2)} por crédito</div>
            </div>
          ))}
        </div>

        <div className={styles.infoBox}>
          <i className="ti ti-info-circle" style={{fontSize:18,flexShrink:0,color:'var(--accent2)'}}/>
          <div>
            <strong>Como funcionam os créditos extras?</strong>
            <p>Os créditos são adicionados imediatamente após o pagamento e somam ao seu saldo atual. Não expiram e podem ser usados a qualquer momento.</p>
          </div>
        </div>

        <button className={styles.btnBuy} onClick={comprar} disabled={loading}>
          <i className="ti ti-credit-card"/> {loading ? 'Aguarde...' : `Comprar ${packs.find(p=>p.id===selected)?.credits} créditos · R$${packs.find(p=>p.id===selected)?.price}`}
        </button>

        <div className={styles.guarantee}>
          <i className="ti ti-shield-check" style={{fontSize:24,color:'var(--green)',flexShrink:0}}/>
          <div><strong>Garantia de 7 dias</strong><p>Se não gostar, devolvemos 100% do valor.</p></div>
        </div>
      </div>
    </div>
  )
}
