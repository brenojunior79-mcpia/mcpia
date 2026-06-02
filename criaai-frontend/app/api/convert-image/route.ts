import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { imageUrl } = await req.json()
    if (!imageUrl) return NextResponse.json({ base64: null })

    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return NextResponse.json({ base64: null })

    const arrayBuffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mime = imgRes.headers.get('content-type') || 'image/png'

    return NextResponse.json({ base64: `data:${mime};base64,${base64}` })
  } catch (e) {
    return NextResponse.json({ base64: null })
  }
}
