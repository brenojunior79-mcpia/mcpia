import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// No Next 15 os cookies sao lidos de forma assincrona; o cliente do Supabase aceita isso por dentro.
export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return (await cookieStore).getAll()
        },
        async setAll(cookiesToSet: { name: string, value: string, options?: any }[]) {
          // Em paginas do servidor nao da para gravar cookies; quem renova o login e o middleware.
          const store = await cookieStore
          try { cookiesToSet.forEach(function(c) { store.set(c.name, c.value, c.options) }) } catch (e) {}
        },
      },
    }
  )
}
