import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { adminClient } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// Ultimas tentativas de assinatura pelo cartao (so admin)
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })
  const admin = adminClient()
  const p = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!(p.data as any)?.is_admin) return NextResponse.json({ error: 'Só o admin.' }, { status: 403 })
  const r = await admin.from('mp_eventos').select('id, created_at, email, nome, plano, tipo, motivo').order('created_at', { ascending: false }).limit(50)
  return NextResponse.json({ eventos: r.data || [] })
}
