// criaai-frontend/app/api/generate-ebook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const GAMMA_API_URL = 'https://public-api.gamma.app/v1.0/generations'
const GAMMA_API_KEY = process.env.GAMMA_API_KEY!

const POLL_INTERVAL_MS = 4_000
const POLL_TIMEOUT_MS = 5 * 60 * 1_000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function startGammaGeneration(prompt: string): Promise<string> {
  const body = {
    input: prompt,
    options: {
      format: 'document',
      orientation: 'portrait',
    },
  }

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
    throw new Error(`Gamma API error ao iniciar geração: ${res.status} — ${errText}`)
  }

  const data = await res.json()
  const generationId: string = data.generationId ?? data.id
  if (!generationId) {
    throw new Error('Gamma não retornou generationId. Resposta: ' + JSON.stringify(data))
  }

  return generationId
}

async function pollGammaUntilDone(generationId: string): Promise<string> {
  const statusUrl = `${GAMMA_API_URL}/${generationId}`
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)

    const res = await fetch(statusUrl, {
      headers: { 'X-API-KEY': GAMMA_API_KEY },
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Gamma polling error: ${res.status} — ${errText}`)
    }

    const data = await res.json()
    const status: string = data.status ?? data.state ?? ''

    if (status === 'completed' || status === 'done' || status === 'success') {
      const pdfUrl = await exportGammaAsPdf(generationId)
      return pdfUrl
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(`Gamma geração falhou: ${JSON.stringify(data)}`)
    }
  }

  throw new Error('Timeout: Gamma demorou mais de 5 minutos para gerar o ebook.')
}

async function exportGammaAsPdf(generationId: string): Promise<string> {
  const exportUrl = `${GAMMA_API_URL}/${generationId}/export`

  const res = await fetch(exportUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': GAMMA_API_KEY,
    },
    body: JSON.stringify({ format: 'pdf' }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gamma export error: ${res.status} — ${errText}`)
  }

  const data = await res.json()
  const url: string = data.url ?? data.downloadUrl ?? data.pdfUrl

  if (!url) {
    throw new Error('Gamma export não retornou URL. Resposta: ' + JSON.stringify(data))
  }

  return url
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

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
      return NextResponse.json(
        { error: 'Campos obrigatórios: title, topic.' },
        { status: 400 }
      )
    }

    const prompt = buildGammaPrompt({ title, topic, targetAudience, tone, chapters, language })
    const generationId = await startGammaGeneration(prompt)
    const pdfUrl = await pollGammaUntilDone(generationId)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits_ebooks_used: creditsUsed + 1 })
      .eq('id', user.id)

    if (updateError) {
      console.error('[generate-ebook] Erro ao incrementar créditos:', updateError)
    }

    await supabase.from('ebooks').insert({
      user_id: user.id,
      title,
      topic,
      gamma_generation_id: generationId,
      pdf_url: pdfUrl,
      status: 'completed',
    }).throwOnError().catch(() => {
      console.warn('[generate-ebook] Tabela ebooks não encontrada, pulando insert.')
    })

    return NextResponse.json({
      success: true,
      pdfUrl,
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

function buildGammaPrompt({
  title, topic, targetAudience, tone, chapters, language,
}: {
  title: string
  topic: string
  targetAudience?: string
  tone?: string
  chapters?: string[]
  language: string
}): string {
  const lines: string[] = [
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
    `O documento deve ser visualmente organizado, com títulos claros, subtítulos, listas e parágrafos bem espaçados.`,
    `Idioma: ${language}.`,
    `Formato: documento vertical (portrait), pronto para exportação em PDF.`
  )

  return lines.join('\n')
}
