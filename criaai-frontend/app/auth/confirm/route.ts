import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (tokenHash && type) {
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(origin + '/auth/reset-password')
      }
      return NextResponse.redirect(origin + '/dashboard')
    }

    console.error('[auth/confirm] erro ao verificar token:', error)
  }

  return NextResponse.redirect(origin + '/login?error=link_invalido_ou_expirado')
}
