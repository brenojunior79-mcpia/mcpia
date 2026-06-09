import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const GAMMA_API_URL = 'https://public-api.gamma.app/v1.0/generations'
const GAMMA_API_KEY = process.env.GAMMA_API_KEY!

const POLL_INTERVAL_MS = 5000
const POLL_TIMEOUT_MS = 300000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getGammaLanguage(language: string): string {
  const map: Record<string, string> = {
    'pt-BR': 'pt-br',
    'en-US': 'en',
    'es-ES': 'es',
  }
  return map[language] ?? 'pt-br'
}

async function startGammaGeneration(
  prompt: string,
  title: string,
  targetAudience: string,
  tone: string,
  language: string,
  themeId?: string
): Promise<string> {
  const body: any = {
    inputText: prompt,
    textMode: 'generate',
    format: 'document',
    exportAs: 'pdf',
    title: title,
    textOptions: {
      language: getGammaLanguage(language),
      tone: tone || 'professional',
      audience: targetAudience || 'general audience',
    },
  }

  if (themeId) body.themeId = themeId

  const res = await fetch(GAMMA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': GAMMA_API_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error('Gamma API error: ' + res.status + ' ' + errText)
  }

  const data = await res.json()
  const generationId: string = data.generationId
  if (!generationId) throw new Error('Gamma nao retornou generationId: ' + JSON.stringify(data))
  return generationId
}

async function pollGammaUntilDone(generationId: string): Promise<{ exportUrl: string; gammaUrl: string }> {
  const statusUrl = GAMMA_API_URL + '/' + generationId
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)

    const res = await fetch(statusUrl, {
      headers: { 'X-API-KEY': GAMMA_API_KEY },
    })

    if (!res.ok) throw new Error('Gamma polling error: ' + res.status)

    const data = await res.json()
    const status: string = data.status ?? ''

    if (status === 'completed') {
      const exportUrl: string = data.exportUrl ?? ''
      const gammaUrl: string = data.gammaUrl ?? ''
      if (!exportUrl) throw new Error('Gamma completou sem exportUrl: ' + JSON.stringify(data))
      return { exportUrl, gammaUrl }
    }

    if (status === 'failed' || status === 'error') {
      throw new Error('Gamma geracao falhou: ' + JSON.stringify(data))
    }
  }

  throw new Error('Timeout: Gamma demorou mais de 5 minutos.')
}

function buildGammaPrompt(title: string, topic: string, details?: string, chapters?: string[]): string {
  const lines = [
    'Ebook: "' + title + '"',
    'Tema: ' + topic + '.',
  ]

  if (details) {
    lines.push('Detalhes adicionais: ' + details)
  }

  if (chapters && chapters.length > 0) {
    lines.push('Capitulos:')
    chapters.forEach(function(ch, i) { lines.push((i + 1) + '. ' + ch) })
  } else {
    lines.push('Estrutura: Introducao, 4 a 6 capitulos aprofundados, Conclusao.')
  }

  return lines.join('\n')
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

    const authResult = await supabase.auth.getUser()
    const user = authResult.data.user

    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    }

    const profileResult = await supabase
      .from('profiles')
      .select('credits_ebooks_used, credits_ebooks_extra, plan_id, plans(name, credits_ebooks)')
      .eq('id', user.id)
      .single()

    const profile = profileResult.data

    if (!profile) {
      return NextResponse.json({ error: 'Perfil nao encontrado.' }, { status: 404 })
    }

    const plan = (profile as any).plans
    const creditLimit: number = (plan?.credits_ebooks ?? 0) + (profile.credits_ebooks_extra ?? 0)
    const creditsUsed: number = profile.credits_ebooks_used ?? 0

    if (creditsUsed >= creditLimit) {
      return NextResponse.json(
        {
          error: 'Limite de creditos atingido.',
          details: 'Voce usou ' + creditsUsed + ' de ' + creditLimit + ' ebooks disponiveis no plano ' + (plan?.name ?? '') + '.',
          upgradeRequired: true,
        },
        { status: 402 }
      )
    }

    const body = await req.json()
    const title: string = body.title ?? ''
    const topic: string = body.topic ?? ''
    const details: string = body.details ?? ''
    const targetAudience: string = body.targetAudience ?? ''
    const tone: string = body.tone ?? ''
    const chapters: string[] = body.chapters ?? []
    const language: string = body.language ?? 'pt-BR'
    const themeId: string = body.themeId ?? ''

    if (!title || !topic) {
      return NextResponse.json({ error: 'Campos obrigatorios: title, topic.' }, { status: 400 })
    }

    const prompt = buildGammaPrompt(title, topic, details, chapters)
    const generationId = await startGammaGeneration(prompt, title, targetAudience, tone, language, themeId || undefined)
    const result = await pollGammaUntilDone(generationId)
    const exportUrl = result.exportUrl
    const gammaUrl = result.gammaUrl

    await supabase
      .from('profiles')
      .update({ credits_ebooks_used: creditsUsed + 1 })
      .eq('id', user.id)

    await supabase.from('ebooks').insert({
      user_id: user.id,
      title: title,
      topic: topic,
      gamma_generation_id: generationId,
      pdf_url: exportUrl,
      status: 'completed',
    })

    return NextResponse.json({
      success: true,
      pdfUrl: exportUrl,
      gammaUrl: gammaUrl,
      generationId: generationId,
      creditsRemaining: creditLimit - (creditsUsed + 1),
    })
  } catch (err: any) {
    console.error('[generate-ebook]', err)
    return NextResponse.json(
      { error: err.message ?? 'Erro interno ao gerar ebook.' },
      { status: 500 }
    )
  }
}
