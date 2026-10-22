import { createClient } from '@/lib/supabase-server'

// Enquanto o novo Gerador de Criativos esta em construcao, so o admin usa.
// Quando for liberar pros alunos, troque para true (e coloque limites de uso).
export const LIBERADO_ALUNOS = false

export async function usuarioCriativo(): Promise<{ id: string; admin: boolean } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const p = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  const admin = !!(p.data as any)?.is_admin
  if (!admin && !LIBERADO_ALUNOS) return null
  return { id: user.id, admin }
}
