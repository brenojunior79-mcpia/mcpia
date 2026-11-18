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
    if (!content) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
    const row: any = { user_id: user.id, role: 'user', content, image_path: null }
    const t = Date.parse(String(corpo?.hora || ''))
    if (t && t <= Date.now() && Date.now() - t < 30 * 60 * 1000) row.created_at = new Date(t).toISOString()
    const r = await supabase.from('chat_messages').insert(row).select('id').single()
    if (r.error) return NextResponse.json({ error: 'Não salvou' }, { status: 500 })
    return NextResponse.json({ id: r.data.id })
  } catch (e) {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
