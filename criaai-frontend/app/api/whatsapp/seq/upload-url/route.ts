import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/whatsapp'
import { classificar } from '@/lib/waMedia'

export const dynamic = 'force-dynamic'

// Arquivos dos blocos de audio, imagem e video do construtor de fluxos (so admin).
// POST {mime,size,filename} -> endereco para o navegador enviar o arquivo direto ao armazenamento
// POST {ver: path} -> endereco temporario para tocar/ver o arquivo na tela
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 }) }
  const admin = adminClient()
  if (typeof input?.ver === 'string') {
    const path = input.ver
    if (path.indexOf('seq/') !== 0 || path.indexOf('..') >= 0) return NextResponse.json({ error: 'Arquivo invalido.' }, { status: 400 })
    const s = await admin.storage.from('wa-media').createSignedUrl(path, 600)
    if (s.error || !s.data) return NextResponse.json({ error: 'Nao achei o arquivo.' }, { status: 404 })
    return NextResponse.json({ url: s.data.signedUrl })
  }
  const size = Number(input?.size || 0)
  const c = classificar(String(input?.mime || ''))
  if ('erro' in c) return NextResponse.json({ error: c.erro }, { status: 400 })
  if (c.kind === 'document') return NextResponse.json({ error: 'Aqui só entram áudio, imagem e vídeo.' }, { status: 400 })
  if (!(size > 0)) return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 400 })
  if (size > c.max) return NextResponse.json({ error: 'Arquivo grande demais (máximo ' + Math.round(c.max / 1048576) + ' MB para este tipo).' }, { status: 400 })
  const ext = (String(input?.filename || '').split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'bin'
  const path = 'seq/' + Date.now() + '-' + Math.random().toString(36).slice(2, 10) + '.' + ext
  const s = await admin.storage.from('wa-media').createSignedUploadUrl(path)
  if (s.error || !s.data) return NextResponse.json({ error: 'Nao foi possivel preparar o envio.' }, { status: 500 })
  return NextResponse.json({ path, token: s.data.token, kind: c.kind, mime: c.mime })
}
