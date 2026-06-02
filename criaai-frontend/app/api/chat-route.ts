import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { messages } = await req.json()

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em criação de vídeos de marketing digital e anúncios para redes sociais. 
Ajude o usuário a criar descrições detalhadas e criativas para vídeos de produtos no estilo UGC (User Generated Content).
Quando o usuário descrever o produto ou o que quer no vídeo, gere uma descrição de cena detalhada em português que possa ser usada como prompt para gerar o vídeo com IA.
A descrição deve ser clara, visual e específica, descrevendo: quem aparece no vídeo, o que está fazendo, onde está, qual é a emoção/tom.
Mantenha as respostas curtas e práticas. Sempre ofereça uma descrição pronta para copiar.`
          },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.8,
      }),
    })

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || 'Não consegui gerar uma resposta. Tente novamente.'

    return NextResponse.json({ reply })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
