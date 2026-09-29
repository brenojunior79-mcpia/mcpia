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

  const oauthUrl = 'https://www.facebook.com/v26.0/dialog/oauth'
    + '?client_id=' + FACEBOOK_APP_ID
    + '&redirect_uri=' + encodeURIComponent(redirectUri)
    + '&scope=' + encodeURIComponent(scopes)
    + '&state=' + state
    + '&response_type=code'

  const response = NextResponse.redirect(oauthUrl)
  response.cookies.set('fb_oauth_state', state, { httpOnly: true, secure: true, maxAge: 600, path: '/' })
  return response
}
