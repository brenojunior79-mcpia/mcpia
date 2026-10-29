import { NextRequest, NextResponse } from 'next/server'
import { graphFetch, requireStaff, waConfig } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// Guarda a resposta da Meta por 5 minutos (so a parte do numero; o endereco do webhook e calculado a cada pedido)
let guardadoStatus: { t: number; dados: any } | null = null

// Mostra se o numero do WhatsApp esta conectado (no lugar do "QR code")
export async function GET(req: NextRequest) {
  const staffId = await requireStaff()
  if (!staffId) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  const cfg = waConfig()
  const webhookUrl = req.nextUrl.origin + '/api/whatsapp/webhook'
  if (cfg.missing.length > 0) return NextResponse.json({ connected: false, missing: cfg.missing, webhookUrl })
  if (guardadoStatus && Date.now() - guardadoStatus.t < 5 * 60 * 1000) return NextResponse.json({ ...guardadoStatus.dados, webhookUrl })
  const r = await graphFetch(cfg.phoneId + '?fields=display_phone_number,verified_name,quality_rating,code_verification_status')
  if (!r.ok) return NextResponse.json({ connected: false, missing: [], webhookUrl, error: (r.data?.error?.message || 'Nao consegui falar com a Meta.').slice(0, 200) })
  const dados = { connected: true, number: r.data?.display_phone_number || '', name: r.data?.verified_name || '', quality: r.data?.quality_rating || '' }
  guardadoStatus = { t: Date.now(), dados }
  return NextResponse.json({ ...dados, webhookUrl })
}
