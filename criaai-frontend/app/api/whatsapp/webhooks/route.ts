import { NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

type Ev = { evento: string; faz: string }

// Lista todos os avisos (webhooks) que a plataforma recebe de fora, com o endereço de cada um, o que cada evento faz
// e, quando dá para medir, o último aviso recebido. Nunca mostra chaves nem senhas (só se estão configuradas). Só admin.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  const admin = adminClient()
  const base = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mcpia.site').replace(/\/+$/, '')
  const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  // Avisos da Hubla/Cakto guardados em hubla_events (provider diz de quem veio)
  const porProv: Record<string, Record<string, { n: number; ultimo: string | null }>> = {}
  const ultimoProv: Record<string, string | null> = {}
  const ev = await admin.from('hubla_events').select('provider, event_type, created_at').gte('created_at', desde).order('created_at', { ascending: false }).limit(10000)
  for (const r of (ev.data || []) as any[]) {
    const p = String(r.provider || 'hubla'), t = String(r.event_type || '')
    if (!porProv[p]) porProv[p] = {}
    if (!porProv[p][t]) porProv[p][t] = { n: 0, ultimo: r.created_at }
    porProv[p][t].n++
    if (!ultimoProv[p]) ultimoProv[p] = r.created_at
  }
  const wa = await admin.from('wa_messages').select('created_at').eq('direction', 'in').order('created_at', { ascending: false }).limit(1)

  const hubla: Ev[] = [
    { evento: 'subscription.activated', faz: 'Assinatura ativada: libera o plano (Starter, Pro ou Premium) e os créditos do aluno.' },
    { evento: 'customer.member_added', faz: 'Aluno entrou no produto: libera o plano, igual à assinatura ativada.' },
    { evento: 'subscription.deactivated', faz: 'Assinatura encerrada: tira o plano do aluno.' },
    { evento: 'customer.member_removed', faz: 'Aluno saiu do produto: tira o plano, igual à assinatura encerrada.' },
    { evento: 'invoice.payment_succeeded', faz: 'Pagamento aprovado: registra a renovação, tira o atraso e manda a notificação de venda para você.' },
    { evento: 'invoice.payment_failed', faz: 'Renovação recusada: bloqueia o plano (em atraso) até o aluno pagar.' },
    { evento: 'invoice.refunded', faz: 'Reembolso concluído: tira o acesso do aluno.' },
    { evento: 'invoice.created', faz: 'Cobrança gerada (Pix ou boleto): dispara o fluxo "Pendente" do WhatsApp.' },
    { evento: 'invoice.expired', faz: 'Cobrança venceu sem pagar: só fica registrada no histórico.' },
    { evento: 'subscription.created / expiring / renewal_enabled / renewal_disabled', faz: 'Avisos informativos: não mudam o acesso.' },
  ]
  const cakto: Ev[] = [
    { evento: 'purchase_approved', faz: 'Compra aprovada: quando é assinatura, libera o plano do aluno.' },
    { evento: 'subscription_created / subscription_renewed', faz: 'Assinatura criada ou renovada: mantém o plano ativo.' },
    { evento: 'subscription_canceled', faz: 'Assinatura cancelada: tira o plano.' },
    { evento: 'subscription_renewal_refused / purchase_refused', faz: 'Pagamento recusado: bloqueia o plano em atraso.' },
    { evento: 'refund / chargeback', faz: 'Reembolso ou estorno: tira o acesso.' },
  ]
  const stripe: Ev[] = [
    { evento: 'checkout.session.completed', faz: 'Compra concluída: libera o plano ou soma os créditos comprados.' },
    { evento: 'customer.subscription.updated', faz: 'Plano alterado: atualiza o plano do aluno.' },
    { evento: 'customer.subscription.deleted', faz: 'Assinatura cancelada: tira o plano.' },
    { evento: 'invoice.payment_succeeded / invoice.payment_failed', faz: 'Pagamento aprovado ou recusado: mantém ou bloqueia o plano.' },
  ]
  const mp: Ev[] = [
    { evento: 'subscription_preapproval', faz: 'Assinatura do Mercado Pago autorizada, pausada ou cancelada: libera ou encerra o plano.' },
    { evento: 'subscription_authorized_payment', faz: 'Pagamento da assinatura: registra aprovado ou recusado.' },
  ]
  const zap: Ev[] = [
    { evento: 'mensagem recebida', faz: 'Mensagem de aluno ou lead: cai no chat de Atendimento e o Júnior responde.' },
    { evento: 'status da mensagem', faz: 'Enviado, entregue, lido ou falhou: atualiza os disparos e os fluxos.' },
  ]

  const tem = function(n: string) { return !!process.env[n] }
  const lista = function(prov: string, evs: Ev[]) { return evs }
  const integracoes = [
    { id: 'hubla', nome: 'Hubla', tipo: 'Vendas e assinaturas', url: base + '/api/hubla/webhook', protegido: tem('HUBLA_WEBHOOK_TOKEN') || tem('HUBLA_URL_KEY'), protecao: 'Token ou chave na URL (configurados na Vercel; não aparecem aqui)', ultimo: ultimoProv['hubla'] || null, total30: Object.values(porProv['hubla'] || {}).reduce(function(a, b) { return a + b.n }, 0), eventos: lista('hubla', hubla), recebidos: porProv['hubla'] || {}, criarLink: 'https://hubla.gitbook.io/docs/webhooks/introducao', criarTexto: 'Na Hubla: Integrações › Criar nova integração › Webhooks.' },
    { id: 'cakto', nome: 'Cakto', tipo: 'Vendas e assinaturas', url: base + '/api/cakto/webhook', protegido: tem('CAKTO_WEBHOOK_SECRET'), protecao: 'Chave secreta da Cakto (configurada na Vercel)', ultimo: ultimoProv['cakto'] || null, total30: Object.values(porProv['cakto'] || {}).reduce(function(a, b) { return a + b.n }, 0), eventos: cakto, recebidos: porProv['cakto'] || {}, criarLink: 'https://app.cakto.com.br', criarTexto: 'No painel da Cakto, procure a opção Webhooks (em Integrações).' },
    { id: 'whatsapp', nome: 'WhatsApp (Meta)', tipo: 'Atendimento', url: base + '/api/whatsapp/webhook', protegido: tem('WHATSAPP_APP_SECRET'), protecao: 'Assinatura da Meta em cada aviso', ultimo: (wa.data && wa.data[0] ? (wa.data[0] as any).created_at : null), total30: null, eventos: zap, recebidos: {}, criarLink: 'https://developers.facebook.com/apps/', criarTexto: 'Na Meta: seu app › WhatsApp › Configuração › Webhook.' },
    { id: 'stripe', nome: 'Stripe', tipo: 'Pagamento com cartão', url: base + '/api/stripe/webhook', protegido: tem('STRIPE_WEBHOOK_SECRET'), protecao: 'Assinatura do Stripe em cada aviso', ultimo: null, total30: null, eventos: stripe, recebidos: {}, criarLink: 'https://dashboard.stripe.com/webhooks', criarTexto: 'No Stripe: Desenvolvedores › Webhooks › Adicionar endpoint.' },
    { id: 'mp', nome: 'Mercado Pago', tipo: 'Assinaturas', url: base + '/api/mp/webhook', protegido: tem('MP_WEBHOOK_SECRET'), protecao: 'Assinatura secreta do Mercado Pago', ultimo: null, total30: null, eventos: mp, recebidos: {}, criarLink: 'https://www.mercadopago.com.br/developers/panel/app', criarTexto: 'No Mercado Pago: Suas integrações › seu app › Webhooks.' },
  ]
  return NextResponse.json({ integracoes, base })
}
