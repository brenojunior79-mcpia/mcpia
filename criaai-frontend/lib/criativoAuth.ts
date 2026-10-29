import { createClient } from '@/lib/supabase-server'

// Gerador de Criativos liberado para os alunos. Cada criativo pronto gasta 1 credito do plano
// (mesmos creditos mostrados em Planos / Conta). Admin nao gasta. Para fechar de novo, volte para false.
export const LIBERADO_ALUNOS = true

export type SaldoCriativo = { logado: boolean; admin: boolean; ilimitado: boolean; temPlano: boolean; limite: number; usados: number; restante: number }

// Le o perfil e calcula o saldo de criativos (credits_videos do plano + creditos extras - usados)
export async function saldoCriativo(): Promise<(SaldoCriativo & { id: string }) | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const p = await supabase.from('profiles').select('is_admin, subscription_status, credits_videos_used, credits_videos_extra, plans(credits_videos, is_unlimited)').eq('id', user.id).maybeSingle()
  const d: any = p.data || {}
  const admin = !!d.is_admin
  const planoAtivo = d.subscription_status === 'active' || d.subscription_status === 'trialing'
  const plano: any = Array.isArray(d.plans) ? d.plans[0] : d.plans
  const base = planoAtivo ? Number(plano?.credits_videos || 0) : 0
  const limite = base + Number(d.credits_videos_extra || 0)
  const usados = Number(d.credits_videos_used || 0)
  const ilimitado = admin || (planoAtivo && !!plano?.is_unlimited)
  return { id: user.id, logado: true, admin, ilimitado, temPlano: planoAtivo, limite, usados, restante: ilimitado ? 999999 : Math.max(0, limite - usados) }
}

export async function usuarioCriativo(): Promise<{ id: string; admin: boolean } | null> {
  const s = await saldoCriativo()
  if (!s) return null
  if (s.admin) return { id: s.id, admin: true }
  if (!LIBERADO_ALUNOS) return null
  if (s.restante <= 0) return null
  return { id: s.id, admin: false }
}

// Mensagem de quando usuarioCriativo() nega o acesso
export async function msgBloqueioCriativo(): Promise<string> {
  const s = await saldoCriativo()
  if (!s) return 'Entre na sua conta para usar o Gerador de Criativos.'
  if (!LIBERADO_ALUNOS && !s.admin) return 'Este recurso esta em atualizacao no momento.'
  if (!s.temPlano && s.limite <= 0) return 'Assine um plano para usar o Gerador de Criativos.'
  return 'Seus creditos de criativo acabaram. Veja em Planos como conseguir mais.'
}
