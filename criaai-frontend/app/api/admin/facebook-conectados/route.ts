import { NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// Alunos que conectaram a conta do Facebook. Somente o admin.
// O token de acesso NUNCA sai daqui: so vai nome, e-mail, conta de anuncios e datas.
export async function GET() {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Somente o admin.' }, { status: 403 })

  const db = adminClient()
  const c = await db
    .from('facebook_connections')
    .select('user_id, fb_user_name, ad_account_id, ad_account_name, ad_accounts, token_expires_at, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1000)
  if (c.error) return NextResponse.json({ error: 'Nao foi possivel carregar as conexoes.' }, { status: 500 })

  const rows: any[] = c.data || []
  const ids = rows.map(function(r) { return r.user_id })
  const perfis: Record<string, any> = {}
  if (ids.length) {
    const p = await db.from('profiles').select('id, full_name, email, subscription_status, plan_id').in('id', ids)
    ;(p.data || []).forEach(function(x: any) { perfis[x.id] = x })
  }

  const agora = Date.now()
  const lista = rows.map(function(r) {
    const p = perfis[r.user_id] || {}
    const exp = r.token_expires_at ? new Date(r.token_expires_at).getTime() : 0
    return {
      user_id: r.user_id,
      nome: p.full_name || r.fb_user_name || '',
      fb_nome: r.fb_user_name || '',
      email: p.email || '',
      plano_ativo: p.subscription_status === 'active' && !!p.plan_id,
      conta_id: r.ad_account_id || '',
      conta_nome: r.ad_account_name || '',
      contas: Array.isArray(r.ad_accounts) ? r.ad_accounts.length : 0,
      expirado: !!exp && exp < agora,
      conectou_em: r.created_at,
      atualizou_em: r.updated_at,
    }
  })

  return NextResponse.json({
    total: lista.length,
    com_conta: lista.filter(function(x) { return !!x.conta_id }).length,
    expirados: lista.filter(function(x) { return x.expirado }).length,
    lista,
  })
}
