import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Admin cola os e-mails de quem pediu reembolso (ou nao pagou) e o acesso e removido.
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!me.data?.is_admin) return NextResponse.json({ error: 'Somente o admin pode fazer isso' }, { status: 403 })

    const body = await req.json()
    const raw: string[] = Array.isArray(body.emails) ? body.emails : []
    const emails = Array.from(new Set(raw.map(function(e) { return String(e).toLowerCase().trim() }).filter(function(e) { return EMAIL_RE.test(e) })))
    if (emails.length === 0) return NextResponse.json({ error: 'Nenhum e-mail válido encontrado.' }, { status: 400 })
    if (emails.length > 500) return NextResponse.json({ error: 'Máximo de 500 e-mails por vez.' }, { status: 400 })

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

    const removed: string[] = []
    const notFound: string[] = []
    const skipped: string[] = []
    for (const email of emails) {
      const f = await admin.from('profiles').select('id, is_admin, subscription_status').eq('email', email).maybeSingle()
      if (!f.data) { notFound.push(email); continue }
      if (f.data.is_admin) { skipped.push(email); continue }
      const u = await admin.from('profiles').update({ subscription_status: 'canceled', updated_at: new Date().toISOString() }).eq('id', f.data.id)
      if (u.error) { skipped.push(email); continue }
      removed.push(email)
      try {
        await admin.from('hubla_events').insert({ event_type: 'manual', email, user_id: f.data.id, action: 'removido', note: 'removido pelo admin (reembolso)' })
      } catch (e) {}
    }
    return NextResponse.json({ ok: true, removed, notFound, skipped })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao remover' }, { status: 500 })
  }
}
