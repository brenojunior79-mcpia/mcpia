import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const GAMMA_API_URL = 'https://public-api.gamma.app/v1.0/generations'
const GAMMA_EXPORT_URL = 'https://public-api.gamma.app/v1.0/export'
const GAMMA_API_KEY = process.env.GAMMA_API_KEY!

const POLL_INTERVAL_MS = 4_000
const POLL_TIMEOUT_MS = 5 * 60 * 1_000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function startGammaGeneration(prompt: string): Promise<string> {
  const res = await fetch(GAMMA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': GAMMA_API_KEY,
    },
    body: JSON.stringify({
      inputText: prompt,
      textMode: 'generate',
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gamma API error: ${res.status} — ${errText}`)
  }

  const data = await res.json()
  console.log('[gamma] startGeneration response:', JSON.stringify(data))

  const generationId: string = data.generationId ?? data.id
  if (!generationId) throw new Error('Gamma não retornou generationId: ' + JSON.stringify(data))
  return generationId
}

async function pollGammaUntilDone(generationId: string): Promise<{ gammaId: string; gammaUrl: string }> {
  const statusUrl = `${GAMMA_API_URL}/${generationId}`
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)

    const res = await fetch(statusUrl, {
      headers: { 'X-API-KEY': GAMMA_API_KEY },
    })

    if (!res.ok) throw new Error(`Gamma polling error: ${res.status}`)

    const data = await res.json()
    console.log('[gamma] polling response:', JSON.stringify(data))

    const status: string = data.status ?? data.state ?? ''

    if (status === 'completed' || status === 'done' || status === 'success') {
      const gammaId: string = data.gammaId ?? ''
      const gammaUrl: string = data.gammaUrl ?? ''
      if (!gammaId) throw new Error('Gamma não retornou gammaId: ' + JSON.stringify(data))
      return { gammaId, gammaUrl }
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(`Gamma geração falhou: ${JSON.stringify(data)}`)
    }
  }

  throw new Error('Timeout: Gamma demorou mais de 5 minutos.')
}

async function exportGammaAsPdf(gammaId: string): Promise<string> {
  const res = await fetch(GAMMA_EXPORT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': GAMMA_API_KEY,
    },
    body: JSON.stringify({
      docId: gammaId,
      format: 'pdf',
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.log('[gamma] export error response:', errText)
    throw new Error(`Gamma export error: ${res.status} — ${errText}`)
  }

  const data = await res.json()
  console.log('[gamma] export response:', JSON.stringify(data))

  const url: string = data.url ?? data.downloadUrl ?? data.pdfUrl ?? data.exportUrl ?? ''
  if (!url) throw new Error('Gamma export não retornou URL: ' + JSON.stringify(data))
  return url
}

function buildGammaPrompt({ title, topic, targetAudience, tone, chapters, language }: {
  title: string
  topic: string
  targetAudience?: string
  tone?: string
  chapters?: string[]
  language: string
}): string {
  const lines = [
    `Crie um ebook completo com o título: "${title}".`,
    `Tema principal: ${topic}.`,
  ]
  if (targetAudience) lines.push(`Público-alvo: ${targetAudience}.`)
  if (tone) lines.push(`Tom e estilo: ${tone}.`)
  if (chapters && chapters.length > 0) {
    lines.push(`Estrutura de capítulos sugerida:`)
    chapters.forEach((ch, i) => lines.push(`  ${i + 1}. ${ch}`))
  } else {
    lines.push(`Estrutura sugerida: Introdução, 4 a 6 capítulos com conteúdo aprofundado, e Conclusão.`)
  }
  lines.push(
    `O documento deve ser visualmente organizado, com títulos claros, subtítulos e parágrafos bem espaçados.`,
    `Idioma: ${language}.`,
    `Formato: documento vertical (portrait), pronto para exportação em PDF.`
  )
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        credits_ebooks_used,
        credits_ebooks_extra,
        plan_id,
        plans (
          name,
          credits_ebooks
        )
      `)
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    const plan = (profile as any).plans
    const creditLimit: number = (plan?.credits_ebooks ?? 0) + (profile.credits_ebooks_extra ?? 0)
    const creditsUsed: number = profile.credits_ebooks_used ?? 0

    if (creditsUsed >= creditLimit) {
      return NextResponse.json(
        {
          error: 'Limite de créditos atingido.',
          details: `Você usou ${creditsUsed} de ${creditLimit} ebooks disponíveis no plano ${plan?.name ?? ''}.`,
          upgradeRequired: true,
        },
        { status: 402 }
      )
    }

    const body = await req.json()
    const { title, topic, targetAudience, tone, chapters, language = 'pt-BR' } = body

    if (!title || !topic) {
      return NextResponse.json({ error: 'Campos obrigatórios: title, topic.' }, { status: 400 })
    }

    const prompt = buildGammaPrompt({ title, topic, targetAudience, tone, chapters, language })
    const generationId = await startGammaGeneration(prompt)
    const { gammaId, gammaUrl } = await pollGammaUntilDone(generationId)
    const pdfUrl = await exportGammaAsPdf(gammaId)

    await supabase
      .from('profiles')
      .update({ credits_ebooks_used: creditsUsed + 1 })
      .eq('id', user.id)

    try {
      await supabase.from('ebooks').insert({
        user_id: user.id,
        title,
        topic,
        gamma_generation_id: generationId,
        pdf_url: pdfUrl,
        gamma_url: gammaUrl,
        status: 'completed',
      })
    } catch {
      console.warn('[generate-ebook] Erro ao salvar ebook.')
    }

    return NextResponse.json({
      success: true,
      pdfUrl,
      gammaUrl,
      generationId,
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
