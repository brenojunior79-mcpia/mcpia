import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY!

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

    const res = await fetch('https://api.creatomate.com/v2/renders/' + renderId, {
      headers: { 'Authorization': 'Bearer ' + CREATOMATE_API_KEY },
    })

    if (!res.ok) throw new Error('Creatomate status error: ' + res.status)

    const data = await res.json()
    const status: string = data.status || 'planned'
    const videoUrl: string = data.url || ''

    if (status === 'succeeded' && videoUrl) {
      const profile = (await supabase.from('profiles').select('credits_videos_used').eq('id', user.id).single()).data
      const used = profile?.credits_videos_used || 0

      await supabase.from('generations').update({ status: 'completed', output_url: videoUrl }).eq('user_id', user.id).eq('status', 'pending').contains('metadata', { renderId })
      await supabase.from('profiles').update({ credits_videos_used: used + 1 }).eq('id', user.id)

      return NextResponse.json({ status: 'completed', videoUrl })
    }

    if (status === 'failed') {
      await supabase.from('generations').update({ status: 'failed' }).eq('user_id', user.id).eq('status', 'pending').contains('metadata', { renderId })
      return NextResponse.json({ status: 'failed', error: data.error_message || 'Geracao falhou' })
    }

    return NextResponse.json({ status: 'processing' })
  } catch (err: any) {
    console.error('[video-status]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
