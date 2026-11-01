// Gerenciador de Anuncios (menu da plataforma).
//  - Admin e as contas abaixo (ex.: conta de teste do revisor do Meta) sempre abrem.
//  - Quem tem plano ativo (qualquer plano) abre.
//  - Aluno sem plano com 7 dias ou mais de cadastro ve o menu, mas ao clicar aparece o aviso para assinar um plano.
//  - Aluno sem plano nos primeiros 7 dias NAO ve o menu (nao pode saber que existem planos).
export const ANUNCIOS_LIBERADO_PARA_TODOS = false
export const ANUNCIOS_EMAILS_LIBERADOS: string[] = ['revisor.meta@mcpia.site']
export const ANUNCIOS_DIAS_APOS_CADASTRO = 7

export type StatusAnuncios = 'liberado' | 'plano' | 'oculto'

export function statusAnuncios(isAdmin: boolean, email?: string | null, createdAt?: string | null, subscriptionStatus?: string | null): StatusAnuncios {
  if (ANUNCIOS_LIBERADO_PARA_TODOS || isAdmin) return 'liberado'
  if (email && ANUNCIOS_EMAILS_LIBERADOS.indexOf(email.toLowerCase()) !== -1) return 'liberado'
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') return 'liberado'
  const criado = createdAt ? new Date(createdAt).getTime() : 0
  if (criado && (Date.now() - criado) >= ANUNCIOS_DIAS_APOS_CADASTRO * 24 * 60 * 60 * 1000) return 'plano'
  return 'oculto'
}

export function podeUsarAnuncios(isAdmin: boolean, email?: string | null, createdAt?: string | null, subscriptionStatus?: string | null): boolean {
  return statusAnuncios(isAdmin, email, createdAt, subscriptionStatus) === 'liberado'
}
