import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/whatsapp'
import { classificar } from '@/lib/waMedia'

export const dynamic = 'force-dynamic'

// Admin: prepara o envio de um VIDEO para uma mensagem rapida (o navegador sobe direto ao armazenamento)
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So o administrador pode adicionar video.' }, { status: 403 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 }) }
  const canal = input?.canal === 'recuperacao' ? 'recuperacao' : input?.canal === 'suporte' ? 'suporte' : ''
  const size = Number(input?.size || 0)
  const c = classificar(String(input?.mime || ''))
  if (!canal) return NextResponse.json({ error: 'Canal invalido.' }, { status: 400 })
  if ('erro' in c) return NextResponse.json({ error: c.erro }, { status: 400 })
  if (c.kind !== 'video') return NextResponse.json({ error: 'Escolha um video MP4 (o WhatsApp aceita MP4 ou 3GP).' }, { status: 400 })
  if (!(size > 0)) return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 400 })
  if (size > c.max) return NextResponse.json({ error: 'O video e grande demais: o WhatsApp aceita ate ' + Math.round(c.max / 1048576) + ' MB. Comprima o video e tente de novo.' }, { status: 400 })
  const ext = (String(input?.filename || '').split('.').pop() || 'mp4').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5) || 'mp4'
  const path = 'rapidas/' + canal + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext
  const s = await adminClient().storage.from('wa-media').createSignedUploadUrl(path)
  if (s.error || !s.data) return NextResponse.json({ error: 'Nao foi possivel preparar o envio.' }, { status: 500 })
  return NextResponse.json({ path, token: s.data.token, mime: c.mime })
}
