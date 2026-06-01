import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { title, subtitle, niche, color, template } = await req.json()

    const styleMap: Record<string, string> = {
      moderno: 'dark background, neon green accents, futuristic tech style, glowing effects',
      minimalista: 'white background, clean minimal design, elegant typography, lots of white space',
      bold: 'vibrant colorful background, bold typography, high contrast, energetic design',
    }

    const prompt = `Professional 3D ebook cover design for a book titled "${title}" about "${niche}". ${subtitle ? `Subtitle: "${subtitle}".` : ''} Style: ${styleMap[template] || styleMap.moderno}. The cover should look like a real physical book with 3D perspective, realistic shadows and depth. Show the book at a slight angle. Main color: ${color}. Professional publishing quality. No people, no faces. Text on cover should be clearly readable.`

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    })

    const imageUrl = response.data[0]?.url
    if (!imageUrl) throw new Error('Imagem não gerada')

    return NextResponse.json({ imageUrl })
  } catch (err: any) {
    console.error('generate-cover error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
