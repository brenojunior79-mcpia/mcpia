import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// O service worker avisa aqui quando uma notificacao chegou no aparelho ('recebida') e quando a pessoa
// tocou nela ('clique'). O aparelho e identificado pelo endereco do proprio push; se ele nao existir, ignora.
export async function POST(req: NextRequest) {
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const evento = String(b.evento || '')
  const tipo = String(b.tipo || '')
  const ref = b.ref ? String(b.ref).slice(0, 60) : null
  const endpoint = String(b.endpoint || '')
  if ((evento !== 'recebida' && evento !== 'clique') || !/^[a-z_]{2,30}$/.test(tipo) || !endpoint || endpoint.length > 1000) return NextResponse.json({ ok: false }, { status: 400 })
  const db: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const s = await db.from('push_subscriptions').select('user_id').eq('endpoint', endpoint).limit(1).maybeSingle()
  if (!s.data?.user_id) return NextResponse.json({ ok: true })
  await db.from('push_eventos').insert({ user_id: s.data.user_id, tipo, ref, evento })
  return NextResponse.json({ ok: true })
}
