'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import styles from './creditos.module.css'

type Pack = { id: string; name: string; credits: number; price: number }

export default function CreditosPage() {
  const [packs, setPacks] = useState<Pack[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('credit_packs')
        .select('id, name, credits, price')
        .eq('active', true)
        .order('credits', { ascending: true })
      if (data && data.length) {
        setPacks(data as Pack[])
        setSelected(data[1]?.id || data[0].id)
      }
    }
    load()
  }, [])

  function perCredit(p: Pack) {
    return (p.price / p.credits).toFixed(2)
  }

  function badgeFor(i: number) {
    if (i === 1) return 'Mais vendido'
    if (i === 2) return 'Melhor preço'
    return ''
  }

  async function comprar() {
    if (!selected) return
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ packId: selected }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.url) window.location.href = data.url
    else alert('Erro: ' + (data.error || 'Tente novamente'))
  }

  const atual = packs.find(p => p.id === selected)

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.title}>Comprar créditos</div>
        <div className={styles.sub}>Adicione créditos extras sem precisar mudar de plano</div>
      </div>
      <div className={styles.content}>
        <div className={styles.packs}>
          {packs.map((p, i) => {
            const badge = badgeFor(i)
            return (
              <div key={p.id} className={`${styles.pack} ${selected===p.id?styles.selected:''}`} onClick={()=>setSelected(p.id)}>
                {badge && <div className={styles.packBadge}>{badge}</div>}
                <div className={styles.packCredits}>{p.credits}</div>
                <div className={styles.packLabel}>créditos de vídeo</div>
                <div className={styles.packPrice}>R${p.price}</div>
                <div className={styles.packPer}>R${perCredit(p)} por crédito</div>
              </div>
            )
          })}
        </div>

        <div className={styles.infoBox}>
          <i className="ti ti-info-circle" style={{fontSize:18,flexShrink:0,color:'var(--accent2)'}}/>
          <div>
            <strong>Como funcionam os créditos extras?</strong>
            <p>Os créditos são adicionados imediatamente após o pagamento e somam ao seu saldo atual. Não expiram e podem ser usados a qualquer momento.</p>
          </div>
        </div>

        <button className={styles.btnBuy} onClick={comprar} disabled={loading || !atual}>
          <i className="ti ti-credit-card"/> {loading ? 'Aguarde...' : atual ? `Comprar ${atual.credits} créditos · R$${atual.price}` : 'Carregando...'}
        </button>

        <div className={styles.guarantee}>
          <i className="ti ti-shield-check" style={{fontSize:24,color:'var(--green)',flexShrink:0}}/>
          <div><strong>Garantia de 7 dias</strong><p>Se não gostar, devolvemos 100% do valor.</p></div>
        </div>
      </div>
    </div>
  )
}
