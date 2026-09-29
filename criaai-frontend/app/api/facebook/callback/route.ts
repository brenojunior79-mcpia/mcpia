import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mcpia.site'
const GRAPH_VERSION = 'v21.0'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
  )

  const user = (await supabase.auth.getUser()).data.user
  if (!user) return NextResponse.redirect(APP_URL + '/login')

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const errorParam = req.nextUrl.searchParams.get('error')
  const expectedState = cookieStore.get('fb_oauth_state')?.value

  if (errorParam) {
    return NextResponse.redirect(APP_URL + '/dashboard/anuncios?error=' + encodeURIComponent(errorParam))
  }

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(APP_URL + '/dashboard/anuncios?error=estado_invalido')
  }

  try {
    const redirectUri = APP_URL + '/api/facebook/callback'

    // 1. Troca o codigo pelo token de curta duracao
    const tokenRes = await fetch(
      'https://graph.facebook.com/' + GRAPH_VERSION + '/oauth/access_token'
      + '?client_id=' + FACEBOOK_APP_ID
      + '&redirect_uri=' + encodeURIComponent(redirectUri)
      + '&client_secret=' + FACEBOOK_APP_SECRET
      + '&code=' + code
    )
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('[facebook-callback] erro ao trocar codigo:', tokenData)
      return NextResponse.redirect(APP_URL + '/dashboard/anuncios?error=token_invalido')
    }

    // 2. Troca pelo token de longa duracao (dura ~60 dias)
    const longLivedRes = await fetch(
      'https://graph.facebook.com/' + GRAPH_VERSION + '/oauth/access_token'
      + '?grant_type=fb_exchange_token'
      + '&client_id=' + FACEBOOK_APP_ID
      + '&client_secret=' + FACEBOOK_APP_SECRET
      + '&fb_exchange_token=' + tokenData.access_token
    )
    const longLivedData = await longLivedRes.json()
    const accessToken = longLivedData.access_token || tokenData.access_token
    const expiresIn = longLivedData.expires_in || tokenData.expires_in || 5184000

    // 3. Busca dados basicos do usuario
    const meRes = await fetch('https://graph.facebook.com/me?fields=id,name&access_token=' + accessToken)
    const meData = await meRes.json()

    // 4. Busca a primeira conta de anuncios disponivel
    const adAccountsRes = await fetch('https://graph.facebook.com/me/adaccounts?fields=id,name,account_status&access_token=' + accessToken)
    const adAccountsData = await adAccountsRes.json()
    const firstAccount = adAccountsData.data?.[0]

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    const { error: dbError } = await supabase.from('facebook_connections').upsert({
      user_id: user.id,
      fb_user_id: meData.id,
      fb_user_name: meData.name,
      access_token: accessToken,
      token_expires_at: expiresAt,
      ad_account_id: firstAccount?.id || null,
      ad_account_name: firstAccount?.name || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (dbError) {
      console.error('[facebook-callback] erro ao salvar conexao:', dbError)
      return NextResponse.redirect(APP_URL + '/dashboard/anuncios?error=erro_ao_salvar')
    }

    const response = NextResponse.redirect(APP_URL + '/dashboard/anuncios?connected=true')
    response.cookies.delete('fb_oauth_state')
    return response
  } catch (err: any) {
    console.error('[facebook-callback] erro:', err)
    return NextResponse.redirect(APP_URL + '/dashboard/anuncios?error=erro_interno')
  }
}
