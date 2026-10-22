import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Resumo do que o aluno ja fez na plataforma (so os numeros dele).
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const conta = async function(tabela: string, filtro?: (q: any) => any): Promise<number> {
    try {
      let q: any = admin.from(tabela).select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      if (filtro) q = filtro(q)
      const r = await q
      return r.count || 0
    } catch (e) { return 0 }
  }

  const [ebooks, sites, perguntas, roteiros, analises, videos, paginas] = await Promise.all([
    conta('ebooks'),
    conta('sales_pages'),
    conta('chat_messages', function(q) { return q.eq('role', 'user') }),
    conta('criativo_roteiros'),
    conta('metricas_analises'),
    conta('generations', function(q) { return q.eq('type', 'video').eq('status', 'completed') }),
    admin.from('sales_pages').select('views').eq('user_id', user.id).limit(500),
  ])
  const visitas = ((paginas as any).data || []).reduce(function(t: number, p: any) { return t + (Number(p.views) || 0) }, 0)

  return NextResponse.json({ ebooks, sites, visitas, perguntas, roteiros, analises, criativos: videos })
}
