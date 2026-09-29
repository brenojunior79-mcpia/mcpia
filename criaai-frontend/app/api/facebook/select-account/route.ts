import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
  )

  const user = (await supabase.auth.getUser()).data.user
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await req.json()
  const accountId: string = body.accountId
  if (!accountId) return NextResponse.json({ error: 'accountId obrigatorio' }, { status: 400 })

  const connection = (await supabase.from('facebook_connections').select('ad_accounts').eq('user_id', user.id).maybeSingle()).data
  if (!connection) return NextResponse.json({ error: 'Nenhuma conexao encontrada' }, { status: 404 })

  const accounts: any[] = connection.ad_accounts || []
  const chosen = accounts.find(function(a) { return a.id === accountId })
  if (!chosen) return NextResponse.json({ error: 'Conta nao encontrada na lista' }, { status: 404 })

  const { error } = await supabase
    .from('facebook_connections')
    .update({ ad_account_id: chosen.id, ad_account_name: chosen.name, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, adAccountId: chosen.id, adAccountName: chosen.name })
}
