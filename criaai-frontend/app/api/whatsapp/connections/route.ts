import { NextRequest, NextResponse } from 'next/server'
import { graphFetch, requireAdmin, wabaId, waConfig } from '@/lib/whatsapp'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

const LIMITE: Record<string, string> = { TIER_50: '50', TIER_250: '250', TIER_1K: '1.000', TIER_10K: '10.000', TIER_100K: '100.000', TIER_UNLIMITED: 'Ilimitadas' }

// Le um objeto da Meta tentando primeiro todos os campos e, se algum nao for permitido, os mais basicos
async function lerCampos(id: string, listas: string[]): Promise<any> {
  for (const campos of listas) {
    const r = await graphFetch(id + '?fields=' + campos)
    if (r.ok) return r.data
  }
  return null
}

// Lista as conexoes do WhatsApp (numeros) com o estado de cada uma
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  const cfg = waConfig()
  const webhookUrl = req.nextUrl.origin + '/api/whatsapp/webhook'
  if (!cfg.token || !cfg.phoneId) return NextResponse.json({ conexoes: [], webhookUrl, faltam: cfg.missing })

  const waba = await wabaId()
  const [phone, conta, apps] = await Promise.all([
    lerCampos(cfg.phoneId, [
      'verified_name,display_phone_number,quality_rating,status,messaging_limit_tier,name_status,account_mode',
      'verified_name,display_phone_number,quality_rating,status,messaging_limit_tier',
      'verified_name,display_phone_number,quality_rating',
    ]),
    waba ? lerCampos(waba, ['name,business_verification_status,account_review_status', 'name,business_verification_status', 'name']) : Promise.resolve(null),
    waba ? graphFetch(waba + '/subscribed_apps') : Promise.resolve(null),
  ])
  if (!phone) return NextResponse.json({ conexoes: [], webhookUrl, erro: 'Nao consegui falar com a Meta. Confira o token e o Phone Number ID na Vercel.' })

  const appsLigados: string[] = apps && apps.ok ? (apps.data?.data || []).map(function(x: any) { return String(x.whatsapp_business_api_data?.name || x.name || x.id || '') }).filter(Boolean) : []
  const tier = String(phone.messaging_limit_tier || '')
  const verif = String(conta?.business_verification_status || '').toLowerCase()
  const revisao = String(conta?.account_review_status || '').toUpperCase()
  const numStatus = String(phone.status || '').toUpperCase()

  // "Status da conta": tudo certo, em analise ou atencao
  let status: 'ok' | 'analise' | 'atencao' = 'ok'
  if (revisao === 'PENDING') status = 'analise'
  if (revisao === 'REJECTED' || (numStatus && numStatus !== 'CONNECTED')) status = 'atencao'

  return NextResponse.json({
    webhookUrl,
    conexoes: [{
      principal: true,
      phoneId: cfg.phoneId,
      waba: waba || '',
      nome: String(phone.verified_name || ''),
      wabaNome: String(conta?.name || ''),
      numero: String(phone.display_phone_number || ''),
      limite: LIMITE[tier] ? LIMITE[tier] + ' conversas / 24 horas' : '',
      verificacao: verif === 'verified' ? 'verificada' : verif === 'rejected' || verif === 'failed' ? 'rejeitada' : verif ? 'pendente' : '',
      status,
      numStatus,
      qualidade: String(phone.quality_rating || '').toUpperCase(),
      webhookLigado: appsLigados.length > 0,
      apps: appsLigados,
    }],
  })
}
