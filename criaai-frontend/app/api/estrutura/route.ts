import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Menu Estrutura Express: so entrega as aulas para quem tem acesso (admin, liberado manual ou comprador do upsell).
// Quem nao tem acesso recebe apenas { acesso: false } — o conteudo nunca sai do servidor.
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const [acessoR, perfilR] = await Promise.all([
    supabase.rpc('tem_estrutura_express'),
    supabase.from('profiles').select('is_admin, is_support').eq('id', user.id).maybeSingle(),
  ])
  // Atendentes (equipe de suporte) tambem tem acesso ao menu, sem precisar de compra
  const acesso = acessoR.data === true || !!(perfilR.data as any)?.is_support
  const isAdmin = !!(perfilR.data as any)?.is_admin
  if (!acesso) return NextResponse.json({ acesso: false, isAdmin: false })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const aulas = await admin.from('estrutura_aulas').select('id, ordem, titulo, descricao, video_id, material_label, material_url, material_aviso').eq('ativo', true).order('ordem', { ascending: true }).order('created_at', { ascending: true })
  let liberados: any[] = []
  if (isAdmin) {
    const l = await admin.from('estrutura_liberados').select('email, nota, created_at').order('created_at', { ascending: false })
    liberados = l.data || []
  }
  return NextResponse.json({ acesso: true, isAdmin, aulas: aulas.data || [], liberados })
}
