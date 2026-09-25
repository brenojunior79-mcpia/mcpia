import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY!

// Cache simples em memoria pra nao bater na API da HeyGen toda hora
let cachedVoices: any[] | null = null
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
    if (cachedVoices && (now - cachedAt) < CACHE_TTL_MS) {
      return NextResponse.json({ voices: cachedVoices })
    }

    const res = await fetch('https://api.heygen.com/v2/voices', {
      headers: { 'X-Api-Key': HEYGEN_API_KEY },
    })

    if (!res.ok) throw new Error('HeyGen voices error: ' + res.status)

    const data = await res.json()
    const rawVoices = data?.data?.voices || []

    // Prioriza vozes em portugues, mas mantem as outras como fallback
    const isPortuguese = function(v: any) {
      const lang = (v.language || '').toLowerCase()
      return lang.includes('portuguese') || lang.includes('português')
    }

    let filtered = rawVoices.filter(isPortuguese)
    if (filtered.length === 0) filtered = rawVoices.slice(0, 30)

    const voices = filtered.slice(0, 30).map(function(v: any) {
      return {
        voiceId: v.voice_id,
        name: v.name || v.display_name || 'Voz',
        gender: v.gender || '',
        language: v.language || '',
        previewAudio: v.preview_audio || null,
      }
    })

    cachedVoices = voices
    cachedAt = now

    return NextResponse.json({ voices })
  } catch (err: any) {
    console.error('[heygen-voices]', err)
    return NextResponse.json({ error: err.message || 'Erro ao buscar vozes', voices: [] }, { status: 500 })
  }
}
