import { NextRequest, NextResponse } from 'next/server'
import { adminClient, canAccessConv, requireStaff } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// Mostra imagem / audio / documento recebido (so para a equipe)
export async function GET(req: NextRequest) {
  const staffId = await requireStaff()
  if (!staffId) return new NextResponse('Sem permissao', { status: 403 })
  const id = req.nextUrl.searchParams.get('m') || ''
  if (!id) return new NextResponse('Pedido invalido', { status: 400 })
  const admin = adminClient()
  const m = await admin.from('wa_messages').select('media_path, conversation_id').eq('id', id).maybeSingle()
  if (!m.data?.media_path) return new NextResponse('Nao encontrado', { status: 404 })
  if (!(await canAccessConv(staffId, String((m.data as any).conversation_id)))) return new NextResponse('Sem permissao', { status: 403 })
  const s = await admin.storage.from('wa-media').createSignedUrl(m.data.media_path, 300)
  if (!s.data?.signedUrl) return new NextResponse('Nao encontrado', { status: 404 })
  return NextResponse.redirect(s.data.signedUrl, 302)
}
