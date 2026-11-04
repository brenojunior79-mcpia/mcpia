import { NextRequest, NextResponse } from 'next/server'
import { adminClient, escopoDoUsuario, requireAdmin, requireStaff } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

function canalDe(v: any): 'suporte' | 'recuperacao' | '' { return v === 'suporte' || v === 'recuperacao' ? v : '' }
function limpa(v: any, max: number): string { return String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max) }

// Video enviado para o armazenamento pela tela do admin (so vale se estiver na pasta de mensagens rapidas do canal)
function videoDe(v: any, canal: string): { video_path: string; video_mime: string; video_nome: string } | null {
  if (!v || typeof v.path !== 'string') return null
  const path = String(v.path)
  if (path.indexOf('rapidas/' + canal + '/') !== 0 || path.indexOf('..') >= 0) return null
  const mime = String(v.mime || '').split(';')[0].trim().toLowerCase()
  if (mime !== 'video/mp4' && mime !== 'video/3gpp') return null
  return { video_path: path, video_mime: mime, video_nome: limpa(v.nome, 120) || 'video.mp4' }
}

// Lista as mensagens rapidas de um canal (toda a equipe pode usar)
export async function GET(req: NextRequest) {
  const staffId = await requireStaff()
  if (!staffId) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  const canal = canalDe(req.nextUrl.searchParams.get('canal'))
  if (!canal) return NextResponse.json({ error: 'Canal invalido.' }, { status: 400 })
  // Atendente de so um chat nao ve as mensagens do outro
  const escopo = await escopoDoUsuario(staffId)
  if (escopo !== 'todos' && escopo !== canal) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  const r = await adminClient().from('wa_respostas_rapidas').select('id, canal, titulo, texto, ordem, video_path, video_nome').eq('canal', canal).order('ordem', { ascending: true }).order('created_at', { ascending: true })
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel carregar.' }, { status: 500 })
  // O caminho do arquivo nao sai do servidor: a tela so sabe se tem video e qual o nome
  const lista = (r.data || []).map(function(x: any) { return { id: x.id, canal: x.canal, titulo: x.titulo, texto: x.texto, ordem: x.ordem, tem_video: !!x.video_path, video_nome: x.video_path ? (x.video_nome || 'video.mp4') : null } })
  return NextResponse.json({ rapidas: lista })
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
  const video = videoDe(b?.video, canal)
  if (b?.video && !video) return NextResponse.json({ error: 'Video invalido. Envie de novo.' }, { status: 400 })
  if (!titulo) return NextResponse.json({ error: 'Dê um título curto para o botão.' }, { status: 400 })
  // Com video, o texto e opcional (vira a legenda do video)
  if (!texto && !video) return NextResponse.json({ error: 'Escreva a mensagem ou escolha um vídeo.' }, { status: 400 })
  const admin = adminClient()
  const ult = await admin.from('wa_respostas_rapidas').select('ordem').eq('canal', canal).order('ordem', { ascending: false }).limit(1).maybeSingle()
  const ordem = ((ult.data as any)?.ordem || 0) + 1
  const r = await admin.from('wa_respostas_rapidas').insert({ canal, titulo, texto, ordem, ...(video || {}) }).select('id, canal, titulo, texto, ordem').single()
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
  return NextResponse.json({ ok: true, rapida: r.data })
}

// Admin: edita (texto, titulo e, se quiser, troca ou tira o video)
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So o administrador pode editar.' }, { status: 403 })
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const id = String(b?.id || '')
  const titulo = limpa(b?.titulo, 40)
  const texto = limpa(b?.texto, 3000)
  if (!id) return NextResponse.json({ error: 'Mensagem invalida.' }, { status: 400 })
  const admin = adminClient()
  const atual = await admin.from('wa_respostas_rapidas').select('canal, video_path').eq('id', id).maybeSingle()
  if (!atual.data) return NextResponse.json({ error: 'Mensagem nao encontrada.' }, { status: 404 })
  const canal = String((atual.data as any).canal)
  const antigo = (atual.data as any).video_path as string | null
  const novo = b?.video ? videoDe(b.video, canal) : null
  if (b?.video && !novo) return NextResponse.json({ error: 'Video invalido. Envie de novo.' }, { status: 400 })
  const tira = b?.removerVideo === true
  const ficaComVideo = !!novo || (!!antigo && !tira)
  if (!titulo) return NextResponse.json({ error: 'Preencha o título.' }, { status: 400 })
  if (!texto && !ficaComVideo) return NextResponse.json({ error: 'Escreva a mensagem ou escolha um vídeo.' }, { status: 400 })
  const upd: any = { titulo, texto }
  if (novo) Object.assign(upd, novo)
  else if (tira) Object.assign(upd, { video_path: null, video_mime: null, video_nome: null })
  const r = await admin.from('wa_respostas_rapidas').update(upd).eq('id', id)
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
  // Video antigo que saiu: apaga o arquivo
  if (antigo && (novo || tira)) await admin.storage.from('wa-media').remove([antigo]).catch(function() {})
  return NextResponse.json({ ok: true })
}

// Admin: apaga
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So o administrador pode apagar.' }, { status: 403 })
  const id = String(req.nextUrl.searchParams.get('id') || '')
  if (!id) return NextResponse.json({ error: 'Mensagem invalida.' }, { status: 400 })
  const admin = adminClient()
  const antes = await admin.from('wa_respostas_rapidas').select('video_path').eq('id', id).maybeSingle()
  const r = await admin.from('wa_respostas_rapidas').delete().eq('id', id)
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel apagar.' }, { status: 500 })
  const vp = (antes.data as any)?.video_path as string | null
  if (vp) await admin.storage.from('wa-media').remove([vp]).catch(function() {})
  return NextResponse.json({ ok: true })
}
