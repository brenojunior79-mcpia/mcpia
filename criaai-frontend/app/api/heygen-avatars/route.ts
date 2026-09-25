import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY!

// Cache simples em memoria pra nao bater na API da HeyGen toda hora
let cachedAvatars: any[] | null = null
let cachedAt = 0
const CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutos

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
    )

    const user = (await supabase.auth.getUser()).data.user
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const now = Date.now()
    if (cachedAvatars && (now - cachedAt) < CACHE_TTL_MS) {
      return NextResponse.json({ avatars: cachedAvatars })
    }

    const res = await fetch('https://api.heygen.com/v2/avatars', {
      headers: { 'X-Api-Key': HEYGEN_API_KEY },
    })

    if (!res.ok) throw new Error('HeyGen avatars error: ' + res.status)

    const data = await res.json()
    const rawAvatars = data?.data?.avatars || []

    const avatars = rawAvatars
      .filter(function(a: any) { return a.preview_image_url })
      .slice(0, 24)
      .map(function(a: any) {
        return {
          avatarId: a.avatar_id,
          name: a.avatar_name || 'Avatar',
          gender: a.gender || '',
          previewImage: a.preview_image_url,
        }
      })

    cachedAvatars = avatars
    cachedAt = now

    return NextResponse.json({ avatars })
  } catch (err: any) {
    console.error('[heygen-avatars]', err)
    return NextResponse.json({ error: err.message || 'Erro ao buscar avatares', avatars: [] }, { status: 500 })
  }
}
