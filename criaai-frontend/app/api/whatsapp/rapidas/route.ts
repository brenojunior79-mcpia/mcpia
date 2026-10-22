import { NextRequest, NextResponse } from 'next/server'
import { adminClient, escopoDoUsuario, requireAdmin, requireStaff } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

function canalDe(v: any): 'suporte' | 'recuperacao' | '' { return v === 'suporte' || v === 'recuperacao' ? v : '' }
function limpa(v: any, max: number): string { return String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max) }

// Lista as mensagens rapidas de um canal (toda a equipe pode usar)
export async function GET(req: NextRequest) {
  const staffId = await requireStaff()
  if (!staffId) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  const canal = canalDe(req.nextUrl.searchParams.get('canal'))
  if (!canal) return NextResponse.json({ error: 'Canal invalido.' }, { status: 400 })
  // Atendente de so um chat nao ve as mensagens do outro
  const escopo = await escopoDoUsuario(staffId)
  if (escopo !== 'todos' && escopo !== canal) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  const r = await adminClient().from('wa_respostas_rapidas').select('id, canal, titulo, texto, ordem').eq('canal', canal).order('ordem', { ascending: true }).order('created_at', { ascending: true })
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel carregar.' }, { status: 500 })
  return NextResponse.json({ rapidas: r.data || [] })
}

// Admin: cria
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So o administrador pode adicionar.' }, { status: 403 })
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const canal = canalDe(b?.canal)
  const titulo = limpa(b?.titulo, 40)
  const texto = limpa(b?.texto, 3000)
  if (!canal) return NextResponse.json({ error: 'Canal invalido.' }, { status: 400 })
  if (!titulo) return NextResponse.json({ error: 'Dê um título curto para o botão.' }, { status: 400 })
  if (!texto) return NextResponse.json({ error: 'Escreva a mensagem.' }, { status: 400 })
  const admin = adminClient()
  const ult = await admin.from('wa_respostas_rapidas').select('ordem').eq('canal', canal).order('ordem', { ascending: false }).limit(1).maybeSingle()
  const ordem = ((ult.data as any)?.ordem || 0) + 1
  const r = await admin.from('wa_respostas_rapidas').insert({ canal, titulo, texto, ordem }).select('id, canal, titulo, texto, ordem').single()
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
  return NextResponse.json({ ok: true, rapida: r.data })
}

// Admin: edita
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So o administrador pode editar.' }, { status: 403 })
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const id = String(b?.id || '')
  const titulo = limpa(b?.titulo, 40)
  const texto = limpa(b?.texto, 3000)
  if (!id) return NextResponse.json({ error: 'Mensagem invalida.' }, { status: 400 })
  if (!titulo || !texto) return NextResponse.json({ error: 'Preencha o título e a mensagem.' }, { status: 400 })
  const r = await adminClient().from('wa_respostas_rapidas').update({ titulo, texto }).eq('id', id)
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Admin: apaga
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So o administrador pode apagar.' }, { status: 403 })
  const id = String(req.nextUrl.searchParams.get('id') || '')
  if (!id) return NextResponse.json({ error: 'Mensagem invalida.' }, { status: 400 })
  const r = await adminClient().from('wa_respostas_rapidas').delete().eq('id', id)
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel apagar.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
