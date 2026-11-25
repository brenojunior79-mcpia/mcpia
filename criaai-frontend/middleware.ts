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

  // getSession le o login do cookie e so vai ate o Supabase quando ele esta vencendo (para renovar).
  // A conferencia de verdade continua nas telas do painel (dashboard/layout.tsx) e nas rotas de API.
  // IMPORTANTE: sempre espera a renovacao terminar e devolve os cookies novos. Antes havia um limite de 3 s:
  // quando o Supabase demorava, a renovacao terminava mesmo assim (o login antigo era trocado), mas o login
  // novo nao chegava ao navegador. Na pagina seguinte o navegador usava o login antigo, o Supabase achava que
  // era invasao ("refresh_token_already_used") e desconectava o aluno.
  // Se a renovacao FALHAR (ex.: 429, rede), o login NAO e apagado: a pagina segue com os cookies que o navegador ja tinha.
  let resultado: any = null
  try {
    resultado = await supabase.auth.getSession()
  } catch (e) {
    return NextResponse.next()
  }
  if (!resultado || resultado.error) return NextResponse.next()
  return response
}

// Arquivos fixos (fontes, imagens, musicas, service worker) nao precisam renovar o login: ficam fora do middleware, o que os deixa mais rapidos.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/|sw.js|manifest.json|.well-known/|api/hubla/webhook|api/cakto/webhook|api/whatsapp/webhook|api/mp/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|woff2|ttf|css|apk)$).*)'],
}
