import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
  )

  const user = (await supabase.auth.getUser()).data.user
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const connection = (await supabase
    .from('facebook_connections')
    .select('fb_user_name, ad_account_id, ad_account_name, token_expires_at, created_at')
    .eq('user_id', user.id)
    .maybeSingle()).data

  if (!connection) return NextResponse.json({ connected: false })

  return NextResponse.json({
    connected: true,
    fbUserName: connection.fb_user_name,
    adAccountId: connection.ad_account_id,
    adAccountName: connection.ad_account_name,
    expiresAt: connection.token_expires_at,
  })
}

export async function DELETE(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
  )

  const user = (await supabase.auth.getUser()).data.user
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  await supabase.from('facebook_connections').delete().eq('user_id', user.id)
  return NextResponse.json({ success: true })
}
