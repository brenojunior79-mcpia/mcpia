// Guarda os pagamentos (billing_payments) e a data da proxima cobranca (billing_info) de cada assinante.
// Usado pelos avisos da Cakto e da Hubla. Nunca deve derrubar o aviso principal: qualquer erro e' ignorado.

function toDate(v: any): Date | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

// Pega a primeira data valida e futura entre os campos informados
export function firstFutureDate(candidates: any[]): Date | null {
  const now = Date.now()
  for (const c of candidates) {
    const d = toDate(c)
    if (d && d.getTime() > now) return d
  }
  return null
}

export function toAmount(v: any): number | null {
  const n = Number(v)
  if (!isFinite(n) || n <= 0 || n > 5000) return null
  return Math.round(n * 100) / 100
}

const DAY = 24 * 60 * 60 * 1000

export async function recordPayment(
  admin: any,
  opts: { userId: string; provider: string; amount: number | null; planName: string | null; nextChargeAt: Date | null }
): Promise<void> {
  try {
    let amount = opts.amount
    if (amount === null && opts.planName) {
      const pl = await admin.from('plans').select('price_monthly').eq('name', opts.planName).maybeSingle()
      amount = toAmount(pl.data?.price_monthly)
    }
    if (amount === null) return
    const now = new Date()
    const next = opts.nextChargeAt || new Date(now.getTime() + 30 * DAY)

    await admin.from('billing_info').upsert({
      user_id: opts.userId,
      provider: opts.provider,
      amount,
      cycle: 'monthly',
      last_paid_at: now.toISOString(),
      next_charge_at: next.toISOString(),
      confirmed: true,
      updated_at: now.toISOString(),
    }, { onConflict: 'user_id' })

    // Historico de pagamentos. A Cakto/Hubla mandam varios avisos para o mesmo pagamento
    // (compra aprovada + assinatura criada/renovada), entao se ja existe um pagamento
    // deste aluno nos ultimos 20 dias, atualiza ele em vez de contar de novo.
    const since = new Date(now.getTime() - 20 * DAY).toISOString()
    const last = await admin
      .from('billing_payments')
      .select('id')
      .eq('user_id', opts.userId)
      .gte('paid_at', since)
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (last.data?.id) {
      await admin.from('billing_payments').update({ provider: opts.provider, amount, paid_at: now.toISOString(), confirmed: true }).eq('id', last.data.id)
    } else {
      await admin.from('billing_payments').insert({ user_id: opts.userId, provider: opts.provider, amount, paid_at: now.toISOString(), confirmed: true })
    }
  } catch (e) {
    console.error('[billing] erro ao registrar pagamento:', e)
  }
}

// Cancelamento: some da lista de proximas cobrancas, mas o que ja foi pago continua contando.
// Reembolso (refund = true): tambem tira o ultimo pagamento, porque o dinheiro voltou.
export async function clearBilling(admin: any, userId: string, refund?: boolean): Promise<void> {
  try {
    await admin.from('billing_info').delete().eq('user_id', userId)
    if (refund) {
      const last = await admin
        .from('billing_payments')
        .select('id')
        .eq('user_id', userId)
        .order('paid_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (last.data?.id) await admin.from('billing_payments').delete().eq('id', last.data.id)
    }
  } catch (e) {}
}
