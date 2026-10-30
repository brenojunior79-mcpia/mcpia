import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TIPOS = ['sentimos_falta', 'oferta_express', 'ranking_diario']

async function exigirAdmin() {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return null
  const admin: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const me = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  return me.data?.is_admin ? admin : null
}

// Card "Notificacoes automaticas" (so admin): configuracao, quantas pessoas entrariam agora e o que ja foi enviado
export async function GET() {
  const admin = await exigirAdmin()
  if (!admin) return NextResponse.json({ error: 'Somente o admin' }, { status: 403 })
  const cfg = await admin.from('push_auto_config').select('*')
  const desde7 = new Date(Date.now() - 7 * 86400000).toISOString()
  const desde1 = new Date(Date.now() - 1 * 86400000).toISOString()
  const itens: any[] = []
  for (const tipo of TIPOS) {
    const c = ((cfg.data || []) as any[]).find(function(x) { return x.tipo === tipo })
    const alvos = await admin.rpc('push_auto_alvos', { p_tipo: tipo })
    const pessoas: Record<string, boolean> = {}
    for (const a of (alvos.data || []) as any[]) pessoas[a.user_id] = true
    const ult = await admin.from('push_auto_envios').select('enviado_em').eq('tipo', tipo).order('enviado_em', { ascending: false }).limit(1)
    const s7 = await admin.from('push_auto_envios').select('id', { count: 'exact', head: true }).eq('tipo', tipo).gte('enviado_em', desde7)
    const s1 = await admin.from('push_auto_envios').select('id', { count: 'exact', head: true }).eq('tipo', tipo).gte('enviado_em', desde1)
    itens.push({
      tipo, config: c || null,
      entrariamAgora: Object.keys(pessoas).length,
      ultimoEnvio: (ult.data && ult.data[0] && (ult.data[0] as any).enviado_em) || null,
      enviados24h: s1.count || 0, enviados7d: s7.count || 0,
    })
  }
  const v = ((cfg.data || []) as any[]).find(function(x) { return x.tipo === 'venda_admin' })
  return NextResponse.json({ itens, vendaAdmin: { ativo: v ? v.ativo !== false : true } })
}

export async function POST(req: NextRequest) {
  const admin = await exigirAdmin()
  if (!admin) return NextResponse.json({ error: 'Somente o admin' }, { status: 403 })
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const tipo = String(b.tipo || '')
  if (tipo === 'venda_admin') {
    const r0 = await admin.from('push_auto_config').update({ ativo: !!b.ativo, atualizado_em: new Date().toISOString() }).eq('tipo', 'venda_admin')
    if (r0.error) return NextResponse.json({ error: 'Nao foi possivel salvar: ' + r0.error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  if (TIPOS.indexOf(tipo) === -1) return NextResponse.json({ error: 'Aviso invalido.' }, { status: 400 })
  const titulo = String(b.titulo || '').trim()
  const mensagem = String(b.mensagem || '').trim()
  let url = String(b.url || '').trim() || '/dashboard'
  if (!titulo || titulo.length > 65) return NextResponse.json({ error: 'O titulo precisa ter entre 1 e 65 letras.' }, { status: 400 })
  if (!mensagem || mensagem.length > 240) return NextResponse.json({ error: 'A mensagem precisa ter entre 1 e 240 letras.' }, { status: 400 })
  if (url.charAt(0) !== '/' || url.charAt(1) === '/') return NextResponse.json({ error: 'O link precisa comecar com / (pagina da propria plataforma).' }, { status: 400 })
  const dias = Math.min(60, Math.max(1, parseInt(b.dias_sem_entrar, 10) || 2))
  const repetir = Math.min(60, Math.max(1, parseInt(b.repetir_dias, 10) || 1))
  const r = await admin.from('push_auto_config').update({ ativo: !!b.ativo, titulo, mensagem, url, dias_sem_entrar: dias, repetir_dias: repetir, atualizado_em: new Date().toISOString() }).eq('tipo', tipo)
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel salvar: ' + r.error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
