// app/api/generate-ebook/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticar
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    // 2. Consumir crédito
    const { data: canConsume } = await supabaseAdmin
      .rpc('consume_credit', { p_user_id: user.id, p_type: 'ebook' })

    if (!canConsume) {
      return NextResponse.json({ error: 'Créditos insuficientes', code: 'NO_CREDITS' }, { status: 402 })
    }

    // 3. Dados do ebook
    const { niche, title, subtitle, chapters, audience, tone, color, author } = await req.json()

    // 4. Criar registro
    const { data: generation } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: user.id,
        type: 'ebook',
        status: 'processing',
        niche,
        title,
        metadata: { subtitle, chapters, audience, tone, color, author },
      })
      .select()
      .single()

    // 5. Gerar estrutura com GPT-4o
    const structurePrompt = `Você é um especialista em criação de ebooks de alta conversão para o mercado brasileiro.
Crie um ebook completo sobre "${niche}" com o título "${title}" e subtítulo "${subtitle}".
Público-alvo: ${audience?.join(', ') || 'iniciantes'}.
Tom: ${tone || 'profissional e motivador'}.
Número de capítulos: ${chapters || 7}.

Retorne SOMENTE um JSON válido neste formato exato, sem markdown:
{
  "chapters": [
    {
      "number": 1,
      "title": "Título do capítulo",
      "introduction": "Parágrafo introdutório de 3-4 linhas",
      "keyPoints": ["ponto 1", "ponto 2", "ponto 3", "ponto 4"],
      "conclusion": "Parágrafo de conclusão de 2-3 linhas"
    }
  ],
  "callToAction": "Texto de CTA poderoso no final do ebook",
  "description": "Descrição de 1 linha do ebook para capa"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: structurePrompt }],
      temperature: 0.7,
      max_tokens: 3000,
    })

    const rawContent = completion.choices[0].message.content || '{}'
    const ebookContent = JSON.parse(rawContent.replace(/```json|```/g, '').trim())

    // 6. Gerar copy/legenda para Facebook Ads
    const copyPrompt = `Crie 3 versões de copy para Facebook Ads para promover o ebook "${title}" sobre "${niche}".
Cada versão deve ter: headline (max 40 chars), texto principal (max 125 chars) e CTA.
Retorne SOMENTE JSON válido:
{"copies": [{"headline": "...", "text": "...", "cta": "..."}]}`

    const copyCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: copyPrompt }],
      temperature: 0.8,
      max_tokens: 600,
    })

    const rawCopy = copyCompletion.choices[0].message.content || '{}'
    const adCopies = JSON.parse(rawCopy.replace(/```json|```/g, '').trim())

    const totalCost = (completion.usage?.total_tokens || 0) * 0.000005

    // 7. Atualizar geração
    await supabaseAdmin
      .from('generations')
      .update({
        status: 'completed',
        api_cost: totalCost,
        metadata: {
          subtitle, chapters, audience, tone, color, author,
          ebookContent,
          adCopies: adCopies.copies,
        },
      })
      .eq('id', generation.id)

    return NextResponse.json({
      success: true,
      generationId: generation.id,
      ebook: {
        title,
        subtitle,
        author,
        color,
        chapters: ebookContent.chapters,
        callToAction: ebookContent.callToAction,
      },
      adCopies: adCopies.copies,
    })

  } catch (err: any) {
    console.error('generate-ebook error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
