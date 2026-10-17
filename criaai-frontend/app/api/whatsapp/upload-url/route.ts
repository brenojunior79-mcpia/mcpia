import { NextRequest, NextResponse } from 'next/server'
import { adminClient, canAccessConv, requireStaff } from '@/lib/whatsapp'
import { classificar } from '@/lib/waMedia'

export const dynamic = 'force-dynamic'

// Gera um endereco para o navegador enviar o arquivo direto ao armazenamento (evita o limite de tamanho da Vercel)
export async function POST(req: NextRequest) {
  const staffId = await requireStaff()
  if (!staffId) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 }) }
  const convId = String(input?.conversationId || '')
  const size = Number(input?.size || 0)
  const c = classificar(String(input?.mime || ''))
  if (!convId) return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 })
  if ('erro' in c) return NextResponse.json({ error: c.erro }, { status: 400 })
  if (!(size > 0)) return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 400 })
  if (size > c.max) return NextResponse.json({ error: 'Arquivo grande demais (máximo ' + Math.round(c.max / 1048576) + ' MB para este tipo).' }, { status: 400 })
  if (!(await canAccessConv(staffId, convId))) return NextResponse.json({ error: 'Essa conversa nao esta com voce.' }, { status: 403 })

  const ext = (String(input?.filename || '').split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'bin'
  const path = 'out/' + convId + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext
  const s = await adminClient().storage.from('wa-media').createSignedUploadUrl(path)
  if (s.error || !s.data) return NextResponse.json({ error: 'Nao foi possivel preparar o envio.' }, { status: 500 })
  return NextResponse.json({ path, token: s.data.token })
}
