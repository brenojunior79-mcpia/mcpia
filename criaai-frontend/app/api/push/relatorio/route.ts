import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Relatorio das notificacoes (so admin): enviadas, recebidas, clicaram e ignoraram
export async function GET(req: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const db: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const me = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!me.data?.is_admin) return NextResponse.json({ error: 'Somente o admin' }, { status: 403 })
  const dias = Math.min(180, Math.max(1, parseInt(String(req.nextUrl.searchParams.get('dias') || '30'), 10) || 30))
  const r = await db.rpc('push_relatorio', { p_dias: dias })
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json(r.data)
}
