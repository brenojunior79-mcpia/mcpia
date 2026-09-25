import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY!

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set() {},
          remove() {},
        },
      }
    )

    const user = (await supabase.auth.getUser()).data.user
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const renderId = req.nextUrl.searchParams.get('renderId')
    if (!renderId) return NextResponse.json({ error: 'renderId obrigatorio' }, { status: 400 })

    const res = await fetch('https://api.heygen.com/v1/video_status.get?video_id=' + renderId, {
      headers: { 'X-Api-Key': HEYGEN_API_KEY },
    })

    if (!res.ok) throw new Error('HeyGen status error: ' + res.status)

    const body = await res.json()
    const data = body.data || {}
    const status: string = data.status || 'processing'
    const videoUrl: string = data.video_url || ''

    if (status === 'completed' && videoUrl) {
      const profile = (await supabase.from('profiles').select('credits_videos_used, is_admin').eq('id', user.id).single()).data
      const used = profile?.credits_videos_used || 0

      await supabase.from('generations').update({ status: 'completed', output_url: videoUrl }).eq('user_id', user.id).eq('status', 'pending').contains('metadata', { renderId })
      if (!(profile as any)?.is_admin) {
        await supabase.from('profiles').update({ credits_videos_used: used + 1 }).eq('id', user.id)
      }

      return NextResponse.json({ status: 'completed', videoUrl })
    }

    if (status === 'failed') {
      await supabase.from('generations').update({ status: 'failed' }).eq('user_id', user.id).eq('status', 'pending').contains('metadata', { renderId })
      const errorMsg = data.error?.message || data.error?.detail || 'Geracao falhou'
      return NextResponse.json({ status: 'failed', error: errorMsg })
    }

    // pending, waiting, processing
    return NextResponse.json({ status: 'processing' })
  } catch (err: any) {
    console.error('[video-status]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
