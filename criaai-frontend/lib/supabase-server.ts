import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string, value: string, options?: any }[]) {
          // Em paginas do servidor nao da para gravar cookies; quem renova o login e o middleware.
          try { cookiesToSet.forEach(function(c) { cookieStore.set(c.name, c.value, c.options) }) } catch (e) {}
        },
      },
    }
  )
}
