import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { niche, title, subtitle, author, chapters, color, customDetails } = await req.json()
    if (!niche || !title) return NextResponse.json({ error: 'Nicho e título são obrigatórios' }, { status: 400 })

    const numChapters = Math.min(Math.max(parseInt(chapters) || 7, 3), 15)

    const prompt = `Crie um ebook completo e profissional em português com as seguintes informações:
- Título: ${title}
- Subtítulo: ${subtitle || ''}
- Nicho: ${niche}
- Autor: ${author || 'Autor'}
- Número de capítulos: ${numChapters}
${customDetails ? `- Detalhes adicionais: ${customDetails}` : ''}

Retorne APENAS um JSON válido com esta estrutura exata (sem markdown, sem backticks):
{
  "introduction": "Introdução do ebook com 2-3 parágrafos completos e detalhados",
  "conclusion": "Conclusão do ebook com 2-3 parágrafos completos",
  "chapters": [
    {
      "number": 1,
      "title": "Título do Capítulo",
      "introduction": "Parágrafo introdutório do capítulo com 3-4 frases detalhadas sobre o tema",
      "keyPoints": [
        "Ponto importante 1 com explicação detalhada de pelo menos 2 frases",
        "Ponto importante 2 com explicação detalhada de pelo menos 2 frases",
        "Ponto importante 3 com explicação detalhada de pelo menos 2 frases",
        "Ponto importante 4 com explicação detalhada de pelo menos 2 frases"
      ],
      "conclusion": "Parágrafo de conclusão do capítulo com dica prática e motivacional"
    }
  ]
}

Escreva conteúdo REAL, útil, detalhado e de alta qualidade. Cada ponto deve ter pelo menos 2 frases completas.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    })

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || '{}'
    const ebook = JSON.parse(raw)

    await supabase.from('generations').insert({
      user_id: user.id,
      type: 'ebook',
      status: 'completed',
      niche,
      credits_consumed: 1,
      metadata: { title, subtitle, author, chapters: numChapters },
    })

    const { data: profile } = await supabase.from('profiles').select('credits_ebooks_used').eq('id', user.id).single()
    await supabase.from('profiles').update({ credits_ebooks_used: (profile?.credits_ebooks_used || 0) + 1 }).eq('id', user.id)

    return NextResponse.json({ ebook })
  } catch (err: any) {
    console.error('generate-ebook error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
