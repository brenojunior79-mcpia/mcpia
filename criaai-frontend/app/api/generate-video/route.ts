import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY!
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY!
const AGENCY_VIDEO_LIMIT = 100

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// Cache simples em memoria (dura enquanto a funcao ficar "quente" na Vercel)
let cachedDefaultAvatarId: string | null = null
let cachedVoiceId: string | null = null

async function getDefaultAvatarId(): Promise<string> {
  if (cachedDefaultAvatarId) return cachedDefaultAvatarId
  const res = await fetch('https://api.heygen.com/v2/avatars', { headers: { 'X-Api-Key': HEYGEN_API_KEY } })
  if (!res.ok) throw new Error('HeyGen avatars error: ' + res.status)
  const data = await res.json()
  const avatarId = data?.data?.avatars?.[0]?.avatar_id
  if (!avatarId) throw new Error('Nenhum avatar disponivel na conta HeyGen')
  cachedDefaultAvatarId = avatarId
  return avatarId
}

async function getDefaultVoiceId(): Promise<string> {
  if (cachedVoiceId) return cachedVoiceId
  const res = await fetch('https://api.heygen.com/v2/voices', { headers: { 'X-Api-Key': HEYGEN_API_KEY } })
  if (!res.ok) throw new Error('HeyGen voices error: ' + res.status)
  const data = await res.json()
  const voices = data?.data?.voices || []
  const ptVoice = voices.find(function(v: any) {
    return (v.language || '').toLowerCase().includes('portuguese') || (v.language || '').toLowerCase().includes('português')
  })
  const voiceId = ptVoice?.voice_id || voices[0]?.voice_id
  if (!voiceId) throw new Error('Nenhuma voz disponivel na conta HeyGen')
  cachedVoiceId = voiceId
  return voiceId
}

async function getUnsplashImage(query: string): Promise<string | null> {
  try {
    const url = 'https://api.unsplash.com/search/photos?query=' + encodeURIComponent(query) + '&per_page=1&orientation=portrait'
    const res = await fetch(url, { headers: { 'Authorization': 'Client-ID ' + UNSPLASH_ACCESS_KEY } })
    if (!res.ok) return null
    const data = await res.json()
    return data.results?.[0]?.urls?.regular || null
  } catch { return null }
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
      { role: 'system', content: 'Voce e especialista em criativos de vendas estilo UGC. Crie um roteiro em portugues brasileiro para um avatar de IA falar direto pra camera, em um unico bloco de fala natural e continua (nao separado em cartelas), com gancho, problema, beneficio e CTA emendados como uma fala real de 20 a 30 segundos. Retorne APENAS JSON com: text1 (hook, max 80 chars), text2 (problema, max 100 chars), text3 (beneficio, max 100 chars), text4 (CTA, max 80 chars). Sem markdown.' },
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

function getDimension(format: string): { width: number; height: number; aspect_ratio: string } {
  if (format === '1:1') return { width: 720, height: 720, aspect_ratio: '1:1' }
  if (format === '16:9') return { width: 1280, height: 720, aspect_ratio: '16:9' }
  return { width: 720, height: 1280, aspect_ratio: '9:16' }
}

async function createHeygenVideo(
  fullScript: string,
  format: string,
  backgroundImage: string | null,
  avatarId: string,
  voiceId: string
): Promise<string> {
  const dimension = getDimension(format)

  const videoInput: any = {
    character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' },
    voice: { type: 'text', input_text: fullScript, voice_id: voiceId },
  }

  videoInput.background = backgroundImage
    ? { type: 'image', url: backgroundImage }
    : { type: 'color', value: '#f4f4f7' }

  const res = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': HEYGEN_API_KEY },
    body: JSON.stringify({
      video_inputs: [videoInput],
      dimension: { width: dimension.width, height: dimension.height },
      aspect_ratio: dimension.aspect_ratio,
    }),
  })

  if (!res.ok) throw new Error('HeyGen error ' + res.status + ': ' + await res.text())
  const data = await res.json()
  const videoId = data?.data?.video_id
  if (!videoId) throw new Error('HeyGen sem video_id: ' + JSON.stringify(data))
  return videoId
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
    const avatarIdFromReq: string = reqBody.avatarId || ''
    const voiceIdFromReq: string = reqBody.voiceId || ''
    const customScript: string = (reqBody.customScript || '').trim()

    if (!niche && !customPrompt && !customScript) return NextResponse.json({ error: 'Preencha o nicho, descreva o criativo ou escreva a fala do avatar.' }, { status: 400 })

    const profileData = (await supabase
      .from('profiles')
      .select('credits_videos_used, credits_videos_extra, subscription_status, is_admin, plans(name, credits_videos, is_unlimited)')
      .eq('id', user.id)
      .single()).data

    if (!profileData) return NextResponse.json({ error: 'Perfil nao encontrado' }, { status: 404 })

    const isAdmin = (profileData as any)?.is_admin === true

    // O Gerador de Criativos esta temporariamente bloqueado so para admin.
    // Quando for reaberto pros alunos, remova esse bloco e descomente a checagem de plano/creditos abaixo.
    if (!isAdmin) {
      return NextResponse.json({ error: 'Este recurso esta em atualizacao no momento.', moduleLocked: true }, { status: 403 })
    }

    /*
    if (!isAdmin) {
      const status = profileData.subscription_status
      if (status !== 'active' && status !== 'trialing') {
        return NextResponse.json({ error: 'Assine um plano para usar este recurso.', requiresPlan: true }, { status: 403 })
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
    }
    */

    const searchQuery = niche || customPrompt.slice(0, 50) || 'produto'
    const [script, backgroundImage, avatarId, voiceId] = await Promise.all([
      customScript ? Promise.resolve({ text1: customScript, text2: '', text3: '', text4: '' }) : generateScript(niche, tone, customPrompt),
      getUnsplashImage(searchQuery),
      avatarIdFromReq ? Promise.resolve(avatarIdFromReq) : getDefaultAvatarId(),
      voiceIdFromReq ? Promise.resolve(voiceIdFromReq) : getDefaultVoiceId(),
    ])
    const fullScript = customScript || [script.text1, script.text2, script.text3, script.text4].join(' ')
    const videoId = await createHeygenVideo(fullScript, format, backgroundImage, avatarId, voiceId)

    await supabase.from('generations').insert({
      user_id: user.id,
      type: 'video',
      status: 'pending',
      niche: niche || customPrompt.slice(0, 50) || 'personalizado',
      format: format,
      credits_consumed: 1,
      metadata: { renderId: videoId, tone, customPrompt, script, avatarId, voiceId, provider: 'heygen' },
    })

    return NextResponse.json({ renderId: videoId, script })
  } catch (err: any) {
    console.error('[generate-video]', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
