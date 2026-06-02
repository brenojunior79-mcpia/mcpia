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

    // Gera conteúdo e imagem em paralelo
    const [ebookRes, imageRes] = await Promise.all([
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `Crie um ebook completo e profissional em português com as seguintes informações:
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
          }],
          max_tokens: 4000,
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      }),
      fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `Professional ebook cover illustration for a book titled "${title}" about ${niche}. ${customDetails ? customDetails + '.' : ''} Digital art style, vibrant colors, modern design, no text, no words, no letters anywhere. Cinematic lighting, high quality illustration.`,
          n: 1,
          size: '1024x1792',
          quality: 'standard',
        }),
      }),
    ])

    const ebookData = await ebookRes.json()
    const imageData = await imageRes.json()

    const raw = ebookData.choices?.[0]?.message?.content || '{}'
    const ebook = JSON.parse(raw)
    const dalleUrl = imageData.data?.[0]?.url || null

    // Salva imagem no Supabase Storage para URL permanente
    let coverImageUrl = null
    if (dalleUrl) {
      try {
        const imgRes = await fetch(dalleUrl)
        const arrayBuffer = await imgRes.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const fileName = `covers/${user.id}-${Date.now()}.png`
        const { data: uploadData } = await supabase.storage
          .from('products')
          .upload(fileName, buffer, { contentType: 'image/png', upsert: true })
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName)
          coverImageUrl = publicUrl
        }
      } catch (e) {
        console.error('Erro ao salvar imagem:', e)
        coverImageUrl = dalleUrl // fallback para URL temporária
      }
    }

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

    return NextResponse.json({ ebook, coverImageUrl })
  } catch (err: any) {
    console.error('generate-ebook error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
