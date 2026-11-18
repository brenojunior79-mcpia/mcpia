import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'

// Links temporarios (1 hora) para ouvir os audios que o proprio aluno mandou no Suporte (em qualquer aparelho)
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const corpo = await req.json()
    const paths: string[] = (Array.isArray(corpo?.paths) ? corpo.paths : []).map(String)
      .filter(function(p: string) { return p.indexOf(user.id + '/') === 0 && p.indexOf('..') < 0 }).slice(0, 100)
    if (!paths.length) return NextResponse.json({ urls: {} })
    const admin: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const r = await admin.storage.from('chat-audios').createSignedUrls(paths, 3600)
    const urls: Record<string, string> = {}
    for (const it of (r.data || []) as any[]) if (it.path && it.signedUrl) urls[it.path] = it.signedUrl
    return NextResponse.json({ urls })
  } catch (e) {
    return NextResponse.json({ urls: {} })
  }
}
