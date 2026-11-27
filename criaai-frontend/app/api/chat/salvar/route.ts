import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Guarda a mensagem do aluno no servidor na hora em que ele envia.
// Assim ela aparece igual no celular, no aplicativo e no computador, mesmo antes do Junior responder.
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const corpo = await req.json()
    const content = String(corpo?.content || '').trim().slice(0, 4000)
    if (!content && !corpo?.imageBase64) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
    const audio = String(corpo?.audioPath || '')
    // Print (foto da tela): guarda na pasta privada na hora, para o Junior conseguir ver mesmo se o aluno fechar o app
    let print: string | null = null
    const img = typeof corpo?.imageBase64 === 'string' ? corpo.imageBase64 : ''
    if (img) {
      const m = img.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/)
      if (m) {
        const ext = m[1] === 'image/jpeg' ? 'jpg' : m[1].split('/')[1]
        const caminho = user.id + '/' + Date.now() + '.' + ext
        const up = await supabase.storage.from('chat-prints').upload(caminho, Buffer.from(m[2], 'base64'), { contentType: m[1], upsert: false })
        if (!up.error) print = caminho
      }
      if (!print) return NextResponse.json({ error: 'Print nao salvou' }, { status: 500 })
    }
    const row: any = { user_id: user.id, role: 'user', content: print ? (content === '📷' ? '' : content) + ' [imagem anexada]' : content, image_path: print || (audio && audio.indexOf(user.id + '/') === 0 && audio.indexOf('..') < 0 ? 'audio:' + audio : null) }
    const t = Date.parse(String(corpo?.hora || ''))
    if (t && t <= Date.now() && Date.now() - t < 30 * 60 * 1000) row.created_at = new Date(t).toISOString()
    const r = await supabase.from('chat_messages').insert(row).select('id').single()
    if (r.error) return NextResponse.json({ error: 'Não salvou' }, { status: 500 })
    return NextResponse.json({ id: r.data.id })
  } catch (e) {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
