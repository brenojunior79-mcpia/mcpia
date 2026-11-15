// Mercado Pago: assinatura mensal no cartao dos planos da plataforma (checkout transparente).
// Chaves na Vercel: MP_ACCESS_TOKEN (servidor), NEXT_PUBLIC_MP_PUBLIC_KEY (tela) e MP_WEBHOOK_SECRET (aviso do Mercado Pago).
import { createHmac, timingSafeEqual } from 'crypto'

const API = 'https://api.mercadopago.com'

export const PLANOS_MP: Record<string, number> = { Starter: 39.9, Pro: 49.9, Premium: 79.9 }

export function mpConfigurado(): boolean {
  return !!process.env.MP_ACCESS_TOKEN
}

export async function mp(caminho: string, init?: { method?: string; json?: any; chave?: string }): Promise<{ ok: boolean; status: number; data: any }> {
  const headers: Record<string, string> = { Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN, 'Content-Type': 'application/json' }
  if (init?.chave) headers['X-Idempotency-Key'] = init.chave
  try {
    const r = await fetch(API + caminho, { method: init?.method || 'GET', headers, body: init?.json ? JSON.stringify(init.json) : undefined, cache: 'no-store' })
    const data = await r.json().catch(function() { return null })
    return { ok: r.ok, status: r.status, data }
  } catch (e) {
    return { ok: false, status: 0, data: null }
  }
}

// Mensagem simples para o aluno a partir do erro do Mercado Pago (sem detalhes tecnicos)
export function erroCartao(data: any): string {
  const txt = JSON.stringify(data || {}).toLowerCase()
  if (txt.indexOf('cc_val_433') >= 0) return 'O banco não autorizou este cartão para pagamento mensal. Tente um cartão de CRÉDITO de outro banco (cartão de débito e alguns cartões virtuais não funcionam).'
  if (txt.indexOf('insufficient') >= 0) return 'O cartão não tem limite suficiente. Tente outro cartão.'
  if (txt.indexOf('cvv') >= 0 || txt.indexOf('security_code') >= 0) return 'O código de segurança do cartão está errado. Confira e tente de novo.'
  if (txt.indexOf('expiration') >= 0) return 'A data de validade do cartão está errada. Confira e tente de novo.'
  if (txt.indexOf('card_number') >= 0 || txt.indexOf('bin') >= 0) return 'O número do cartão está errado. Confira e tente de novo.'
  if (txt.indexOf('rejected') >= 0 || txt.indexOf('cc_rejected') >= 0) return 'O banco recusou o pagamento. Tente outro cartão ou fale com o seu banco.'
  return 'Não foi possível concluir a assinatura. Confira os dados do cartão e tente de novo.'
}

// Confere se o aviso veio mesmo do Mercado Pago (cabecalho x-signature: "ts=...,v1=...")
export function avisoValido(xSignature: string | null, xRequestId: string | null, dataId: string): boolean {
  const segredo = process.env.MP_WEBHOOK_SECRET
  if (!segredo) return false
  if (!xSignature) return false
  let ts = '', v1 = ''
  for (const parte of xSignature.split(',')) {
    const [k, v] = parte.split('=').map(function(x) { return (x || '').trim() })
    if (k === 'ts') ts = v
    if (k === 'v1') v1 = v
  }
  if (!ts || !v1) return false
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId
  let manifesto = ''
  if (id) manifesto += 'id:' + id + ';'
  if (xRequestId) manifesto += 'request-id:' + xRequestId + ';'
  manifesto += 'ts:' + ts + ';'
  const esperado = createHmac('sha256', segredo).update(manifesto).digest('hex')
  try {
    const a = Buffer.from(esperado), b = Buffer.from(v1)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch (e) { return false }
}

// external_reference da assinatura: "userId|Plano"
export function lerReferencia(ref: any): { userId: string; plano: string } | null {
  const [userId, plano] = String(ref || '').split('|')
  if (!userId || !plano || !PLANOS_MP[plano]) return null
  return { userId, plano }
}

// Libera o plano (assinatura autorizada) — mesmos campos que a Hubla usa
export async function liberarPlanoMP(admin: any, userId: string, plano: string, preapprovalId: string): Promise<boolean> {
  const p = await admin.from('plans').select('id').eq('name', plano).maybeSingle()
  if (!p.data?.id) return false
  const cur = await admin.from('profiles').select('mp_preapproval_id, subscription_status, plan_id').eq('id', userId).maybeSingle()
  const mesmaAssinaturaJaAtiva = cur.data?.mp_preapproval_id === preapprovalId && cur.data?.subscription_status === 'active' && cur.data?.plan_id === p.data.id
  const upd: any = {
    subscription_status: 'active',
    plan_id: p.data.id,
    payment_provider: 'mercadopago',
    mp_preapproval_id: preapprovalId,
    refunded_at: null,
    updated_at: new Date().toISOString(),
  }
  // Creditos zeram so quando a assinatura comeca (nao a cada aviso repetido)
  if (!mesmaAssinaturaJaAtiva) { upd.credits_videos_used = 0; upd.credits_ebooks_used = 0; upd.credits_sites_used = 0 }
  const u = await admin.from('profiles').update(upd).eq('id', userId)
  return !u.error
}

// Tira o plano so se for esta mesma assinatura (nao mexe em quem assinou de outro jeito depois)
export async function encerrarPlanoMP(admin: any, preapprovalId: string): Promise<boolean> {
  const cur = await admin.from('profiles').select('id, is_admin').eq('mp_preapproval_id', preapprovalId).maybeSingle()
  if (!cur.data || cur.data.is_admin) return false
  const u = await admin.from('profiles').update({ subscription_status: 'canceled', updated_at: new Date().toISOString() }).eq('id', cur.data.id).eq('mp_preapproval_id', preapprovalId)
  return !u.error
}

// Guarda cada tentativa de assinatura (aprovado, recusado, pendente) para o card do admin na tela Planos
export async function registrarEventoMP(admin: any, e: { user_id?: string | null; email?: string; nome?: string; plano?: string; tipo: string; motivo?: string; codigo?: string }): Promise<void> {
  try { await admin.from('mp_eventos').insert({ user_id: e.user_id || null, email: e.email || null, nome: e.nome || null, plano: e.plano || null, tipo: e.tipo, motivo: e.motivo || null, codigo: (e.codigo || '').slice(0, 200) || null }) }
  catch (x) { console.error('[mp-eventos] erro ao gravar') }
}
