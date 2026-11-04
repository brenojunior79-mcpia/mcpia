import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { adminClient } from '@/lib/whatsapp'
import { editarImagemOpenAI, mensagemAmigavelImagem } from '@/lib/openaiImage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Avatar ilustrado criado a partir da foto de perfil da PROPRIA pessoa.
// HOJE SO O ADMIN PODE CRIAR (cada imagem custa). Para liberar para todos os alunos, mude para true.
const AVATAR_IA_PARA_TODOS = false
const LIMITE_POR_PESSOA = 5

const PROMPT = 'Crie um avatar ilustrado, no estilo de personagem de animacao 3D digital moderna, baseado nesta foto. Mantenha os tracos do rosto, a cor da pele, o cabelo, a barba e os oculos da pessoa, para que ela seja reconhecida. Retrato do busto, sorriso simpatico e acolhedor, olhando para a frente, roupa casual elegante, fundo de estudio com luz roxa e neon suave. Sem texto e sem marca dagua.'

async function eu() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const p = await adminClient().from('profiles').select('is_admin, avatar_url, avatar_ia_url, avatar_ia_count').eq('id', user.id).maybeSingle()
  return { id: user.id, p: (p.data || {}) as any }
}

export async function GET() {
  const u = await eu()
  if (!u) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })
  const podeCriar = !!u.p.is_admin || AVATAR_IA_PARA_TODOS
  return NextResponse.json({ avatar: u.p.avatar_ia_url || null, temFoto: !!u.p.avatar_url, podeCriar, restantes: Math.max(0, LIMITE_POR_PESSOA - Number(u.p.avatar_ia_count || 0)) })
}

export async function POST() {
  const u = await eu()
  if (!u) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })
  if (!u.p.is_admin && !AVATAR_IA_PARA_TODOS) return NextResponse.json({ error: 'Este recurso ainda nao esta liberado para a sua conta.' }, { status: 403 })
  if (!u.p.avatar_url) return NextResponse.json({ error: 'Coloque uma foto de perfil primeiro.' }, { status: 400 })
  if (Number(u.p.avatar_ia_count || 0) >= LIMITE_POR_PESSOA) return NextResponse.json({ error: 'Voce ja usou as ' + LIMITE_POR_PESSOA + ' criacoes de avatar.' }, { status: 400 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI nao configurada.' }, { status: 500 })

  try {
    const foto = await fetch(String(u.p.avatar_url).split('?')[0])
    if (!foto.ok) return NextResponse.json({ error: 'Nao consegui abrir a sua foto de perfil.' }, { status: 400 })
    const blob = new Blob([await foto.arrayBuffer()], { type: foto.headers.get('content-type') || 'image/jpeg' })
    const r = await editarImagemOpenAI({ prompt: PROMPT, imagem: blob, size: '1024x1024', quality: 'medium' })
    if (!r.b64) return NextResponse.json({ error: 'Nao foi possivel criar o avatar agora.' }, { status: 500 })
    const admin = adminClient()
    const caminho = 'avatares-ia/' + u.id + '/' + Date.now() + '.png'
    const up = await admin.storage.from('page-images').upload(caminho, Buffer.from(r.b64, 'base64'), { contentType: 'image/png', upsert: true })
    if (up.error) return NextResponse.json({ error: 'Nao consegui salvar o avatar.' }, { status: 500 })
    const url = admin.storage.from('page-images').getPublicUrl(caminho).data.publicUrl
    await admin.from('profiles').update({ avatar_ia_url: url, avatar_ia_count: Number(u.p.avatar_ia_count || 0) + 1 }).eq('id', u.id)
    return NextResponse.json({ avatar: url, restantes: Math.max(0, LIMITE_POR_PESSOA - Number(u.p.avatar_ia_count || 0) - 1) })
  } catch (e: any) {
    console.error('[avatar/ia]', e && e.message ? e.message : e)
    return NextResponse.json({ error: mensagemAmigavelImagem(String(e && e.message ? e.message : '')).replace('a capa', 'o avatar') }, { status: 500 })
  }
}
