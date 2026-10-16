// Programa "Indique a plataforma e ganhe R$ 60 no Pix".
// Usado pelos avisos da Hubla e da Cakto. Nunca deve derrubar o aviso principal: qualquer erro e' so logado.
import { classifyProduct } from '@/lib/sales-ledger'

// Link de checkout da Mentoria Cristao Prospero (R$ 297) na Hubla
export const REFERRAL_CHECKOUT = 'https://pay.hub.la/GTKvY7Bjy0ouDG8CtPJg'

// O codigo do indicador viaja no link de pagamento (sck / utm). Procuramos em qualquer lugar do aviso.
export function extractRefCode(payload: any): string | null {
  try {
    const m = JSON.stringify(payload).match(/ref_([A-Z0-9]{8})(?![A-Z0-9])/i)
    return m ? m[1].toUpperCase() : null
  } catch (e) {
    return null
  }
}

// Venda aprovada: so a Mentoria Cristao Prospero conta como indicacao.
export async function trackReferralSale(
  admin: any,
  opts: { provider: 'hubla' | 'cakto'; externalId: any; productNames: any[]; email: any; name: any; paidAt: any; payload: any }
): Promise<void> {
  try {
    if (!opts.productNames.some(function(n) { return classifyProduct(n) === 'mentoria' })) return
    const id = String(opts.externalId || '').trim()
    const email = String(opts.email || '').trim()
    if (!id || !email) return
    const given = opts.paidAt ? new Date(opts.paidAt) : null
    const now = Date.now()
    const paid = given && !isNaN(given.getTime()) && given.getTime() <= now + 5 * 60 * 1000 && given.getTime() >= now - 3 * 24 * 60 * 60 * 1000 ? given : new Date(now)
    const r = await admin.rpc('referral_on_sale', {
      p_code: extractRefCode(opts.payload),
      p_email: email,
      p_name: String(opts.name || ''),
      p_provider: opts.provider,
      p_external_id: id,
      p_paid_at: paid.toISOString(),
    })
    if (r.error) console.error('[referrals] erro na venda:', r.error.message)
  } catch (e) {
    console.error('[referrals] erro:', e)
  }
}

// Reembolso: a indicacao deixa de valer (se o saque ainda nao foi pedido)
export async function trackReferralRefund(admin: any, opts: { provider: 'hubla' | 'cakto'; externalId: any; email: any }): Promise<void> {
  try {
    const id = String(opts.externalId || '').trim()
    if (!id) return
    const r = await admin.rpc('referral_on_refund', { p_provider: opts.provider, p_external_id: id, p_email: String(opts.email || '') })
    if (r.error) console.error('[referrals] erro no reembolso:', r.error.message)
  } catch (e) {
    console.error('[referrals] erro:', e)
  }
}
