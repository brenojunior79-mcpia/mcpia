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

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "chapters": [
    {
      "number": 1,
      "title": "Título do Capítulo",
      "content": "Conteúdo completo do capítulo com pelo menos 3 parágrafos bem desenvolvidos..."
    }
  ],
  "introduction": "Introdução do ebook com 2-3 parágrafos...",
  "conclusion": "Conclusão do ebook com 2-3 parágrafos..."
}

Escreva conteúdo real, útil e de qualidade. Cada capítulo deve ter pelo menos 200 palavras.`

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
      }),
    })

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''

    // Parse JSON da resposta
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Erro ao gerar conteúdo' }, { status: 500 })

    const ebook = JSON.parse(jsonMatch[0])

    // Registra no banco
    await supabase.from('generations').insert({
      user_id: user.id,
      type: 'ebook',
      status: 'completed',
      niche,
      credits_consumed: 1,
      metadata: { title, subtitle, author, chapters: numChapters },
    })

    // Incrementa ebooks usados
    const { data: profile } = await supabase.from('profiles').select('credits_ebooks_used').eq('id', user.id).single()
    await supabase.from('profiles').update({ credits_ebooks_used: (profile?.credits_ebooks_used || 0) + 1 }).eq('id', user.id)

    return NextResponse.json({ ebook })
  } catch (err: any) {
    console.error('generate-ebook error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
