// Pedido de reembolso: o Junior NAO responde. Quem responde e o Breno (pessoalmente).
// Detecta, sem depender da IA, quando a pessoa fala em reembolso/estorno/devolucao do dinheiro.

function semAcento(t: string): string {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const REEMBOLSO_RE = /reembols|estorn|chargeback|dinheiro\s+de\s+volta|(devol\w*|volta\w*)\s+(d[oa]s?\s+)?(meu\s+|o\s+|a\s+)?(dinheiro|valor|pagamento|compra)|quero\s+(o\s+)?meu\s+dinheiro|cancel\w*\s+(a\s+|as\s+|o\s+|os\s+|minha\s+|minhas\s+|essa\s+|esta\s+)?(compra|cobranca|pagamento)|cancel\w*.{0,60}cartao|cartao.{0,60}cancel/

export function falouEmReembolso(texto: string): boolean {
  return REEMBOLSO_RE.test(semAcento(texto))
}

export const AVISO_REEMBOLSO = '💰 A pessoa falou em reembolso. O assistente não respondeu de propósito: responda você.'
