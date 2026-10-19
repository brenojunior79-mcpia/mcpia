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
  const m = await admin.from('wa_messages').select('media_path, conversation_id, mime').eq('id', id).maybeSingle()
  if (!m.data?.media_path) return new NextResponse('Nao encontrado', { status: 404 })
  if (!(await canAccessConv(staffId, String((m.data as any).conversation_id)))) return new NextResponse('Sem permissao', { status: 403 })
  // Previa de PDF dentro da conversa: entrega o arquivo "aberto" (inline) pelo proprio site, para caber num quadro
  if (req.nextUrl.searchParams.get('inline') === '1' && String((m.data as any).mime || '').toLowerCase().split(';')[0].trim() === 'application/pdf') {
    const dl = await admin.storage.from('wa-media').download(m.data.media_path)
    if (dl.data && dl.data.size <= 15 * 1024 * 1024) {
      return new NextResponse(dl.data.stream() as any, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=300' } })
    }
  }
  const s = await admin.storage.from('wa-media').createSignedUrl(m.data.media_path, 300)
  if (!s.data?.signedUrl) return new NextResponse('Nao encontrado', { status: 404 })
  return NextResponse.redirect(s.data.signedUrl, 302)
}
