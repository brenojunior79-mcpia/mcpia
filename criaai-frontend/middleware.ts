import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Renova o login do aluno de forma silenciosa.
// IMPORTANTE: o login fica guardado em mais de um "pedaço" de cookie. Todos precisam voltar juntos
// para o navegador, senao o login quebra depois da primeira renovacao e a pessoa cai na tela de login.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string, value: string, options?: any }[]) {
          cookiesToSet.forEach(function(c) { request.cookies.set(c.name, c.value) })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(function(c) { response.cookies.set(c.name, c.value, c.options) })
        },
      },
    }
  )

  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
