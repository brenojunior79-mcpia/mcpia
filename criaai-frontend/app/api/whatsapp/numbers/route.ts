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
  for (const id of ids) {
    const w = await graphFetch(id + '?fields=name')
    const p = await graphFetch(id + '/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating&limit=50')
    contas.push({
      waba: id, nome: w.data?.name || '',
      numeros: (p.data?.data || []).map(function(x: any) { return { id: String(x.id), numero: x.display_phone_number, nome: x.verified_name, qualidade: x.quality_rating } }),
      erro: p.ok ? '' : String(p.data?.error?.message || 'sem acesso'),
    })
  }
  return NextResponse.json({ atual: { phoneId: cfg.phoneId, waba: process.env.WHATSAPP_WABA_ID || '' }, contas })
}
