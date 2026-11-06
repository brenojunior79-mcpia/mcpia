// Menu "Produtos Sazonais" (produtos do momento: Black Friday, Natal, Dia das Maes etc.).
// Por enquanto fica OCULTO PARA TODOS, inclusive o admin (mude SAZONAIS_ADMIN_VE para true se quiser voltar a ver).
// Quando for liberar: mude SAZONAIS_LIBERADO para true. Depois disso o menu so aparece para quem:
//  - tem uma assinatura ativa de um dos planos de SAZONAIS_PLANOS (hoje, so o Pro) e
//  - se cadastrou ha 7 dias ou mais.
export const SAZONAIS_LIBERADO = false
export const SAZONAIS_ADMIN_VE = false
export const SAZONAIS_PLANOS: string[] = ['Pro']
export const SAZONAIS_DIAS_APOS_CADASTRO = 7

export function podeVerSazonais(isAdmin: boolean, createdAt?: string | null, subscriptionStatus?: string | null, planName?: string | null): boolean {
  if (isAdmin) return SAZONAIS_ADMIN_VE
  if (!SAZONAIS_LIBERADO) return false
  const criado = createdAt ? new Date(createdAt).getTime() : 0
  if (!criado || (Date.now() - criado) < SAZONAIS_DIAS_APOS_CADASTRO * 24 * 60 * 60 * 1000) return false
  if (subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing') return false
  return !!planName && SAZONAIS_PLANOS.indexOf(planName) !== -1
}
