// Registra cada venda nova de Mentoria Cristao Prospero e Estrutura Express (card "Melhores meses de vendas" do admin).
// Usado pelos avisos da Hubla e da Cakto. Nunca deve derrubar o aviso principal: qualquer erro e' so logado.
import { createHash } from 'crypto'

export type SaleProduct = 'mentoria' | 'express'

function plain(s: any): string {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Mesma regra usada na importacao do historico
export function classifyProduct(name: any): SaleProduct | null {
  const n = plain(name)
  if (n.indexOf('estrutura express') >= 0) return 'express'
  if (n.indexOf('mentoria') >= 0 && n.indexOf('prosper') >= 0 && n.indexOf('individual') < 0) return 'mentoria'
  return null
}

function hashEmail(email: any): string | null {
  const e = String(email || '').toLowerCase().trim()
  if (!e) return null
  return createHash('sha256').update(e).digest('hex').slice(0, 20)
}

function validDate(v: any): Date | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function validAmount(v: any): number | null {
  const n = Number(v)
  if (!isFinite(n) || n <= 0 || n > 10000) return null
  return Math.round(n * 100) / 100
}

export async function recordSale(
  admin: any,
  opts: { provider: 'hubla' | 'cakto'; externalId: any; productName: any; amount: any; paidAt: any; email: any }
): Promise<void> {
  try {
    const product = classifyProduct(opts.productName)
    if (!product) return

    const amount = validAmount(opts.amount)
    if (amount === null) {
      console.error('[sales-ledger] venda sem valor valido, nao registrada:', opts.provider, opts.productName, opts.amount)
      return
    }

    // Aviso de pagamento chega na hora; se a data vier estranha, usamos o momento atual
    const now = Date.now()
    const given = validDate(opts.paidAt)
    const paid = given && given.getTime() <= now + 5 * 60 * 1000 && given.getTime() >= now - 3 * 24 * 60 * 60 * 1000 ? given : new Date(now)

    // O historico importado cobre ate uma data; so contamos o que veio depois (evita contar a mesma venda duas vezes)
    const cut = await admin.from('sales_import_cutoff').select('cutoff').eq('provider', opts.provider).maybeSingle()
    if (cut.data?.cutoff && paid.getTime() <= new Date(cut.data.cutoff).getTime()) return

    const emailHash = hashEmail(opts.email)
    const externalId = String(opts.externalId || '').trim() || opts.provider + ':' + (emailHash || 'sem-email') + ':' + product + ':' + paid.toISOString().slice(0, 16)

    const ins = await admin.from('sales_ledger').insert({
      provider: opts.provider,
      external_id: externalId,
      product,
      amount,
      qty: 1,
      paid_at: paid.toISOString(),
      email_hash: emailHash,
      source: 'webhook',
    })
    // 23505 = ja registrada (aviso repetido): tudo certo
    if (ins.error && ins.error.code !== '23505') console.error('[sales-ledger] erro ao registrar venda:', ins.error.message)
  } catch (e) {
    console.error('[sales-ledger] erro:', e)
  }
}

// Reembolso ou chargeback: a venda deixa de contar no mes
export async function markRefunded(admin: any, opts: { provider: 'hubla' | 'cakto'; externalId: any; email: any }): Promise<void> {
  try {
    const now = new Date().toISOString()
    const id = String(opts.externalId || '').trim()
    if (id) {
      const r = await admin.from('sales_ledger').update({ refunded_at: now }).eq('provider', opts.provider).eq('external_id', id).is('refunded_at', null).select('id')
      if (r.data && r.data.length > 0) return
    }
    // Se o id nao bateu, tenta a venda mais recente desse mesmo comprador (so vendas registradas pelos avisos)
    const h = hashEmail(opts.email)
    if (!h) return
    const last = await admin.from('sales_ledger').select('id').eq('provider', opts.provider).eq('email_hash', h).eq('source', 'webhook').is('refunded_at', null).order('paid_at', { ascending: false }).limit(1).maybeSingle()
    if (last.data?.id) await admin.from('sales_ledger').update({ refunded_at: now }).eq('id', last.data.id)
  } catch (e) {
    console.error('[sales-ledger] erro no reembolso:', e)
  }
}
