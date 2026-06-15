import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY!
const CREATOMATE_TEMPLATE_ID = process.env.CREATOMATE_TEMPLATE_ID!
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY!
const AGENCY_VIDEO_LIMIT = 100

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

async function getUnsplashImages(query: string): Promise<string[]> {
  try {
    const url = 'https://api.unsplash.com/search/photos?query=' + encodeURIComponent(query) + '&per_page=4&orientation=portrait'
    const res = await fetch(url, { headers: { 'Authorization': 'Client-ID ' + UNSPLASH_ACCESS_KEY } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).map(function(img: any) { return img.urls.regular })
  } catch { return [] }
}

async function generateScript(niche: string, tone: string, customPrompt: string) {
  const toneMap: Record<string, string> = {
    lifestyle: 'inspirador, caloroso e acessivel',
    urgencia: 'urgente, direto e com senso de escassez',
    luxo: 'sofisticado, elegante e premium',
    humor: 'divertido, descontraido e com bom humor',
  }
  const toneDesc = toneMap[tone] || toneMap['lifestyle']
  const extra = customPrompt && customPrompt.trim().length > 10 ? 'Instrucoes: ' + customPrompt : ''

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Voce e especialista em criativos de vendas. Crie roteiros em portugues brasileiro. Retorne APENAS JSON com 4 campos: text1 (hook max 80 chars), text2 (problema max 100 chars), text3 (beneficio max 100 chars), text4 (CTA max 80 chars). Sem markdown.' },
      { role: 'user', content: 'Produto: ' + niche + '. Tom: ' + toneDesc + '. ' + extra },
    ],
    temperature: 0.8,
    max_tokens: 300,
  })

  const content = response.choices[0].message.content || '{}'
  const clean = content.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(clean)
    return {
      text1: String(parsed.text1 || 'Voce precisa ver isso!'),
      text2: String(parsed.text2 || 'Transforme sua vida hoje'),
      text3: String(parsed.text3 || 'Resultado garantido'),
      text4: String(parsed.text4 || 'Clique agora!'),
    }
  } catch {
    return {
      text1: 'Voce precisa ver isso!',
      text2: 'Transforme sua vida com ' + niche,
      text3: 'Resultado garantido ou dinheiro de volta',
      text4: 'Clique agora e saiba mais!',
    }
  }
}

async function createRender(script: { text1: string; text2: string; text3: string; text4: string }, images: string[]): Promise<string> {
  const mods: Record<string, string> = {
    'Text-1.text': script.text1,
    'Text-2.text': script.text2,
    'Text-3.text': script.text3,
    'Text-4.text': script.text4,
  }
  if (images[0]) mods['Background-1.source'] = images[0]
  if (images[1]) mods['Background-2.source'] = images[1]
  if (images[2]) mods['Background-3.source'] = images[2]
  if (images[3]) mods['Background-4.source'] = images[3]

  const payload = JSON.stringify({ template_id: CREATOMATE_TEMPLATE_ID, modifications: mods })

  const res = await fetch('https://api.creatomate.com/v2/renders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + CREATOMATE_API_KEY },
    body: payload,
  })

  if (!res.ok) throw new Error('Creatomate error ' + res.status + ': ' + await res.text())
  const data = await res.json()
  const renders = Array.isArray(data) ? data : [data]
  const renderId = renders[0]?.id
  if (!renderId) throw new Error('Creatomate sem render ID')
  return renderId
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
    )

    const user = (await supabase.auth.getUser()).data.user
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const reqBody = await req.json()
    const niche: string = reqBody.niche || ''
    const tone: string = reqBody.tone || 'lifestyle'
    const format: string = reqBody.format || '9:16'
    const customPrompt: string = reqBody.customPrompt || ''

    if (!niche && !customPrompt) return NextResponse.json({ error: 'Preencha o nicho ou descreva o criativo.' }, { status: 400 })

    const profileData = (await supabase
      .from('profiles')
      .select('credits_videos_used, credits_videos_extra, subscription_status, plans(name, credits_videos, is_unlimited)')
      .eq('id', user.id)
      .single()).data

    if (!profileData) return NextResponse.json({ error: 'Perfil nao encontrado' }, { status: 404 })

    const status = profileData.subscription_status
    if (status !== 'active' && status !== 'trialing') {
      return NextResponse.json({
        error: 'Assine um plano para usar este recurso.',
        requiresPlan: true,
      }, { status: 403 })
    }

    const plan = (profileData as any)?.plans
    const isUnlimited = plan?.is_unlimited
    const isAgency = plan?.name === 'Agency' || plan?.name === 'Premium'
    const used = profileData.credits_videos_used || 0
    const extraCredits = profileData.credits_videos_extra || 0
    const limit = isUnlimited ? 999999 : ((plan?.credits_videos || 0) + extraCredits)

    if (isAgency || isUnlimited) {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const countResult = await supabase.from('generations').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('type', 'video').gte('created_at', startOfMonth.toISOString())
      if ((countResult.count || 0) >= AGENCY_VIDEO_LIMIT) return NextResponse.json({ error: 'Limite mensal atingido.', limitReached: true }, { status: 429 })
    } else {
      if (used >= limit) return NextResponse.json({ error: 'Sem creditos de video disponiveis.', limitReached: true }, { status: 403 })
    }

    const searchQuery = niche || customPrompt.slice(0, 50)
    const [script, images] = await Promise.all([generateScript(niche, tone, customPrompt), getUnsplashImages(searchQuery)])
    const renderId = await createRender(script, images)

    await supabase.from('generations').insert({
      user_id: user.id,
      type: 'video',
      status: 'pending',
      niche: niche || customPrompt.slice(0, 50),
      format: format,
      credits_consumed: 1,
      metadata: { renderId, tone, customPrompt, script, provider: 'creatomate' },
    })

    return NextResponse.json({ renderId, script })
  } catch (err: any) {
    console.error('[generate-video]', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
