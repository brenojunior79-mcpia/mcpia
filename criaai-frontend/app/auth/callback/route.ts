import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  let failed = false
  if (code) {
    const supabase = createClient()
    const result = await supabase.auth.exchangeCodeForSession(code)
    if (result.error) failed = true
  }

  if (type === 'recovery') {
    // Se o link nao funcionou (outro navegador/aparelho ou expirado), a pagina avisa e ajuda a pedir outro
    return NextResponse.redirect(origin + '/auth/reset-password' + (failed || !code ? '?erro=link' : ''))
  }

  return NextResponse.redirect(origin + '/dashboard')
}
