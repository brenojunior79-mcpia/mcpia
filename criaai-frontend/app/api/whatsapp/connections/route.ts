import { NextRequest, NextResponse } from 'next/server'
import { adminClient, graphError, graphFetch, requireAdmin, wabaId, waConfig } from '@/lib/whatsapp'

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

  // Outros numeros cadastrados (ex.: Recuperacao)
  const extras: any[] = []
  const lista = await adminClient().from('wa_connections').select('id, name, phone_number_id, waba_id, purpose, active').order('created_at', { ascending: true })
  for (const c of (lista.data || [])) {
    const [ph, ct, ap] = await Promise.all([
      lerCampos(c.phone_number_id, [
        'verified_name,display_phone_number,quality_rating,status,messaging_limit_tier',
        'verified_name,display_phone_number,quality_rating',
      ]),
      lerCampos(c.waba_id, ['name,business_verification_status,account_review_status', 'name']),
      graphFetch(c.waba_id + '/subscribed_apps'),
    ])
    const apps2: string[] = ap && ap.ok ? (ap.data?.data || []).map(function(x: any) { return String(x.whatsapp_business_api_data?.name || x.name || x.id || '') }).filter(Boolean) : []
    const rev = String(ct?.account_review_status || '').toUpperCase()
    const st = String(ph?.status || '').toUpperCase()
    const v2 = String(ct?.business_verification_status || '').toLowerCase()
    extras.push({
      principal: false, id: c.id, phoneId: c.phone_number_id, waba: c.waba_id, apelido: c.name, ativo: c.active,
      nome: String(ph?.verified_name || ''), wabaNome: String(ct?.name || ''), numero: String(ph?.display_phone_number || ''),
      limite: LIMITE[String(ph?.messaging_limit_tier || '')] ? LIMITE[String(ph?.messaging_limit_tier || '')] + ' conversas / 24 horas' : '',
      verificacao: v2 === 'verified' ? 'verificada' : v2 === 'rejected' || v2 === 'failed' ? 'rejeitada' : v2 ? 'pendente' : '',
      status: rev === 'REJECTED' || (st && st !== 'CONNECTED') ? 'atencao' : rev === 'PENDING' ? 'analise' : 'ok',
      numStatus: st, qualidade: String(ph?.quality_rating || '').toUpperCase(),
      webhookLigado: apps2.length > 0, apps: apps2, leituraOk: !!ph,
    })
  }

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
    }].concat(extras),
  })
}

// Cadastra, liga o webhook ou remove outro numero do WhatsApp (ex.: Recuperacao)
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 }) }
  const admin = adminClient()
  const action = String(input?.action || '')

  if (action === 'adicionar') {
    const nome = String(input?.nome || '').trim().slice(0, 60)
    const phoneId = String(input?.phoneId || '').replace(/\D/g, '')
    const waba = String(input?.waba || '').replace(/\D/g, '')
    if (!nome || !phoneId || !waba) return NextResponse.json({ error: 'Preencha o nome, o ID do número e o ID da conta (WABA).' }, { status: 400 })
    if (phoneId === waConfig().phoneId) return NextResponse.json({ error: 'Esse é o número de suporte, que já está conectado.' }, { status: 400 })
    // Confere na Meta se esse numero pertence mesmo a essa conta
    const p = await graphFetch(waba + '/phone_numbers?fields=id,display_phone_number,verified_name&limit=50')
    if (!p.ok) return NextResponse.json({ error: graphError(p.data) }, { status: 400 })
    const achou = (p.data?.data || []).find(function(x: any) { return String(x.id) === phoneId })
    if (!achou) return NextResponse.json({ error: 'Esse número não está nessa conta do WhatsApp. Confira os dois IDs.' }, { status: 400 })
    const ins = await admin.from('wa_connections').insert({ name: nome, phone_number_id: phoneId, waba_id: waba, display_phone: String(achou.display_phone_number || '') }).select('id').single()
    if (ins.error) return NextResponse.json({ error: ins.error.code === '23505' ? 'Esse número já está cadastrado.' : 'Não foi possível salvar.' }, { status: 400 })
    return NextResponse.json({ ok: true, id: ins.data.id })
  }

  const id = String(input?.id || '')
  const c = await admin.from('wa_connections').select('id, waba_id').eq('id', id).maybeSingle()
  if (!c.data) return NextResponse.json({ error: 'Conexão não encontrada.' }, { status: 404 })

  if (action === 'webhook') {
    const r = await graphFetch(c.data.waba_id + '/subscribed_apps', { method: 'POST' })
    if (!r.ok) return NextResponse.json({ error: graphError(r.data) }, { status: 400 })
    return NextResponse.json({ ok: true })
  }
  if (action === 'remover') {
    const emUso = await admin.from('wa_auto_flows').select('id', { count: 'exact', head: true }).eq('connection_id', id).eq('enabled', true)
    if ((emUso.count || 0) > 0) return NextResponse.json({ error: 'Há fluxos ligados usando este número. Desligue-os antes de remover.' }, { status: 400 })
    const d = await admin.from('wa_connections').delete().eq('id', id)
    if (d.error) return NextResponse.json({ error: 'Este número já tem conversas no Chat de recuperação, então não dá para remover. Use "Desativar".' }, { status: 400 })
    return NextResponse.json({ ok: true })
  }
  if (action === 'ativar') {
    await admin.from('wa_connections').update({ active: input?.ativo === true }).eq('id', id)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 })
}
