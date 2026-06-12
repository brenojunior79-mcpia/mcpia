import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY!
const CREATOMATE_TEMPLATE_ID = process.env.CREATOMATE_TEMPLATE_ID!
const AGENCY_VIDEO_LIMIT = 100

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

async function generateScript(niche: string, tone: string, customPrompt: string) {
  const toneMap: Record<string, string> = {
    lifestyle: 'inspirador, caloroso e acessivel',
    urgencia: 'urgente, direto e com senso de escassez',
    luxo: 'sofisticado, elegante e premium',
    humor: 'divertido, descontraido e com bom humor',
  }
  const toneDesc = toneMap[tone] || toneMap['lifestyle']
  const userInstructions = customPrompt && customPrompt.trim().length > 10
    ? 'Instrucoes adicionais: ' + customPrompt
    : ''

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Voce e especialista em criativos de vendas para redes sociais. Crie roteiros curtos de alta conversao em portugues brasileiro. Retorne APENAS JSON valido com 4 campos: text1 (hook, max 80 chars), text2 (problema/desejo, max 100 chars), text3 (beneficio principal, max 100 chars), text4 (CTA urgente, max 80 chars). Sem markdown, sem explicacoes.',
      },
      {
        role: 'user',
        content: 'Produto/niche: ' + niche + '. Tom: ' + toneDesc + '. ' + userInstructions,
      },
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
      text4: String(parsed.text4 || 'Clique agora e saiba mais!'),
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

async function createRender(script: { text1: string; text2: string; text3: string; text4: string }): Promise<string> {
  const res = await fetch('https://api.creatomate.com/v2/renders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + CREATOMATE_API_KEY,
    },
    body: JSON.stringify({
      template_id: CREATOMATE_TEMPLATE_ID,
      modifications: {
        'Text-1.text': script.text1,
        'Text-2.text': script.text2,
        'Text-3.text': script.text3,
        'Text-4.text': script.text4,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error('Creatomate error ' + res.status + ': ' + err)
  }

  const data = await res.json()
  const renders = Array.isArray(data) ? data : [data]
  const renderId = renders[0]?.id
  if (!renderId) throw new Error('Creatomate sem render ID: ' + JSON.stringify(data))
  return renderId
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set() {},
          remove() {},
        },
      }
    )

    const user = (await supabase.auth.getUser()).data.user
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const body = await req.json()
    const niche: string = body.niche || ''
    const tone: string = body.tone || 'lifestyle'
    const format: string = body.format || '9:16'
    const customPrompt: string = body.customPrompt || ''

    if (!niche && !customPrompt) {
      return NextResponse.json({ error: 'Preencha o nicho ou descreva o criativo.' }, { status: 400 })
    }

    const profile = (await supabase.from('profiles').select('credits_videos_used, credits_videos_extra, plans(name, credits_videos, is_unlimited)').eq('id', user.id).single()).data
    if (!profile) return NextResponse.json({ error: 'Perfil nao encontrado' }, { status: 404 })

    const plan = (profile as any)?.plans
    const isUnlimited = plan?.is_unlimited
    const isAgency = plan?.name === 'Agency'
    const used = profile.credits_videos_used || 0
    const extra = profile.credits_videos_extra || 0
    const limit = isUnlimited ? 999999 : ((plan?.credits_videos || 0) + extra)

    if (isAgency || isUnlimited) {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const { count } = await supabase.from('generations').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('type', 'video').gte('created_at', startOfMonth.toISOString())
      if ((count || 0) >= AGENCY_VIDEO_LIMIT) return NextResponse.json({ error: 'Limite mensal atingido.', limitReached: true }, { status: 429 })
    } else {
      if (used >= limit) return NextResponse.json({ error: 'Sem creditos de video disponiveis.', limitReached: true }, { status: 403 })
    }

    const script = await generateScript(niche, tone, customPrompt)
    const renderId = await createRender(script)

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
