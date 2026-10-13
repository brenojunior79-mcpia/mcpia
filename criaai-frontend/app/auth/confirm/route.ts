import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  // Troca de senha: o codigo so e usado quando o aluno salva a nova senha (na propria pagina).
  // Assim, programas que "visitam" o link do e-mail nao gastam o codigo e a sessao nasce no proprio navegador do aluno.
  if (tokenHash && type === 'recovery') {
    return NextResponse.redirect(origin + '/auth/reset-password?token_hash=' + encodeURIComponent(tokenHash) + '&type=recovery')
  }

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
