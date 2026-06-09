import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
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

    const authResult = await supabase.auth.getUser()
    const user = authResult.data.user

    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    }

    const profileResult = await supabase
      .from('profiles')
      .select('credits_ebooks_used, credits_ebooks_extra, plans(name, credits_ebooks)')
      .eq('id', user.id)
      .single()

    const profile = profileResult.data
    const plan = profile ? (profile as any).plans : null

    const credits = {
      used: profile?.credits_ebooks_used ?? 0,
      limit: (plan?.credits_ebooks ?? 0) + (profile?.credits_ebooks_extra ?? 0),
      planName: plan?.name ?? 'Starter',
    }

    const ebookResult = await supabase
      .from('ebooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      credits,
      ebooks: ebookResult.data ?? [],
    })
  } catch (err: any) {
    console.error('[list-ebooks]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
