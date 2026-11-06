// Gerenciando seus anuncios (menu da plataforma). Liberado para os alunos dos planos Pro e Premium (ver ANUNCIOS_MENU_PARA_ALUNOS).
//  - Admin e as contas abaixo (ex.: conta de teste do revisor do Meta) sempre abrem.
//  - So quem tem o plano PRO ou PREMIUM ativo abre.
//  - Quem tem o plano Starter, ou nao tem plano e ja tem 7 dias ou mais de cadastro, ve o menu, mas ao clicar aparece o aviso (dos planos Pro e Premium).
//  - Aluno sem plano nos primeiros 7 dias NAO ve o menu (nao pode saber que existem planos).
export const ANUNCIOS_LIBERADO_PARA_TODOS = false
// Contas liberadas à mão, mesmo sem plano Pro/Premium (revisor da Meta e contas que o Breno autorizou).
export const ANUNCIOS_EMAILS_LIBERADOS: string[] = ['revisor.meta@mcpia.site', 'doreinoemfoco@gmail.com', 'thaissilvaa409@gmail.com']
export const ANUNCIOS_DIAS_APOS_CADASTRO = 7
// Enquanto o Facebook (Meta) nao liberar o login para todos, o menu fica OCULTO para os alunos (so admin e conta do revisor da Meta).
// Quando o Meta aprovar, mude para true: ai vale a regra de 7 dias + plano descrita acima.
export const ANUNCIOS_MENU_PARA_ALUNOS = true // Liberado de novo em 06/11/2026: a Meta aprovou o public_profile (17:02) e a conta de teste sem funcao no app conectou.

// O MENU aparece para todos os alunos, mas fica sem clique (nada abre) para quem nao tem acesso, ate o Meta liberar. Para voltar a esconder o menu, mude para false.
export const ANUNCIOS_MENU_VISIVEL_PARA_TODOS = true

export type StatusAnuncios = 'liberado' | 'plano' | 'oculto'

// Planos que liberam o Gerenciando seus anuncios
export const ANUNCIOS_PLANOS_LIBERADOS = ['pro', 'premium']

function planoLiberaAnuncios(planName?: string | null): boolean {
  const n = String(planName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  return ANUNCIOS_PLANOS_LIBERADOS.indexOf(n) !== -1
}

export function statusAnuncios(isAdmin: boolean, email?: string | null, createdAt?: string | null, subscriptionStatus?: string | null, planName?: string | null): StatusAnuncios {
  if (ANUNCIOS_LIBERADO_PARA_TODOS || isAdmin) return 'liberado'
  if (email && ANUNCIOS_EMAILS_LIBERADOS.indexOf(email.toLowerCase()) !== -1) return 'liberado'
  if (!ANUNCIOS_MENU_PARA_ALUNOS) return 'oculto'
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') return planoLiberaAnuncios(planName) ? 'liberado' : 'plano'
  const criado = createdAt ? new Date(createdAt).getTime() : 0
  if (criado && (Date.now() - criado) >= ANUNCIOS_DIAS_APOS_CADASTRO * 24 * 60 * 60 * 1000) return 'plano'
  return 'oculto'
}

export function podeUsarAnuncios(isAdmin: boolean, email?: string | null, createdAt?: string | null, subscriptionStatus?: string | null, planName?: string | null): boolean {
  return statusAnuncios(isAdmin, email, createdAt, subscriptionStatus, planName) === 'liberado'
}
