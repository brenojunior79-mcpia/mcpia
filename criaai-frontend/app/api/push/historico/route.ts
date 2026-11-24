import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'

// Excluir um envio da lista "Ultimos envios" das notificacoes (so admin). So esconde: o registro continua guardado.
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!me.data?.is_admin) return NextResponse.json({ error: 'Somente o admin' }, { status: 403 })
    const body = await req.json()
    const id = String(body?.id || '')
    if (!id) return NextResponse.json({ error: 'Nada para excluir.' }, { status: 400 })
    const admin: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const r = await admin.from('push_broadcasts').update({ oculto: true }).eq('id', id)
    if (r.error) return NextResponse.json({ error: 'Não consegui excluir.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erro.' }, { status: 500 })
  }
}
