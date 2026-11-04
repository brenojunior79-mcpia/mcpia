import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { adminClient } from '@/lib/whatsapp'
import { editarImagemOpenAI, gerarImagemOpenAI, mensagemAmigavelImagem } from '@/lib/openaiImage'
import { PASTA_AVATAR, PROMPT_BASE, PROMPT_VARIACAO, QUADROS } from '@/lib/avatarEscritorio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function quem() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const p = await adminClient().from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  return { id: user.id, admin: !!(p.data as any)?.is_admin }
}

// Devolve os enderecos das imagens da Camila que ja foram criadas
export async function GET() {
  const u = await quem()
  if (!u) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })
  const admin = adminClient()
  const lista = await admin.storage.from('page-images').list(PASTA_AVATAR, { limit: 20 })
  const quadros: Record<string, string> = {}
  ;((lista.data || []) as any[]).forEach(function(f) {
    const nome = String(f.name || '').replace(/\.png$/, '')
    if ((QUADROS as readonly string[]).indexOf(nome) >= 0) {
      const v = f.updated_at ? new Date(f.updated_at).getTime() : Date.now()
      quadros[nome] = admin.storage.from('page-images').getPublicUrl(PASTA_AVATAR + '/' + nome + '.png').data.publicUrl + '?v=' + v
    }
  })
  return NextResponse.json({ quadros, podeCriar: u.admin })
}

// Cria UMA imagem por chamada (so o admin). A primeira (base) vem do texto; as outras sao edicoes da base.
export async function POST(req: NextRequest) {
  const u = await quem()
  if (!u) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })
  if (!u.admin) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI nao configurada.' }, { status: 500 })
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const quadro = String(b.quadro || '')
  if ((QUADROS as readonly string[]).indexOf(quadro) < 0) return NextResponse.json({ error: 'Quadro invalido.' }, { status: 400 })
  const admin = adminClient()
  try {
    let b64: string | null = null
    if (quadro === 'base') {
      const r = await gerarImagemOpenAI({ prompt: PROMPT_BASE, size: '1024x1536', quality: 'medium' })
      b64 = r.b64
    } else {
      const base = await admin.storage.from('page-images').download(PASTA_AVATAR + '/base.png')
      if (base.error || !base.data) return NextResponse.json({ error: 'Crie primeiro a imagem base.' }, { status: 400 })
      const r = await editarImagemOpenAI({ prompt: PROMPT_VARIACAO[quadro], imagem: base.data, size: '1024x1536', quality: 'medium' })
      b64 = r.b64
    }
    if (!b64) return NextResponse.json({ error: 'Nao foi possivel criar a imagem agora.' }, { status: 500 })
    const up = await admin.storage.from('page-images').upload(PASTA_AVATAR + '/' + quadro + '.png', Buffer.from(b64, 'base64'), { contentType: 'image/png', upsert: true })
    if (up.error) return NextResponse.json({ error: 'Nao consegui salvar a imagem.' }, { status: 500 })
    const url = admin.storage.from('page-images').getPublicUrl(PASTA_AVATAR + '/' + quadro + '.png').data.publicUrl + '?v=' + Date.now()
    return NextResponse.json({ quadro, url })
  } catch (e: any) {
    console.error('[avatar/escritorio]', e && e.message ? e.message : e)
    return NextResponse.json({ error: mensagemAmigavelImagem(String(e && e.message ? e.message : '')).replace('a capa', 'a imagem') }, { status: 500 })
  }
}
