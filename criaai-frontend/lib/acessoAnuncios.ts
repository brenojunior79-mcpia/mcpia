// Gerenciador de Anuncios: enquanto o Meta nao aprova o login do Facebook para todos,
// so o admin e as contas abaixo (ex.: conta de teste do revisor do Meta) conseguem abrir.
// Quando o Meta aprovar, mude LIBERADO_PARA_TODOS para true.
export const ANUNCIOS_LIBERADO_PARA_TODOS = false
export const ANUNCIOS_EMAILS_LIBERADOS: string[] = ['revisor.meta@mcpia.site']

export function podeUsarAnuncios(isAdmin: boolean, email?: string | null): boolean {
  if (ANUNCIOS_LIBERADO_PARA_TODOS || isAdmin) return true
  return !!email && ANUNCIOS_EMAILS_LIBERADOS.indexOf(email.toLowerCase()) !== -1
}
