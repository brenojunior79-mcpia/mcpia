import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mcpia.site'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
  )

  const user = (await supabase.auth.getUser()).data.user
  if (!user) return NextResponse.redirect(APP_URL + '/login')

  const state = crypto.randomUUID()
  const redirectUri = APP_URL + '/api/facebook/callback'
  const scopes = ['ads_management', 'ads_read', 'business_management', 'pages_show_list', 'public_profile'].join(',')

  // Login do Facebook para Empresas: se existir um Configuration ID, usa a configuracao criada no painel do app
  // (em vez de pedir as permissoes direto no link). Sem o ID, continua no modo antigo.
  const configId = process.env.FACEBOOK_LOGIN_CONFIG_ID
  const oauthUrl = 'https://www.facebook.com/v26.0/dialog/oauth'
    + '?client_id=' + FACEBOOK_APP_ID
    + '&redirect_uri=' + encodeURIComponent(redirectUri)
    + (configId
      ? '&config_id=' + encodeURIComponent(configId) + '&override_default_response_type=true'
      : '&scope=' + encodeURIComponent(scopes))
    + '&state=' + state
    + '&response_type=code'

  const response = NextResponse.redirect(oauthUrl)
  response.cookies.set('fb_oauth_state', state, { httpOnly: true, secure: true, maxAge: 600, path: '/' })
  return response
}
