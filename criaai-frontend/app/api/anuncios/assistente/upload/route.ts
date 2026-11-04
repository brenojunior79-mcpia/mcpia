import { NextRequest, NextResponse } from 'next/server'
import { usuarioAssistente } from '@/lib/anunciosAssistente'
import { adminClient } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EXT_VIDEO = ['mp4', 'mov', 'webm', 'm4v']
const EXT_IMAGEM = ['jpg', 'jpeg', 'png', 'webp']

// Gera o endereco para o navegador enviar o video ou a imagem direto para o armazenamento (sem passar pelo limite do servidor)
export async function POST(req: NextRequest) {
  const u = await usuarioAssistente()
  if ('erro' in u) return NextResponse.json({ error: u.erro }, { status: u.status })
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const nome = String(b.nome || '')
  const ext = (nome.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const tipo = EXT_VIDEO.indexOf(ext) >= 0 ? 'video' : EXT_IMAGEM.indexOf(ext) >= 0 ? 'imagem' : ''
  if (!tipo) return NextResponse.json({ error: 'Envie um video (mp4, mov) ou uma imagem (jpg, png).' }, { status: 400 })
  const path = 'anuncios/' + u.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext
  const r = await adminClient().storage.from('wa-media').createSignedUploadUrl(path)
  if (r.error || !r.data) return NextResponse.json({ error: 'Nao consegui preparar o envio. Tente de novo.' }, { status: 500 })
  return NextResponse.json({ path, token: r.data.token, tipo })
}
