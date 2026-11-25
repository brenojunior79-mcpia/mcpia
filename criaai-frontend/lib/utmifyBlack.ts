// Envia as vendas do Black 2026 (e reembolsos) para a Utmify (pedido do Breno, 25/11/2026).
// O produto Black 2026 nao foi conectado a Utmify dentro da Hubla, entao a plataforma manda sozinha.
// Valor enviado = so o liquido (o que sobra depois da taxa da Hubla), nunca o total do parcelamento.
// Chave na Vercel: UTMIFY_API_TOKEN. Sem a chave, nao faz nada.

const RATIO_HUBLA = 0.956 // mesmo criterio do card de vendas (lib/sales-ledger.ts)

function dataUtc(v: any): string {
  const d = v ? new Date(v) : new Date()
  const ok = isNaN(d.getTime()) ? new Date() : d
  return ok.toISOString().slice(0, 19).replace('T', ' ')
}

function param(obj: any, k: string): string | null {
  const v = obj && obj[k]
  return v ? String(v).slice(0, 200) : null
}

export async function enviarBlackUtmify(eventType: string, payload: any): Promise<void> {
  const token = process.env.UTMIFY_API_TOKEN
  if (!token) return
  if (eventType !== 'invoice.payment_succeeded' && eventType !== 'invoice.refunded') return
  try {
    const ev = payload?.event || {}
    const prods: any[] = ev.products || (ev.product ? [ev.product] : [])
    if (!prods.some(function(p: any) { return String(p?.name || '').toLowerCase().includes('black 2026') })) return
    const inv = ev.invoice || {}
    if (!inv.id) return
    const a = inv.amount || {}
    const bruto = Number(a.subtotalCents ?? a.totalCents)
    if (!isFinite(bruto) || bruto <= 0) return
    const liquido = Math.round(bruto * RATIO_HUBLA)
    const u = ev.user || {}
    const email = String(u.email || '').toLowerCase().trim()
    const nome = String(u.fullName || u.name || ((u.firstName || '') + ' ' + (u.lastName || '')) || '').trim() || email.split('@')[0]
    const fone = String(u.phone || u.phoneNumber || '').replace(/\D/g, '') || null
    const utm = inv.utm || inv.tracking || ev.utm || ev.tracking || {}
    const pago = dataUtc(inv.paidAt || inv.createdAt)
    const reembolso = eventType === 'invoice.refunded'
    const body = {
      orderId: String(inv.id),
      platform: 'Hubla',
      paymentMethod: String(inv.paymentMethod || '').toLowerCase().includes('pix') ? 'pix' : 'credit_card',
      status: reembolso ? 'refunded' : 'paid',
      createdAt: dataUtc(inv.createdAt || inv.paidAt),
      approvedDate: pago,
      refundedAt: reembolso ? dataUtc(null) : null,
      customer: { name: nome, email, phone: fone, document: null, country: 'BR' },
      products: [{ id: 'black-2026', name: 'Black 2026', planId: null, planName: null, quantity: 1, priceInCents: liquido }],
      trackingParameters: {
        src: param(utm, 'src'), sck: param(utm, 'sck'),
        utm_source: param(utm, 'utm_source') || param(utm, 'source'), utm_campaign: param(utm, 'utm_campaign') || param(utm, 'campaign'),
        utm_medium: param(utm, 'utm_medium') || param(utm, 'medium'), utm_content: param(utm, 'utm_content') || param(utm, 'content'),
        utm_term: param(utm, 'utm_term') || param(utm, 'term'),
      },
      commission: { totalPriceInCents: liquido, gatewayFeeInCents: 0, userCommissionInCents: liquido },
      isTest: false,
    }
    const r = await fetch('https://api.utmify.com.br/api-credentials/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-token': token }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) console.error('[utmify-black] envio recusado, status', r.status)
  } catch (e) {
    console.error('[utmify-black] falha no envio')
  }
}
