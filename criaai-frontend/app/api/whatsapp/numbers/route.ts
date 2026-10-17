import { NextRequest, NextResponse } from 'next/server'
import { graphFetch, requireAdmin, waConfig } from '@/lib/whatsapp'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

// Lista as contas do WhatsApp e os numeros que o token enxerga (com os IDs) — so admin
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  const cfg = waConfig()
  if (!cfg.token) return NextResponse.json({ error: 'Falta o WHATSAPP_TOKEN.' }, { status: 400 })
  const d = await graphFetch('debug_token?input_token=' + encodeURIComponent(cfg.token))
  const ids: string[] = []
  for (const g of (d.data?.data?.granular_scopes || [])) {
    if (g.scope !== 'whatsapp_business_management' && g.scope !== 'whatsapp_business_messaging') continue
    for (const t of (g.target_ids || [])) { if (ids.indexOf(String(t)) < 0) ids.push(String(t)) }
  }
  // Tambem aceita IDs de conta informados na tela (?waba=ID1,ID2) e a conta configurada na Vercel
  const extra = (req.nextUrl.searchParams.get('waba') || '').split(/[^0-9]+/).filter(function(x) { return x.length >= 8 })
  const env = (process.env.WHATSAPP_WABA_ID || '').trim()
  for (const x of extra.concat(env ? [env] : [])) { if (ids.indexOf(x) < 0) ids.push(x) }
  const contas: any[] = []
  const vistos: string[] = []
  async function conta(id: string, nome: string) {
    if (vistos.indexOf(id) >= 0) return
    vistos.push(id)
    const p = await graphFetch(id + '/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating&limit=50')
    if (!p.ok) { contas.push({ waba: id, nome, numeros: [], erro: String(p.data?.error?.message || 'sem acesso') }); return }
    contas.push({
      waba: id, nome,
      numeros: (p.data?.data || []).map(function(x: any) { return { id: String(x.id), numero: x.display_phone_number, nome: x.verified_name, qualidade: x.quality_rating } }),
      erro: '',
    })
  }
  // Tambem procura pelas contas atribuidas ao usuario do sistema e pelas contas do portfolio
  const diag: string[] = []
  const negocio = (process.env.WHATSAPP_BUSINESS_ID || '789560754809867').trim()
  const usuario = (process.env.WHATSAPP_SYSTEM_USER_ID || '61595557738231').trim()
  for (const [pai, rel] of [[usuario, 'assigned_whatsapp_business_accounts'], [negocio, 'owned_whatsapp_business_accounts'], [negocio, 'client_whatsapp_business_accounts']] as string[][]) {
    const l = await graphFetch(pai + '/' + rel + '?fields=id,name&limit=50')
    if (!l.ok) { diag.push(rel + ': ' + String(l.data?.error?.message || 'sem acesso').slice(0, 140)); continue }
    for (const w of (l.data?.data || [])) { await conta(String(w.id), String(w.name || '')) }
  }
  for (const id of ids) {
    const p = await graphFetch(id + '/phone_numbers?fields=id&limit=1')
    if (p.ok) { await conta(id, ''); continue }
    // Se nao for uma conta do WhatsApp, pode ser o ID do negocio: procura as contas dele
    let achou = 0
    for (const rel of ['owned_whatsapp_business_accounts', 'client_whatsapp_business_accounts']) {
      const l = await graphFetch(id + '/' + rel + '?fields=id,name&limit=50')
      for (const w of (l.data?.data || [])) { achou++; await conta(String(w.id), String(w.name || '')) }
    }
    if (!achou) contas.push({ waba: id, nome: '', numeros: [], erro: String(p.data?.error?.message || 'nao e uma conta do WhatsApp nem um negocio com acesso') })
  }
  return NextResponse.json({ atual: { phoneId: cfg.phoneId, waba: process.env.WHATSAPP_WABA_ID || '' }, contas, diag })
}
