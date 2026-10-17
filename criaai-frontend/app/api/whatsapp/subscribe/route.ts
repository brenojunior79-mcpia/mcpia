import { NextResponse } from 'next/server'
import { graphError, graphFetch, requireAdmin, wabaId } from '@/lib/whatsapp'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

// Liga este app (Api Acessos) a conta do WhatsApp, para as mensagens chegarem no webhook (so admin)
export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  const waba = await wabaId()
  if (!waba) return NextResponse.json({ error: 'Nao consegui achar a conta do WhatsApp (WABA). Adicione WHATSAPP_WABA_ID na Vercel.' }, { status: 400 })
  const r = await graphFetch(waba + '/subscribed_apps', { method: 'POST' })
  if (!r.ok) return NextResponse.json({ error: graphError(r.data) }, { status: 400 })
  const list = await graphFetch(waba + '/subscribed_apps')
  const apps: string[] = (list.data?.data || []).map(function(x: any) { return String(x.whatsapp_business_api_data?.name || x.name || x.id || '') }).filter(Boolean)
  return NextResponse.json({ ok: true, waba, apps })
}
