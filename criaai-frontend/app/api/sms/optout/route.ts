import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/sms'
import { normalizarNumero } from '@/lib/waBroadcast'

export const dynamic = 'force-dynamic'

// Admin: numeros que pediram para nao receber SMS (nunca mais entram nos disparos)
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Só administradores.' }, { status: 403 })
  let input: any = {}
  try { input = await req.json() } catch (e) {}
  const nums = Array.from(new Set(String(input?.numeros || '').split(/[\s,;]+/).map(function(x) { return normalizarNumero(x) }).filter(Boolean) as string[]))
  if (nums.length === 0) return NextResponse.json({ error: 'Nenhum número válido.' }, { status: 400 })
  const r = await adminClient().from('sms_optout').upsert(nums.map(function(p) { return { phone: p } }), { onConflict: 'phone' })
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json({ ok: true, total: nums.length })
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Só administradores.' }, { status: 403 })
  const phone = String(req.nextUrl.searchParams.get('phone') || '')
  if (!phone) return NextResponse.json({ error: 'Número inválido.' }, { status: 400 })
  const r = await adminClient().from('sms_optout').delete().eq('phone', phone)
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
