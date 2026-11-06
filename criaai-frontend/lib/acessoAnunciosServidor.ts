import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { podeUsarAnuncios } from '@/lib/acessoAnuncios'

// Barra no servidor quem nao tem direito ao Gerenciando seus anuncios (so Pro e Premium; admin e conta do revisor da Meta passam).
// Devolve null quando pode usar, ou a resposta 403 pronta quando nao pode.
export async function bloqueioAnuncios(user: any): Promise<NextResponse | null> {
  try {
    const db = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const p = await db.from('profiles').select('is_admin, email, created_at, subscription_status, plans(name)').eq('id', user.id).maybeSingle()
    const d: any = p.data || {}
    const plano = Array.isArray(d.plans) ? (d.plans[0] && d.plans[0].name) : (d.plans && d.plans.name)
    if (podeUsarAnuncios(!!d.is_admin, d.email || user.email, d.created_at, d.subscription_status, plano)) return null
  } catch (e) {}
  return NextResponse.json({ error: 'O Gerenciando seus anuncios e dos planos Pro e Premium.' }, { status: 403 })
}
