// Tipos e lista de eventos dos fluxos automaticos (sem codigo de servidor: a tela tambem usa)
export type Metodo = '' | 'pix' | 'boleto' | 'cartao'
export type Passo =
  | { tipo: 'esperar'; minutos: number }
  | { tipo: 'modelo'; template: string; language: string; params: { mode: 'nome' | 'produto' | 'link' | 'texto'; value: string }[] }

export type FluxoAuto = {
  id?: string
  name: string
  connection_id: string | null
  trigger_event: string
  trigger_filter: { metodo?: Metodo; produto?: string }
  steps: Passo[]
  cancel_on_purchase: boolean
  enabled: boolean
}

// Eventos da Hubla que podem iniciar um fluxo
export const EVENTOS: { k: string; nome: string; desc: string; filtroMetodo?: boolean }[] = [
  { k: 'lead.abandoned_checkout', nome: 'Carrinho abandonado', desc: 'A pessoa entrou no checkout e não finalizou (a Hubla avisa após ~20 min).' },
  { k: 'invoice.created', nome: 'Cobrança gerada (Pix, boleto ou cartão)', desc: 'A pessoa gerou a cobrança. Você pode filtrar só Pix gerado, só boleto ou só cartão.', filtroMetodo: true },
  { k: 'invoice.payment_failed', nome: 'Pagamento recusado', desc: 'O cartão foi recusado ou o pagamento falhou.', filtroMetodo: true },
  { k: 'invoice.expired', nome: 'Pix/boleto expirado', desc: 'A cobrança venceu sem pagamento.', filtroMetodo: true },
  { k: 'invoice.payment_succeeded', nome: 'Compra aprovada', desc: 'O pagamento foi confirmado.', filtroMetodo: true },
  { k: 'customer.member_added', nome: 'Acesso liberado (novo aluno)', desc: 'A Hubla liberou o acesso ao produto.' },
  { k: 'subscription.expiring', nome: 'Assinatura prestes a vencer', desc: 'A assinatura está perto de expirar.' },
  { k: 'subscription.deactivated', nome: 'Assinatura cancelada/encerrada', desc: 'A assinatura foi desativada.' },
  { k: 'invoice.refunded', nome: 'Reembolso', desc: 'A compra foi reembolsada.' },
]

export function nomeEvento(k: string): string {
  const e = EVENTOS.find(function(x) { return x.k === k })
  return e ? e.nome : k
}

export const VARIAVEIS: { k: 'nome' | 'produto' | 'link' | 'texto'; nome: string }[] = [
  { k: 'nome', nome: 'Primeiro nome da pessoa' },
  { k: 'produto', nome: 'Nome do produto' },
  { k: 'link', nome: 'Link (checkout/pagamento)' },
  { k: 'texto', nome: 'Texto fixo' },
]

