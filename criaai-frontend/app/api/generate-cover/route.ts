import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { title, niche, author } = await req.json()

    if (!title || !niche) {
      return NextResponse.json({ error: 'Informe o titulo e o tema do ebook.' }, { status: 400 })
    }

    const prompt = `A FLAT, completely two-dimensional book cover design (like a print-ready digital file, viewed straight-on with zero perspective), for a book titled "${title}", about the theme: "${niche}". Choose an illustration style, color palette and composition that best fits this specific theme. The artwork MUST fill the entire square canvas edge-to-edge, with no borders, no white margins, no background padding around it, and no depiction of a physical book, spine, pages or 3D object of any kind — it is only the flat cover artwork itself, like a poster. The title "${title}" must be large, bold and clearly readable, positioned within the cover.${author ? ` Include the author name "${author}" in smaller text near the bottom.` : ''} High quality, professional publishing illustration. No people, no faces, no watermarks, no mockup, no photo of a device or book, no extra text besides the title${author ? ' and author name' : ''}.`

    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1536',
      quality: 'medium',
    })

    const b64 = response.data?.[0]?.b64_json
    const directUrl = response.data?.[0]?.url
    const imageUrl = directUrl || (b64 ? `data:image/png;base64,${b64}` : null)
    if (!imageUrl) throw new Error('Imagem não gerada')

    return NextResponse.json({ imageUrl })
  } catch (err: any) {
    console.error('generate-cover error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
