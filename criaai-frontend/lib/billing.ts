// Guarda a data do ultimo pagamento e da proxima cobranca de cada assinante (tabela billing_info).
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
    const next = opts.nextChargeAt || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
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
  } catch (e) {
    console.error('[billing] erro ao registrar pagamento:', e)
  }
}

export async function clearBilling(admin: any, userId: string): Promise<void> {
  try {
    await admin.from('billing_info').delete().eq('user_id', userId)
  } catch (e) {}
}
