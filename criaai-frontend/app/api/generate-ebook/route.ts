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

    const [ebookRes, imageRes] = await Promise.all([
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: `Crie um ebook completo e profissional em português:
- Título: ${title}
- Subtítulo: ${subtitle || ''}
- Nicho: ${niche}
- Autor: ${author || 'Autor'}
- Número de capítulos: ${numChapters}
${customDetails ? `- Detalhes: ${customDetails}` : ''}

Retorne APENAS JSON válido (sem markdown):
{"introduction":"...","conclusion":"...","chapters":[{"number":1,"title":"...","introduction":"...","keyPoints":["ponto 1 com 2 frases","ponto 2 com 2 frases","ponto 3 com 2 frases","ponto 4 com 2 frases"],"conclusion":"..."}]}

Escreva conteúdo REAL e detalhado. Cada ponto deve ter pelo menos 2 frases.` }],
          max_tokens: 4000, temperature: 0.7, response_format: { type: 'json_object' },
        }),
      }),
      fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `Professional ebook cover illustration for "${title}" about ${niche}. ${customDetails || ''} Digital art style, vibrant colors, modern design, absolutely no text, no words, no letters. Cinematic lighting, high quality.`,
          n: 1, size: '1024x1024', quality: 'standard',
        }),
      }),
    ])

    const ebookData = await ebookRes.json()
    const imageData = await imageRes.json()
    const ebook = JSON.parse(ebookData.choices?.[0]?.message?.content || '{}')
    const dalleUrl = imageData.data?.[0]?.url || null

    // Converte para base64 AQUI no generate-ebook (antes de retornar)
    let coverBase64: string | null = null
    let coverImageUrl: string | null = dalleUrl
    if (dalleUrl) {
      try {
        const imgRes = await fetch(dalleUrl)
        const arrayBuffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const mime = imgRes.headers.get('content-type') || 'image/png'
        coverBase64 = `data:${mime};base64,${base64}`
      } catch (e) {
        console.error('Erro ao converter imagem:', e)
      }
    }

    await supabase.from('generations').insert({
      user_id: user.id, type: 'ebook', status: 'completed', niche, credits_consumed: 1,
      metadata: { title, subtitle, author, chapters: numChapters },
    })
    const { data: profile } = await supabase.from('profiles').select('credits_ebooks_used').eq('id', user.id).single()
    await supabase.from('profiles').update({ credits_ebooks_used: (profile?.credits_ebooks_used || 0) + 1 }).eq('id', user.id)

    return NextResponse.json({ ebook, coverImageUrl, coverBase64 })
  } catch (err: any) {
    console.error('generate-ebook error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
