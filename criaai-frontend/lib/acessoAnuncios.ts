// Gerenciador de Anuncios (menu da plataforma). HOJE ESTA OCULTO PARA OS ALUNOS (ver ANUNCIOS_MENU_PARA_ALUNOS).
//  - Admin e as contas abaixo (ex.: conta de teste do revisor do Meta) sempre abrem.
//  - Quem tem plano ativo (qualquer plano) abre.
//  - Aluno sem plano com 7 dias ou mais de cadastro ve o menu, mas ao clicar aparece o aviso para assinar um plano.
//  - Aluno sem plano nos primeiros 7 dias NAO ve o menu (nao pode saber que existem planos).
export const ANUNCIOS_LIBERADO_PARA_TODOS = false
export const ANUNCIOS_EMAILS_LIBERADOS: string[] = ['revisor.meta@mcpia.site']
export const ANUNCIOS_DIAS_APOS_CADASTRO = 7
// Enquanto o Facebook (Meta) nao liberar o login para todos, o menu fica OCULTO para os alunos (so admin e conta do revisor da Meta).
// Quando o Meta aprovar, mude para true: ai vale a regra de 7 dias + plano descrita acima.
export const ANUNCIOS_MENU_PARA_ALUNOS = false

// O MENU aparece para todos os alunos, mas fica sem clique (nada abre) para quem nao tem acesso, ate o Meta liberar. Para voltar a esconder o menu, mude para false.
export const ANUNCIOS_MENU_VISIVEL_PARA_TODOS = true

export type StatusAnuncios = 'liberado' | 'plano' | 'oculto'

export function statusAnuncios(isAdmin: boolean, email?: string | null, createdAt?: string | null, subscriptionStatus?: string | null): StatusAnuncios {
  if (ANUNCIOS_LIBERADO_PARA_TODOS || isAdmin) return 'liberado'
  if (email && ANUNCIOS_EMAILS_LIBERADOS.indexOf(email.toLowerCase()) !== -1) return 'liberado'
  if (!ANUNCIOS_MENU_PARA_ALUNOS) return 'oculto'
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') return 'liberado'
  const criado = createdAt ? new Date(createdAt).getTime() : 0
  if (criado && (Date.now() - criado) >= ANUNCIOS_DIAS_APOS_CADASTRO * 24 * 60 * 60 * 1000) return 'plano'
  return 'oculto'
}

export function podeUsarAnuncios(isAdmin: boolean, email?: string | null, createdAt?: string | null, subscriptionStatus?: string | null): boolean {
  return statusAnuncios(isAdmin, email, createdAt, subscriptionStatus) === 'liberado'
}
