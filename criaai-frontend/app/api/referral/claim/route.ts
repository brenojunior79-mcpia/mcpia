import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

// Liga o cadastro novo a quem indicou (codigo guardado no navegador pelo link /i/CODIGO).
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

    const code = String(req.cookies.get('mcpia_ref')?.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    const res = NextResponse.json({ ok: true })
    if (code.length !== 8) { res.cookies.set('mcpia_ref', '', { maxAge: 0, path: '/' }); return res }

    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const r = await admin.rpc('referral_claim', { p_user: user.id, p_code: code })
    if (r.error) console.error('[referral] claim:', r.error.message)
    // Cadastro antigo ou codigo proprio: a regra recusa; de qualquer forma o codigo nao precisa ficar guardado
    res.cookies.set('mcpia_ref', '', { maxAge: 0, path: '/' })
    return res
  } catch (e) {
    console.error('[referral] claim:', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
