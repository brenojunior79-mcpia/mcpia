import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Admin libera um plano para um aluno pelo e-mail (sem esperar compra). Somente admin.
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (!(me.data as any)?.is_admin) return NextResponse.json({ error: 'Somente o admin pode liberar planos.' }, { status: 403 })

    let body: any = {}
    try { body = await req.json() } catch (e) {}
    const email = String(body?.email || '').trim().toLowerCase()
    const plano = String(body?.plano || '').trim()
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
    if (!plano) return NextResponse.json({ error: 'Escolha o plano.' }, { status: 400 })

    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const [pl, pr] = await Promise.all([
      admin.from('plans').select('id, name').ilike('name', plano).maybeSingle(),
      admin.from('profiles').select('id, full_name, email, is_admin').eq('email', email).maybeSingle(),
    ])
    if (!pl.data) return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 })
    if (!pr.data) return NextResponse.json({ error: 'Não achei nenhum aluno com esse e-mail. Ele precisa ter criado a conta na plataforma.' }, { status: 404 })

    const up = await admin.from('profiles').update({
      subscription_status: 'active',
      plan_id: (pl.data as any).id,
      payment_provider: 'manual',
      credits_videos_used: 0,
      credits_ebooks_used: 0,
      credits_sites_used: 0,
      refunded_at: null,
      updated_at: new Date().toISOString(),
    }).eq('id', (pr.data as any).id)
    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 })

    // Historico para o admin conferir (nunca derruba a liberacao)
    try {
      await admin.from('hubla_events').insert({ event_type: 'admin.plano_liberado', email, user_id: (pr.data as any).id, action: 'liberado', note: 'Plano ' + (pl.data as any).name + ' liberado manualmente pelo admin', provider: 'manual' })
    } catch (e) {}

    return NextResponse.json({ ok: true, nome: (pr.data as any).full_name || '', email, plano: (pl.data as any).name })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao liberar.' }, { status: 500 })
  }
}
